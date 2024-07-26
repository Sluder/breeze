import { unixToSlot } from '@app/utils';
import { BacktestableEntity, BacktestRunConfig, TimestampWindows } from '@app/types';
import { TradeEngine } from '@app/TradeEngine';
import { BaseStrategy } from '@app/BaseStrategy';
import { WalletService } from '@app/services/WalletService';
import { BacktestOrder } from '@app/entities/BacktestOrder';
import { Asset } from '@indigo-labs/iris-sdk';

const TIMESTAMP_GAP_SECONDS: number = 60 * 60 * 24;

export class Backtest {

    private _savedId: number;
    private readonly _fromTimestamp: number;
    private readonly _toTimestamp: number;
    private readonly _fromSlot: number;
    private readonly _toSlot: number;
    private readonly _strategyName: string;
    private readonly _engine: TradeEngine;
    private readonly _filterAssets: Asset[] = [];

    private readonly _mockWallet: WalletService;
    private _currentSlot: number;
    private _entities: BacktestableEntity[];
    private _failError: string;
    private _orders: BacktestOrder[];

    constructor(config: BacktestRunConfig) {
        this._fromTimestamp = config.fromTimestamp;
        this._toTimestamp = config.toTimestamp;
        this._fromSlot = unixToSlot(config.fromTimestamp);
        this._toSlot = unixToSlot(config.toTimestamp);
        this._strategyName = config.strategyName;
        this._filterAssets = config.filteredAssets ?? [];
        this._engine = config.engine;

        this._mockWallet = new WalletService();
        this._currentSlot = this._fromSlot;
        this._entities = [];
        this._orders = [];

        this._mockWallet.isWalletLoaded = true;
        this._engine.isBacktesting(true);

        this.loadMockBalances(config.initialBalances);
    }

    get id(): number | undefined {
        return this._savedId;
    }

    get orders(): BacktestOrder[] {
        return this._orders;
    }

    get error(): string {
        return this._failError;
    }

    get progress(): number {
        if (this._failError) return 100;

        return ((this._currentSlot - this._fromSlot) * 100) / (this._toSlot - this._fromSlot);
    }

    get fromSlot(): number {
        return this._fromSlot;
    }

    get toSlot(): number {
        return this._toSlot;
    }

    get fromTimestamp(): number {
        return this._fromTimestamp;
    }

    get toTimestamp(): number {
        return this._toTimestamp;
    }

    /**
     * Setup & run the backtest.
     */
    public async run(): Promise<any> {
        this._engine.logInfo(`Running '${this._strategyName}' backtest from slot: ${this._fromSlot} (${this._fromTimestamp})  to slot: ${this._toSlot} (${this._toTimestamp})`, 'Backtest');

        const strategy: BaseStrategy | undefined = this._engine.strategies
            .find((strategy: BaseStrategy) => strategy.identifier === this._strategyName);

        if (! strategy) {
            this._failError = `Failed to load strategy with name ${this._strategyName}`;
            return Promise.reject(this._failError);
        }

        if (! strategy.onWebsocketMessage) {
            this._failError = `Strategy ${this._strategyName} does not implement 'onWebsocketMessage'`;
            return Promise.reject(this._failError);
        }

        strategy.isBacktesting = true;
        strategy.switchWallet(this._mockWallet);

        await this.createId(strategy.identifier);
        if (strategy.beforeBacktest) {
            await strategy.beforeBacktest(this._engine, this);
        }

        // Strategy setup
        this._engine.order = this.orderFromBacktest.bind(this);

        // Retrieve test entities & feed into strategy
        const timestampWindows: TimestampWindows = this.generateTimestampWindows();

        for (let [fromTimestamp, toTimestamp] of Object.entries(timestampWindows)) {
            if (strategy.beforeDataPull) {
                await strategy.beforeDataPull(Number(fromTimestamp), Number(toTimestamp));
            }

            await this.loadEntities(Number(fromTimestamp), Number(toTimestamp));

            this._engine.logInfo(`Feeding '${this._strategyName}' test entities ...`, 'Backtest');

            // Feed entities into strategy
            for (const entity of this._entities) {
                await strategy.onWebsocketMessage?.bind(strategy)(entity);

                this.updateCurrentSlot(entity);
            }
        }

        this._currentSlot = this._toSlot;

        this._engine.logInfo('Backtest completed', 'Backtest');

        return Promise.resolve();
    }

    private loadMockBalances(balances: any) {
        this._mockWallet.balances = new Map<string, bigint>([
            ['lovelace', BigInt(balances['lovelace' ?? 1000_000000n])]
        ])
    }

    private updateCurrentSlot(entity: BacktestableEntity): void {
        if ('slot' in entity) {
            this._currentSlot = entity.slot;
        } else if ('createdSlot' in entity) {
            this._currentSlot = entity.createdSlot;
        } else if ('timestamp' in entity) {
            this._currentSlot = unixToSlot(Number(entity.timestamp));
        }
    }

    /**
     * Handler for orders made from strategy.
     */
    private orderFromBacktest(): BacktestOrder {
        const order: BacktestOrder = new BacktestOrder(this._engine);

        order
            .fromBacktest(this)
            .forSlot(this._currentSlot);

        this._orders.push(order);

        return order;
    }

    /**
     * Populate test entities.
     */
    private async loadEntities(fromTimestamp: number, toTimestamp: number) {
        return Promise.all([
            this._engine.api.liquidityPools().statesHistoric(fromTimestamp, toTimestamp, this._filterAssets),
            this._engine.api.liquidityPools().swapsHistoric(fromTimestamp, toTimestamp, this._filterAssets),
            this._engine.api.liquidityPools().depositsHistoric(fromTimestamp, toTimestamp, this._filterAssets),
            this._engine.api.liquidityPools().withdrawsHistoric(fromTimestamp, toTimestamp, this._filterAssets),
        ]).then((responses) => {
            this._entities = responses
                .reduce((entities: BacktestableEntity[], response: any) => {
                    if (response.data) {
                        entities.push(...response.data);
                    } else {
                        entities.push(...response);
                    }
                    return entities;
                }, [])
                .sort((a: BacktestableEntity, b: BacktestableEntity) => {
                    const aSlot: number = 'slot' in a
                        ? a.slot
                        : ('createdSlot' in a ? a.createdSlot : 0);
                    const bSlot: number = 'slot' in b
                        ? b.slot
                        : ('createdSlot' in b ? b.createdSlot : 0);

                    return aSlot - bSlot;
                });

            const fromSlot: number = unixToSlot(fromTimestamp);
            const toSlot: number = unixToSlot(toTimestamp);

            this._engine.logInfo(`Loaded ${this._entities.length} test entities from slot: ${fromSlot} (${fromTimestamp})  to slot: ${toSlot} (${toTimestamp})`, 'Backtest');
        })
    }

    private generateTimestampWindows(): TimestampWindows {
        const gapTimestamps: number[] = Array.from(
            Array(Math.ceil((this._toTimestamp - this._fromTimestamp) / TIMESTAMP_GAP_SECONDS) + 1), (_, index: number) => {
                const nextTimestamp: number = index * TIMESTAMP_GAP_SECONDS + this._fromTimestamp;

                if (nextTimestamp > this._toTimestamp) return this._toTimestamp;

                return nextTimestamp;
            }
        );

        return gapTimestamps.reduce((gaps: TimestampWindows, timestamp: number, currentIndex: number) => {
            if (! gapTimestamps[currentIndex + 1]) return gaps;

            gaps[Number(timestamp)] = gapTimestamps[currentIndex + 1];

            return gaps;
        }, {});
    }

    private async createId(strategy: string): Promise<void> {
        return this._engine.database.backtests().insert(strategy)
            .then((id: number | undefined) => {
                if (! id) throw new Error('Failed to create backtest in database');

                this._savedId = id;
            });
    }

}