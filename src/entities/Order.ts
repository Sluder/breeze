import { BaseStrategy } from '@app/BaseStrategy';
import { Asset, LiquidityPool, Token, tokenDecimals } from '@indigo-labs/iris-sdk';
import {
    DexTransaction,
    SplitSwapRequest,
    SwapFee,
    SwapRequest,
    SwapInAmountMapping
} from '@indigo-labs/dexter';
import { TradeEngine } from '@app/TradeEngine';
import { TradeEngineConfig } from '@app/types';
import { tokensMatch } from '@app/utils';

export class Order {

    protected _engine: TradeEngine;
    protected _engineConfig: TradeEngineConfig;

    protected _strategy: BaseStrategy | undefined;
    protected _timestamp: number | undefined;
    protected _metadata: string = '';

    constructor(engine: TradeEngine) {
        this._engine = engine;
        this._engineConfig = engine.config;
    }

    public fromStrategy(strategy: BaseStrategy): Order {
        this._strategy = strategy;

        return this;
    }

    public forTimestamp(timestamp: number): Order {
        this._timestamp = timestamp;

        return this;
    }

    public withMetadata(metadata: string): Order {
        this._metadata = metadata;

        return this;
    }

    public async submit(liquidityPool: LiquidityPool, amount: bigint, inToken: Token, slippagePercent: number = 2): Promise<DexTransaction | void> {
        if (! this._strategy) {
            this._engine.logError('Strategy must be set before submitting order');
            return Promise.resolve();
        }
        if (! this._strategy.wallet.isWalletLoaded) {
            this._engine.logError('Wallet not loaded');
            return Promise.resolve();
        }

        const walletBalance: bigint = this._strategy.wallet.balanceFromAsset(inToken === 'lovelace' ? 'lovelace' : inToken.identifier()) ?? 0n;
        const neverSpendLovelace: bigint = BigInt((this._engineConfig.neverSpendAda ?? 0) * 10**6);

        // Check never spend ADA
        if (
            inToken === 'lovelace'
            && this._engineConfig.neverSpendAda
            && amount > walletBalance - neverSpendLovelace
        ) {
            amount -= neverSpendLovelace;
        }

        // Validate amount
        if (amount > walletBalance) {
            this._engine.logError(`Invalid order amount. Amount larger than wallet balance of ${walletBalance}`, this._strategy?.identifier ?? '');
            return Promise.resolve();
        }
        if (amount <= 0n) {
            this._engine.logError("Invalid order amount. 'config.neverSpendAda' could be the cause", this._strategy?.identifier ?? '');
            return Promise.resolve();
        }

        const inAmount: number = inToken === 'lovelace'
            ? Number(amount) / 10**6
            : Number(amount) / 10**tokenDecimals(inToken);
        const inTokenName: string = inToken === 'lovelace'
            ? 'ADA'
            : inToken.readableTicker;
        const outTokenName: string = tokensMatch(inToken, liquidityPool.tokenA)
            ? liquidityPool.tokenB.readableTicker
            : (liquidityPool.tokenA  === 'lovelace' ? '₳' : liquidityPool.tokenA.readableTicker);

        this._engine.logInfo(`Order ${liquidityPool.dex} ${inAmount} ${inTokenName} -> ${outTokenName}`, this._strategy?.identifier ?? '');

        const request: SwapRequest = this._engine.dexter
            .newSwapRequest()
            .forLiquidityPool(liquidityPool)
            .withSlippagePercent(slippagePercent)
            .withSwapInAmount(amount)
            .withMetadata(this._metadata)
            .withSwapInToken(inToken);

        return await this.send(request);
    }

    public async submitSplit(inToken: Token, mappings: SwapInAmountMapping[], slippagePercent: number = 2): Promise<DexTransaction | void> {
        if (! this._strategy) {
            this._engine.logError('Strategy must be set before submitting order');
            return Promise.resolve();
        }
        if (! this._strategy.wallet.isWalletLoaded) {
            this._engine.logError('Wallet not loaded');
            return Promise.resolve();
        }

        const walletBalance: bigint = this._strategy.wallet.balanceFromAsset(inToken === 'lovelace' ? 'lovelace' : inToken.identifier()) ?? 0n;
        const neverSpendLovelace: bigint = BigInt((this._engineConfig.neverSpendAda ?? 0) * 10**6);
        const amount = mappings.reduce((total: bigint, mapping: SwapInAmountMapping) => total + mapping.swapInAmount, 0n);

        // Check never spend ADA
        if (
            inToken === 'lovelace'
            && this._engineConfig.neverSpendAda
            && amount > walletBalance - neverSpendLovelace
        ) {
            this._engine.logError('Total amount over budget');
            return Promise.resolve();
        }

        // Validate amount
        if (amount > walletBalance) {
            this._engine.logError(`Invalid order amount. Amount larger than wallet balance of ${walletBalance}`, this._strategy?.identifier ?? '');
            return Promise.resolve();
        }
        if (amount <= 0n) {
            this._engine.logError("Invalid order amount. 'config.neverSpendAda' could be the cause", this._strategy?.identifier ?? '');
            return Promise.resolve();
        }

        const request: SplitSwapRequest = this._engine.dexter
            .newSplitSwapRequest()
            .withSlippagePercent(slippagePercent)
            .withSwapInToken(inToken)
            .withSwapOutToken(
                tokensMatch(inToken, mappings[0].liquidityPool.tokenA as Token)
                    ? mappings[0].liquidityPool.tokenB
                    : mappings[0].liquidityPool.tokenA
            )
            .withSwapInAmountMappings(mappings)
            .withMetadata(this._metadata);

        return await this.send(request);
    }

    private async send(request: SwapRequest | SplitSwapRequest): Promise<DexTransaction | void> {
        this._engine.logInfo(`\t Building swap order ...`, this._strategy?.identifier ?? '');

        if (request instanceof SwapRequest) {
            const swapOutTokenDecimals: number = request.swapOutToken === 'lovelace' ? 6 : (request.swapOutToken.decimals ?? 0);

            const totalFees: bigint = request.getSwapFees().reduce((totalFees: bigint, fee: SwapFee) => totalFees + fee.value, 0n);
            this._engine.logInfo(`\t Estimated receive: ${Number(request.getEstimatedReceive()) / 10**swapOutTokenDecimals}`, this._strategy?.identifier ?? '');
            this._engine.logInfo(`\t Total Fees: ${Number(totalFees) / 10**6} ₳`, this._strategy?.identifier ?? '');
        }

        if (! this._engineConfig.canSubmitOrders) {
            this._engine.logInfo(`\t Trading disabled. Skipping`, this._strategy?.identifier ?? '');
            return Promise.resolve();
        }

        return request.submit()
            .onSigning(() => {
                this._engine.logInfo(`\t Signing order ...`, this._strategy?.identifier ?? '');
            })
            .onSubmitting(() => {
                this._engine.logInfo(`\t Submitting order ...`, this._strategy?.identifier ?? '');
            })
            .onSubmitted(async (transaction: DexTransaction) => {
                this._engine.logInfo(`\t Order submitted: ${transaction.hash}`, this._strategy?.identifier ?? '');

                await this.finalize(request, transaction.hash);
            })
            .onError((transaction: DexTransaction) => {
                console.error(transaction.error);
                this._engine.logError(`\t Error submitting order: ` + transaction.error?.reasonRaw, this._strategy?.identifier ?? '');
            })
            .onFinally(async (transaction: DexTransaction) => {
                await (this._strategy as BaseStrategy).wallet.loadBalances();

                return Promise.resolve(transaction);
            });
    }

    private async finalize(request: SwapRequest | SplitSwapRequest, transactionHash: string) {
        const totalFees: bigint = request.getSwapFees().reduce((totalFees: bigint, fee: SwapFee) => totalFees + fee.value, 0n);

        const saveAndNotify = async (swapRequest: SwapRequest) => {
            await this._engine.database.orders().insert(
                swapRequest.liquidityPool.identifier,
                this._strategy?.identifier ?? '',
                request.swapInAmount,
                request.getMinimumReceive(),
                request.swapInToken === 'lovelace' ? '' : request.swapInToken.identifier(),
                request.swapOutToken === 'lovelace' ? '' : request.swapOutToken.identifier(),
                request.slippagePercent,
                totalFees,
                Math.floor(this._timestamp ?? (Date.now() / 1000)),
                transactionHash,
            );

            await this._engine?.notifications.notifyForOrder(
                swapRequest.liquidityPool,
                this._strategy?.identifier ?? '',
                request.swapInToken === 'lovelace' ? 'lovelace' : new Asset(request.swapInToken.policyId, request.swapInToken.nameHex, request.swapInToken.decimals),
                request.swapOutToken === 'lovelace' ? 'lovelace' : new Asset(request.swapOutToken.policyId, request.swapOutToken.nameHex, request.swapOutToken.decimals),
                request.swapInAmount,
                request.getEstimatedReceive(),
            );
        };

        if (request instanceof SwapRequest) {
            await saveAndNotify(request);
        } else {
            await Promise.all(
                request.swapRequests.map(async (request: SwapRequest) => {
                    return saveAndNotify(request);
                })
            );
        }

        return this._strategy?.wallet.loadBalances();
    }

}