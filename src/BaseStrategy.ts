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
     * Boot up your strategy.
     */
    abstract onBoot(app: TradeEngine): void;

    /**
     * Received a new websocket message.
     */
    abstract onWebsocketMessage(message: WsMessage): void;

    /**
     * Runs on interval depending on the provided strategy configuration.
     */
    abstract onTimer(): void;

}
