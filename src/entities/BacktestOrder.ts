import { LiquidityPool, Token } from '@indigo-labs/iris-sdk';
import { DexTransaction, SwapFee, SwapRequest } from '@indigo-labs/dexter';
import { Order } from '@app/entities/Order';
import { Backtest } from '@app/entities/Backtest';
import {
    liquidityPoolToJson,
    slotToUnix,
    toDexterLiquidityPool,
    toDexterToken,
    tokensMatch,
    tokenToJson
} from '@app/utils';

export class BacktestOrder extends Order {

    private _backtest: Backtest;

    private _liquidityPool: LiquidityPool;
    private _amount: bigint;
    private _inToken: Token;
    private _outToken: Token;
    private _slot: number;
    private _slippagePercent: number;

    public fromBacktest(backtest: Backtest): BacktestOrder {
        this._backtest = backtest;

        return this;
    }

    public async submit(liquidityPool: LiquidityPool, amount: bigint, inToken: Token, slot: number, slippagePercent: number = 2): Promise<DexTransaction | void> {
        this._liquidityPool = liquidityPool;
        this._amount = amount;
        this._inToken = inToken;
        this._slot = slot;
        this._slippagePercent = slippagePercent;

        this._outToken = tokensMatch(this._inToken, this._liquidityPool.tokenA)
            ? this._liquidityPool.tokenB
            : this._liquidityPool.tokenA;

        this.updateWalletBalance()

        return Promise.resolve();
    }

    public toJson(): any {
        const swapRequest: SwapRequest = this.toSwapRequest();

        return {
            swapInAmount: Number(this._amount),
            swapInToken: tokenToJson(this._inToken),
            swapOutToken: tokenToJson(this._outToken),
            slippagePercent: this._slippagePercent,
            estimatedReceive: Number(swapRequest.getEstimatedReceive()),
            minReceive: Number(swapRequest.getMinimumReceive()),
            priceImpactPercent: swapRequest.getPriceImpactPercent(),
            dexFeesPaid: Number(swapRequest.getSwapFees().reduce((total: bigint, fee: SwapFee) => {
                return fee.isReturned ? total : total + fee.value;
            }, 0n)),
            liquidityPool: liquidityPoolToJson(this._liquidityPool),
            placedAt: slotToUnix(this._slot),
        };
    }

    private toSwapRequest(): SwapRequest {
        return this._engine.dexter.newSwapRequest()
            .forLiquidityPool(toDexterLiquidityPool(this._liquidityPool))
            .withSlippagePercent(this._slippagePercent)
            .withSwapInToken(toDexterToken(this._inToken))
            .withSwapInAmount(this._amount);
    }

    private updateWalletBalance(): void {
        const swapRequest: SwapRequest = this.toSwapRequest();

        const deductFromBalance: string = this._inToken === 'lovelace'
            ? 'lovelace'
            : this._inToken.identifier();
        const addFromBalance: string = this._outToken === 'lovelace'
            ? 'lovelace'
            : this._outToken.identifier();

        this._walletService.balances.set(
            deductFromBalance,
            (this._walletService.balances.get(deductFromBalance) ?? 0n) - this._amount,
        );

        this._walletService.balances.set(
            addFromBalance,
            swapRequest.getEstimatedReceive() + (this._walletService.balances.get(addFromBalance) ?? 0n),
        );
    }

}