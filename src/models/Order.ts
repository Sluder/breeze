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

export class Order {

    private _engine: TradeEngine;
    private _engineConfig: TradeEngineConfig;
    private _walletService: WalletService;

    private _strategy: BaseStrategy | undefined;

    constructor(engine: TradeEngine, engineConfig: TradeEngineConfig, walletService: WalletService) {
        this._engine = engine;
        this._engineConfig = engineConfig;
        this._walletService = walletService;
    }

    public fromStrategy(strategy: BaseStrategy): void {
        this._strategy = strategy;
    }

    public async swap(liquidityPool: LiquidityPool, amount: bigint, inToken: Token, slippagePercent: number = 2): Promise<DexTransaction> {
        if (! this._strategy) {
            return Promise.reject('Strategy must be set before submitting order');
        }
        if (! this._walletService.isWalletLoaded) {
            return Promise.reject('Wallet not loaded');
        }

        const inAmount: number = inToken === 'lovelace'
            ? Number(amount) / 10**6
            : Number(amount) / 10**tokenDecimals(inToken);
        const inTokenName: string = inToken === 'lovelace'
            ? 'ADA'
            : inToken.readableTicker;
        const outTokenName: string = tokensMatch(inToken, liquidityPool.tokenA)
            ? liquidityPool.tokenB.readableTicker
            : (liquidityPool.tokenA  === 'lovelace' ? 'ADA' : liquidityPool.tokenA.readableTicker);

        this._engine.logInfo(`[${this._engineConfig.appName}] ${liquidityPool.dex} ${inAmount} ${inTokenName} -> ${outTokenName}`);

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

        return await this.submit(request);
    }

    private async submit(request: SwapRequest | SplitSwapRequest): Promise<DexTransaction> {
        this._engine.logInfo(`[${this._engineConfig.appName}] \t\t Building swap order ...`);

        const totalFees: bigint = request.getSwapFees().reduce((totalFees: bigint, fee: SwapFee) => totalFees + fee.value, 0n);
        this._engine.logInfo(`[${this._engineConfig.appName}] \t\t Estimated receive : ${request.getEstimatedReceive()}`);
        this._engine.logInfo(`[${this._engineConfig.appName}] \t\t Total Fees : ${Number(totalFees) / 10**6} ADA`);

        return request.submit()
            .onSigning(() => {
                this._engine.logInfo(`[${this._engineConfig.appName}] \t\t Signing order ...`);
            })
            .onSubmitting(() => {
                this._engine.logInfo(`[${this._engineConfig.appName}] \t\t Submitting order ...`);
            })
            .onSubmitted((transaction: DexTransaction) => {
                this._engine.logInfo(`[${this._engineConfig.appName}] \t\t Order submitted : ${transaction.hash}`);
            })
            .onError((transaction: DexTransaction) => {
                this._engine.logInfo(`[${this._engineConfig.appName}] \t\t Error submitting order : ` + transaction.error?.reasonRaw);
            })
            .onFinally((transaction: DexTransaction) => {
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
            '', //todo address
        );
    }

}