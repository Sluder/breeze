import { WsResponse } from '@indigo-labs/iris-sdk';
import { StrategyConfig } from '@app/types';
import { TradeEngine } from '@app/TradeEngine';

export abstract class BaseStrategy {

    public abstract identifier: string;

    public config: StrategyConfig | undefined;
    public app: TradeEngine;

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
