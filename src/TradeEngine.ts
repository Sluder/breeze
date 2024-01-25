import { IrisApiService, IrisWebsocketService } from '@indigo-labs/iris-sdk';
import { BaseStrategy } from '@app/BaseStrategy';
import { createLogger, format, Logger, transports } from 'winston';
import { IndicatorService } from '@app/services/IndicatorService';
import { BlockfrostProvider, Dexter, KupoProvider } from '@indigo-labs/dexter';
import { TradeEngineConfig } from '@app/types';
import { WalletService } from '@app/services/WalletService';
import { OrderService } from '@app/services/OrderService';

export class TradeEngine {

    private readonly _strategies: BaseStrategy[];
    private _config: TradeEngineConfig;

    private readonly _irisApi: IrisApiService;
    private readonly _irisWebsocket: IrisWebsocketService;
    private readonly _indicators: IndicatorService;
    private readonly _walletService: WalletService;
    private readonly _orderService: OrderService;
    private readonly _dexter: Dexter;
    private readonly _logger: Logger;

    private _strategyTimers: NodeJS.Timeout[] = [];

    constructor(strategies: BaseStrategy[], config: TradeEngineConfig) {
        this._strategies = strategies;

        this.loadConfig(config);

        // Services
        this._irisApi = new IrisApiService(this._config.irisApiHost);
        this._irisWebsocket = new IrisWebsocketService(this._config.irisWebsocketHost);
        this._indicators = new IndicatorService();
        this._walletService = new WalletService();
        this._orderService = new OrderService(this, this._config);
        this._dexter = new Dexter({
            metadataMsgBranding: this._config.appName,
            shouldSubmitOrders: config.canSubmitOrders,
        });
        this._logger = createLogger({
            transports: [
                new transports.Console(),
                new transports.File({ dirname: config.logDirectory, filename: 'error.log', level: 'error' }),
                new transports.File({ dirname: config.logDirectory, filename: 'info.log', level: 'info' }),
            ],
            format: format.combine(
                format.colorize(),
                format.timestamp({ format: 'MM-DD HH:mm:ss' }),
                format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`),
            ),
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
        return this._logger.info(message, meta);
    }

    public logError(message: string, ...meta: any[]): Logger {
        return this._logger.error(message, meta);
    }

    public boot(): Promise<void> {
        this._strategies.forEach(async (strategy: BaseStrategy) => {
            this._irisWebsocket.addListener(strategy.onWebsocketMessage);

            await strategy.onBoot(this);

            this.logInfo(`[${this._config.appName}] Strategy '${strategy.identifier}' booted`);

            // Run timers if strategy requests it
            if (strategy.config && strategy.config.runEveryMilliseconds > 0) {
                const timer: NodeJS.Timeout = setInterval(async () => {
                    this.logInfo(`[${this._config.appName}] Strategy '${strategy.identifier}' started`);

                    await strategy.onTimer();

                    this.logInfo(`[${this._config.appName}] Strategy '${strategy.identifier}' completed`);
                }, strategy.config.runEveryMilliseconds);

                this._strategyTimers.push(timer);
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
            this.logInfo(
                this._config.canSubmitOrders
                    ? `[${this._config.appName}] Loaded wallet '${this._walletService.address}'`
                    : `[${this._config.appName}] Ordering disabled, skipping loading wallet`
            );

            this.logInfo(`[${this._config.appName}] TradeEngine booted`);

            this._config.seedPhrase = [];
        });
    }

    public shutdown(): void {
        this._strategyTimers.forEach((timer: NodeJS.Timeout) => clearInterval(timer));
        this._strategies.forEach(async (strategy: BaseStrategy) => await strategy.onShutdown(this));

        this.logInfo(`[${this._config.appName}] TradeEngine shutdown`);
    }

    private loadConfig(config: TradeEngineConfig): void {
        this._config = config;

        // Defaults
        this._config.appName = this._config.appName ?? 'Breeze';
        this._config.neverSpendAda = this._config.neverSpendAda ?? 10;

        if (! this._config.irisWebsocketHost.startsWith('ws')) {
            throw new Error(`Invalid 'irisWebsocketHost', must start with 'ws' or 'wss'`);
        }
    }

}
