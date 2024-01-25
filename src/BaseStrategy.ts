import { WsMessage } from '@indigo-labs/iris-sdk';
import { StrategyConfig } from '@app/types';
import { TradeEngine } from '@app/TradeEngine';

export abstract class BaseStrategy {

    public abstract identifier: string;

    public config: StrategyConfig | undefined;

    constructor(config?: StrategyConfig) {
        this.config = config;
    }

    /**
     * Strategy is being booted.
     */
    abstract onBoot(app: TradeEngine): Promise<any>;

    /**
     * Strategy is being shutdown.
     */
    abstract onShutdown(app: TradeEngine): Promise<any>;

    /**
     * Receiving a new websocket message.
     */
    abstract onWebsocketMessage(message: WsMessage): Promise<any>;

    /**
     * Runs on interval set on the engine configuration.
     */
    abstract onTimer(): Promise<any>;

}
