import { LiquidityPool, Token } from '@indigo-labs/iris-sdk';
import { DexTransaction } from '@indigo-labs/dexter';
import { Order } from '@app/entities/Order';
import { Backtest } from '@app/entities/Backtest';

export class BacktestOrder extends Order {

    private _backtest: Backtest;

    private _liquidityPool: LiquidityPool;
    private _amount: bigint;
    private _inToken: Token;
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

        this._backtest.orders.push(this);

        return;
    }

    public toJson(): any {
        // todo need swap order
    }

}