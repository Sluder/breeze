import { IrisApiService, IrisWebsocketService } from '@indigo-labs/iris-sdk';
import { BaseStrategy } from '@app/BaseStrategy';
import { createLogger, format, Logger, transports } from 'winston';
import { IndicatorService } from '@app/services/IndicatorService';
import { BlockfrostProvider, Dexter, KupoProvider } from '@indigo-labs/dexter';
import { TradeEngineConfig } from '@app/types';
import { WalletService } from '@app/services/WalletService';
import { BaseCacheStorage } from '@app/storage/BaseCacheStorage';
import { NodeCacheStorage } from '@app/storage/NodeCacheStorage';
import { Order } from '@app/entities/Order';
import { ConnectorService } from '@app/services/ConnectorService';
import { DatabaseService } from '@app/services/DatabaseService';

export class TradeEngine {

    private readonly _config: TradeEngineConfig;
    private readonly _strategies: BaseStrategy[];

    private readonly _irisApi: IrisApiService;
    private readonly _irisWebsocket: IrisWebsocketService;
    private readonly _indicators: IndicatorService;
    private readonly _dexter: Dexter;
    private readonly _logger: Logger;
    private readonly _cache: BaseCacheStorage;
    private _walletService: WalletService;
    private _backtestService: ConnectorService;
    private _databaseService: DatabaseService;
    private _isBacktesting: boolean;
    private _balanceUpdateTimer: NodeJS.Timeout;

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
        this._databaseService = new DatabaseService(config.database);
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
        this._isBacktesting = false;
    }

    public get config(): TradeEngineConfig {
        return this._config;
    }

    public get api(): IrisApiService {
        return this._irisApi;
    }

    public get websocket(): IrisWebsocketService {
        return this._irisWebsocket;
    }

    public get database(): DatabaseService {
        return this._databaseService;
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

    public get strategies(): BaseStrategy[] {
        return this._strategies;
    }

    public isBacktesting(isBacktesting: boolean): void {
        this._isBacktesting = isBacktesting;
    }

    public switchWallet(wallet: WalletService): void {
        this._walletService = wallet;
    }

    public logInfo(message: string, title?: string): Logger {
        title = title ?? this._config.appName;

        return this._logger.info(`[${title}] ${message}`);
    }

    public logError(message: string, title?: string): Logger {
        title = title ?? this._config.appName;

        return this._logger.error(`[${title}] ${message}`);
    }

    public async boot(): Promise<void> {
        for (const strategy of this._strategies) {
            if (strategy.onWebsocketMessage) {
                this._irisWebsocket.addListener(strategy.onWebsocketMessage.bind(strategy));
            }

            if (strategy.onBoot) {
                await strategy.onBoot(this);
            }

            // Run timers if strategy requests it
            if (strategy.config && strategy.config.runEveryMilliseconds > 0) {
                const timer: NodeJS.Timeout = setInterval(async () => {
                    this.logInfo(`Strategy '${strategy.identifier}' started`);

                    if (strategy.onTimer) {
                        await strategy.onTimer();
                    }

                    this.logInfo(`Strategy '${strategy.identifier}' completed`);
                }, strategy.config.runEveryMilliseconds);

                this._strategyTimers.push(timer);
            }

            this.logInfo(`Strategy '${strategy.identifier}' booted`);
        }

        this.logInfo(`Booted ${this._strategies.length} strategies`);

        await this._databaseService.boot();
        this.logInfo(`Booted database connection`);

        this._irisWebsocket.connect();
        this.logInfo(`Booted websocket connection`);

        await this._cache.boot();
        this.logInfo(`Booted cache`);

        if (this.config.canSubmitOrders) {
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
        }

        return Promise.all([
            this._walletService.boot(this, this._config.seedPhrase, this._config.submissionProviderConfig),
            this.loadBacktesting(),
        ]).then(() => {
            this.logInfo(`Loaded wallet '${this._walletService.address}'`);
            this.logInfo(`TradeEngine booted`);

            this._config.seedPhrase = [];

            if (this.config.canSubmitOrders && this._walletService.isWalletLoaded) {
                this._balanceUpdateTimer = setInterval(() => {
                    this._walletService.loadBalances();
                }, 2_000);
            }
        });
    }

    public async shutdown(): Promise<void> {
        clearInterval(this._balanceUpdateTimer);

        this._strategyTimers.forEach((timer: NodeJS.Timeout) => clearInterval(timer));
        await Promise.all(
            this._strategies.map(async (strategy: BaseStrategy) => {
                if (strategy.onShutdown) {
                    return strategy.onShutdown(this);
                }

                return Promise.resolve();
            })
        );

        await this._databaseService.connection.close();

        this.logInfo('TradeEngine shutdown');
    }

    public order(): Order {
        if (this._isBacktesting) {
            throw new Error('Cant submit order, engine is currently backtesting');
        }

        return new Order(this, this._walletService);
    }

    private checkConfig(config: TradeEngineConfig): void {
        // Defaults
        this._config.appName = config.appName ?? 'Breeze';
        this._config.neverSpendAda = config.neverSpendAda ?? 10;

        if (! config.irisWebsocketHost.startsWith('ws')) {
            throw new Error(`Invalid 'irisWebsocketHost', must start with 'ws' or 'wss'`);
        }
        if (! config.database?.file) {
            throw new Error(`Database path must be set in config`);
        }
    }

    private async loadBacktesting(): Promise<any> {
        if (! this._config.backtest || ! this._config.backtest.enabled) return;

        this._backtestService = new ConnectorService(this._config.backtest.port, this);

        return this._backtestService.boot()
            .then(() => this.logInfo('Backtesting connector booted'));
    }

}
