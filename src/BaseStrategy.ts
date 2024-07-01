import { WsResponse } from '@indigo-labs/iris-sdk';
import { StrategyConfig } from '@app/types';
import { TradeEngine } from '@app/TradeEngine';
import { Backtest } from '@app/entities/Backtest';

export abstract class BaseStrategy {

    public abstract identifier: string;

    public config: StrategyConfig | undefined;
    public app: TradeEngine;
    public isBacktesting: boolean = true;

    constructor(config?: StrategyConfig) {
        this.config = config;
    }

    /**
     * Strategy is being booted.
     */
    public onBoot(app: TradeEngine): Promise<any> {
        this.app = app;

        return Promise.resolve();
    }

    /**
     * Strategy is being backtested.
     */
    public beforeBacktest?(app: TradeEngine, backtest: Backtest): Promise<any>;

    /**
     * Iris data is being pulled within this gap.
     */
    public beforeDataPull?(fromTimestamp: number, toTimestamp: number): Promise<any>;

    /**
     * Strategy is being shutdown.
     */
    public onShutdown?(app: TradeEngine): Promise<any>;

    /**
     * Receiving a new websocket message.
     */
    public onWebsocketMessage?(message: WsResponse): Promise<any>;

    /**
     * Runs on interval set on the engine configuration.
     */
    public onTimer?(): Promise<any>;

}
