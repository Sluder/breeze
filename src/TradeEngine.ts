import { IrisApiService, IrisWebsocketService } from '@indigo-labs/iris-sdk';
import { BaseStrategy } from '@app/BaseStrategy';
import { Logger } from 'winston';
import { logger } from '@app/logger';
import { IndicatorService } from '@app/services/IndicatorService';
import { BlockfrostProvider, Dexter, KupoProvider } from '@indigo-labs/dexter';
import { TradeEngineConfig } from '@app/types';
import { WalletService } from '@app/services/WalletService';
import { OrderService } from '@app/services/OrderService';

export class TradeEngine {

    private readonly _irisHost: string;
    private readonly _strategies: BaseStrategy[];
    private readonly _config: TradeEngineConfig;

    private readonly _irisApi: IrisApiService;
    private readonly _irisWebsocket: IrisWebsocketService;
    private readonly _indicators: IndicatorService;
    private readonly _walletService: WalletService;
    private readonly _orderService: OrderService;
    private readonly _dexter: Dexter;

    constructor(irisHost: string, strategies: BaseStrategy[], config: TradeEngineConfig) {
        this._irisHost = irisHost;
        this._strategies = strategies;
        this._config = config;

        // Defaults
        this._config.appName = this._config.appName ?? 'Breeze';
        this._config.neverSpendAda = this._config.neverSpendAda ?? 10;

        // Services
        this._irisApi = new IrisApiService(this._irisHost);
        this._irisWebsocket = new IrisWebsocketService(this._irisHost);
        this._indicators = new IndicatorService();
        this._walletService = new WalletService();
        this._orderService = new OrderService(this, this._config);
        this._dexter = new Dexter({
            metadataMsgBranding: this._config.appName,
            shouldSubmitOrders: config.shouldSubmitOrders,
        });
    }

    public get api(): IrisApiService {
        return this._irisApi;
    }

    public get websocket(): IrisWebsocketService {
        return this._irisWebsocket;
    }

    public get indicators(): IndicatorService {
        return this._indicators;
    }

    public get wallet(): WalletService {
        return this._walletService;
    }

    public get ordering(): OrderService {
        return this._orderService;
    }

    public logInfo(message: string, ...meta: any[]): Logger {
        return logger.info(message, meta);
    }

    public logError(message: string, ...meta: any[]): Logger {
        return logger.error(message, meta);
    }

    private boot(): Promise<void> {
        this._strategies.forEach((strategy: BaseStrategy) => {
            this._irisWebsocket.addListener(strategy.onWebsocketMessage);

            strategy.onBoot(this);

            if (strategy.config.runEveryMilliseconds > 0) {
                setInterval(() => {
                    this.logInfo(`[${this._config.appName}] Strategy '${strategy.name}' Started`);

                    strategy.onTimer();

                    this.logInfo(`[${this._config.appName}] Strategy '${strategy.name}' Completed`);
                }, strategy.config.runEveryMilliseconds);
            }
        });

        this._irisWebsocket.connect();

        if ('kupoUrl' in this._config.submissionProviderConfig) {
            this._dexter.withDataProvider(
                new KupoProvider({
                    url: this._config.submissionProviderConfig.kupoUrl,
                })
            );
        } else if ('projectId' in this._config.submissionProviderConfig) {
            this._dexter.withDataProvider(
                new BlockfrostProvider({
                    url: this._config.submissionProviderConfig.url,
                    projectId: this._config.submissionProviderConfig.projectId,
                })
            );
        } else {
            return Promise.reject("Unknown 'submissionProviderConfig' provided");
        }

        return this._walletService.boot(
            this._dexter,
            this._config.seedPhrase,
            this._config.submissionProviderConfig,
        ).then(() => {
            this.logInfo(`[${this._config.appName}] Loaded wallet '${this._walletService.address}'`);
            this.logInfo(`[${this._config.appName}] TradeEngine booted`);
        });
    }

}
