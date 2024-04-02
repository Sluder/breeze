import { IrisApiService, IrisWebsocketService } from '@indigo-labs/iris-sdk';
import { BaseStrategy } from '@app/BaseStrategy';
import { createLogger, format, Logger, transports } from 'winston';
import { IndicatorService } from '@app/services/IndicatorService';
import { BlockfrostProvider, Dexter, KupoProvider } from '@indigo-labs/dexter';
import { TradeEngineConfig } from '@app/types';
import { WalletService } from '@app/services/WalletService';
import { BaseCacheStorage } from '@app/storage/BaseCacheStorage';
import { NodeCacheStorage } from '@app/storage/NodeCacheStorage';
import { Order } from '@app/models/Order';

export class TradeEngine {

    private readonly _config: TradeEngineConfig;
    private readonly _strategies: BaseStrategy[];

    private readonly _irisApi: IrisApiService;
    private readonly _irisWebsocket: IrisWebsocketService;
    private readonly _indicators: IndicatorService;
    private readonly _walletService: WalletService;
    private readonly _dexter: Dexter;
    private readonly _logger: Logger;
    private readonly _cache: BaseCacheStorage;

    private _strategyTimers: NodeJS.Timeout[] = [];

    constructor(strategies: BaseStrategy[], config: TradeEngineConfig) {
        this._strategies = strategies;
        this._config = config;

        this.checkConfig(config);

        // Services
        this._irisApi = new IrisApiService(this._config.irisApiHost);
        this._irisWebsocket = new IrisWebsocketService(this._config.irisWebsocketHost);
        this._indicators = new IndicatorService();
        this._walletService = new WalletService();
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
        this._cache = config.cacheStorage ?? new NodeCacheStorage();
    }

    public get api(): IrisApiService {
        return this._irisApi;
    }

    public get websocket(): IrisWebsocketService {
        return this._irisWebsocket;
    }

    public get dexter(): Dexter {
        return this._dexter;
    }

    public get indicators(): IndicatorService {
        return this._indicators;
    }

    public get wallet(): WalletService {
        return this._walletService;
    }

    public get cache(): BaseCacheStorage {
        return this._cache;
    }

    public logInfo(message: string, ...meta: any[]): Logger {
        return this._logger.info(message, meta);
    }

    public logError(message: string, ...meta: any[]): Logger {
        return this._logger.error(message, meta);
    }

    public async boot(): Promise<void> {
        for (const strategy of this._strategies) {
            if (strategy.onWebsocketMessage) {
                this._irisWebsocket.addListener(strategy.onWebsocketMessage);
            }

            if (strategy.onBoot) {
                await strategy.onBoot(this);
            }

            // Run timers if strategy requests it
            if (strategy.config && strategy.config.runEveryMilliseconds > 0) {
                const timer: NodeJS.Timeout = setInterval(async () => {
                    this.logInfo(`[${this._config.appName}] Strategy '${strategy.identifier}' started`);

                    if (strategy.onTimer) {
                        await strategy.onTimer();
                    }

                    this.logInfo(`[${this._config.appName}] Strategy '${strategy.identifier}' completed`);
                }, strategy.config.runEveryMilliseconds);

                this._strategyTimers.push(timer);
            }

            this.logInfo(`[${this._config.appName}] Strategy '${strategy.identifier}' booted`);
        }

        this.logInfo(`[${this._config.appName}] Booted ${this._strategies.length} strategies`);

        this._irisWebsocket.connect();
        await this._cache.boot();

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
        this._strategies.forEach(async (strategy: BaseStrategy) => {
            if (strategy.onShutdown) {
                await strategy.onShutdown(this);
            }
        });

        this.logInfo(`[${this._config.appName}] TradeEngine shutdown`);
    }

    public order(): Order {
        return new Order(this, this._config, this._walletService);
    }

    private checkConfig(config: TradeEngineConfig): void {
        // Defaults
        this._config.appName = this._config.appName ?? 'Breeze';
        this._config.neverSpendAda = this._config.neverSpendAda ?? 10;

        if (! this._config.irisWebsocketHost.startsWith('ws')) {
            throw new Error(`Invalid 'irisWebsocketHost', must start with 'ws' or 'wss'`);
        }
    }

}
