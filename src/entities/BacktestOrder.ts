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
    private _slippagePercent: number;

    public fromBacktest(backtest: Backtest): BacktestOrder {
        this._backtest = backtest;

        return this;
    }

    public async submit(liquidityPool: LiquidityPool, amount: bigint, inToken: Token, slippagePercent: number = 2): Promise<DexTransaction | void> {
        this._liquidityPool = liquidityPool;
        this._amount = amount;
        this._inToken = inToken;
        this._slippagePercent = slippagePercent;

        this._outToken = tokensMatch(this._inToken, this._liquidityPool.tokenA)
            ? this._liquidityPool.tokenB
            : this._liquidityPool.tokenA;

        this.updateWalletBalance()
        await this.saveToDatabase()

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
            placedAt: this._timestamp,
        };
    }

    private toSwapRequest(): SwapRequest {
        return this._engine.dexter.newSwapRequest()
            .forLiquidityPool(toDexterLiquidityPool(this._liquidityPool))
            .withSlippagePercent(this._slippagePercent)
            .withSwapInToken(toDexterToken(this._inToken))
            .withSwapInAmount(BigInt(this._amount));
    }

    private updateWalletBalance(): void {
        if (! this._strategy) {
            this._engine.logError('Strategy must be set before submitting order');
            return;
        }
        if (! this._strategy.wallet.isWalletLoaded) {
            this._engine.logError('Wallet not loaded');
            return;
        }

        const swapRequest: SwapRequest = this.toSwapRequest();

        const deductFromBalance: string = this._inToken === 'lovelace'
            ? 'lovelace'
            : this._inToken.identifier();
        const addFromBalance: string = this._outToken === 'lovelace'
            ? 'lovelace'
            : this._outToken.identifier();

        this._strategy.wallet.balances.set(
            deductFromBalance,
            (this._strategy.wallet.balances.get(deductFromBalance) ?? 0n) - this._amount,
        );

        this._strategy.wallet.balances.set(
            addFromBalance,
            swapRequest.getEstimatedReceive() + (this._strategy.wallet.balances.get(addFromBalance) ?? 0n),
        );
    }

    private saveToDatabase(): Promise<number | undefined> {
        const swapRequest: SwapRequest = this.toSwapRequest();
        const totalFees: bigint = swapRequest.getSwapFees().reduce((totalFees: bigint, fee: SwapFee) => totalFees + fee.value, 0n);

        if (! this._backtest.id) {
            throw new Error('Backtest ID not set');
        }

        return this._engine.database.orders().insert(
            this._liquidityPool.identifier,
            this._strategy?.identifier ?? '',
            swapRequest.swapInAmount,
            swapRequest.getEstimatedReceive(),
            swapRequest.swapInToken === 'lovelace' ? '' : swapRequest.swapInToken.identifier(),
            swapRequest.swapOutToken === 'lovelace' ? '' : swapRequest.swapOutToken.identifier(),
            swapRequest.slippagePercent,
            totalFees,
            this._timestamp ?? 0,
            '',
            this._backtest.id,
        );
    }

}