import { BaseStrategy } from '@app/BaseStrategy';
import { LiquidityPool, Token, tokenDecimals } from '@indigo-labs/iris-sdk';
import {
    Asset as DexterAsset,
    DexTransaction,
    LiquidityPool as DexterPool,
    SplitSwapRequest,
    SwapFee,
    SwapRequest
} from '@indigo-labs/dexter';
import { TradeEngine } from '@app/TradeEngine';
import { TradeEngineConfig } from '@app/types';
import { WalletService } from '@app/services/WalletService';
import { tokensMatch } from '@app/utils';
import { Trade } from '@app/entities/Trade';

export class Order {

    private _engine: TradeEngine;
    private _engineConfig: TradeEngineConfig;
    private _walletService: WalletService;

    private _strategy: BaseStrategy | undefined;
    private _trade: Trade | undefined;

    constructor(engine: TradeEngine, walletService: WalletService) {
        this._engine = engine;
        this._engineConfig = engine.config;
        this._walletService = walletService;
    }

    public fromStrategy(strategy: BaseStrategy): Order {
        this._strategy = strategy;

        return this;
    }

    public forTrade(trade: Trade): Order {
        this._trade = trade;

        return this;
    }

    public async submit(liquidityPool: LiquidityPool, amount: bigint, inToken: Token, slippagePercent: number = 2): Promise<DexTransaction | void> {
        if (! this._strategy) {
            this._engine.logError('Strategy must be set before submitting order');
            return Promise.resolve();
        }
        if (! this._walletService.isWalletLoaded) {
            this._engine.logError('Wallet not loaded');
            return Promise.resolve();
        }

        const walletBalance: bigint = this._engine.wallet.balanceFromAsset(inToken === 'lovelace' ? 'lovelace' : inToken.identifier()) ?? 0n;
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
            .forLiquidityPool(this.irisToDexterPool(liquidityPool))
            .withSlippagePercent(slippagePercent)
            .withSwapInAmount(amount)
            .withSwapInToken(
                inToken === 'lovelace'
                    ? 'lovelace'
                    : new DexterAsset(inToken.policyId, inToken.nameHex, inToken.decimals ?? 0)
            );

        return await this.send(request);
    }

    private async send(request: SwapRequest | SplitSwapRequest): Promise<DexTransaction | void> {
        this._engine.logInfo(`\t Building swap order ...`, this._strategy?.identifier ?? '');

        const swapOutTokenDecimals: number = request.swapOutToken === 'lovelace' ? 6 : request.swapOutToken.decimals;

        const totalFees: bigint = request.getSwapFees().reduce((totalFees: bigint, fee: SwapFee) => totalFees + fee.value, 0n);
        this._engine.logInfo(`\t Estimated receive: ${Number(request.getEstimatedReceive()) / 10**swapOutTokenDecimals}`, this._strategy?.identifier ?? '');
        this._engine.logInfo(`\t Total Fees: ${Number(totalFees) / 10**6} ₳`, this._strategy?.identifier ?? '');

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
            .onSubmitted((transaction: DexTransaction) => {
                this._engine.logInfo(`\t Order submitted: ${transaction.hash}`, this._strategy?.identifier ?? '');
            })
            .onError((transaction: DexTransaction) => {
                this._engine.logError(`\t Error submitting order: ` + transaction.error?.reasonRaw, this._strategy?.identifier ?? '');
            })
            .onFinally(async (transaction: DexTransaction) => {
                await this._engine.wallet.loadBalances();

                return Promise.resolve(transaction);
            });
    }

    private irisToDexterPool(liquidityPool: LiquidityPool): DexterPool {
        return new DexterPool(
            liquidityPool.dex,
            liquidityPool.tokenA === 'lovelace'
                ? 'lovelace'
                : new DexterAsset(liquidityPool.tokenA.policyId, liquidityPool.tokenA.nameHex, liquidityPool.tokenA.decimals ?? 0),
            new DexterAsset(liquidityPool.tokenB.policyId, liquidityPool.tokenB.nameHex, liquidityPool.tokenB.decimals ?? 0),
            liquidityPool.state?.reserveA ?? 0n,
            liquidityPool.state?.reserveB ?? 0n,
            liquidityPool.address,
            liquidityPool.orderAddress,
        );
    }

}