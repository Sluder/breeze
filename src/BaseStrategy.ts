import { WsMessage } from '@indigo-labs/iris-sdk';
import { StrategyConfig } from '@app/types';
import { TradeEngine } from '@app/TradeEngine';

export abstract class BaseStrategy {

    public abstract name: string;

    public config: StrategyConfig;

    protected constructor(config: StrategyConfig) {
        this.config = config;
    }

    /**
     * Strategy is being booted.
     */
    abstract onBoot(app: TradeEngine): void;

    /**
     * Strategy is being shutdown.
     */
    abstract onShutdown(app: TradeEngine): void;

    /**
     * Receiving a new websocket message.
     */
    abstract onWebsocketMessage(message: WsMessage): void;

    /**
     * Runs on interval set on the engine configuration.
     */
    abstract onTimer(): void;

}
