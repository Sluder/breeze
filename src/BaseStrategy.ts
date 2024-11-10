import { WsResponse } from '@indigo-labs/iris-sdk';
import { StrategyConfig } from '@app/types';
import { TradeEngine } from '@app/TradeEngine';
import { Backtest } from '@app/entities/Backtest';
import { WalletService } from '@app/services/WalletService';

export abstract class BaseStrategy {

    public abstract identifier: string;

    public config: StrategyConfig | undefined;
    public app: TradeEngine;
    public isBacktesting: boolean = false;
    public wallet: WalletService;

    constructor(config?: StrategyConfig) {
        this.config = config;

        this.wallet = new WalletService();
    }

    /**
     * Strategy is being booted.
     */
    public onBoot(app: TradeEngine): Promise<any> {
        this.app = app;

        return this.wallet.boot(
            this.app,
            this.app.config.seedPhrase,
            this.app.config.submissionProviderConfig,
            this.config?.walletAccountIndex,
        );
    }

    public switchWallet(wallet: WalletService) {
        this.wallet = wallet;
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
