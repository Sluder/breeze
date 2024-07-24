import { BlockfrostConfig, KupmiosConfig } from '@indigo-labs/dexter';
import { BaseCacheStorage } from '@app/storage/BaseCacheStorage';
import {
    Asset,
    DepositOrder,
    LiquidityPool,
    LiquidityPoolState,
    OperationStatus,
    SwapOrder, Tick,
    WithdrawOrder
} from '@indigo-labs/iris-sdk';
import { TradeEngine } from '@app/TradeEngine';

export type StrategyConfig = {
    runEveryMilliseconds: number, // Use 0 to disable timer
    params: any,                  // Extra parameters you can provide
}

export type BacktestConfig = {
    enabled: boolean,
    port: number,
}

export type DatabaseConfig = {
    file: string,
}

export type TradeEngineConfig = {
    appName?: string,
    irisWebsocketHost: string,
    irisApiHost: string,
    seedPhrase: string[],
    canSubmitOrders: boolean,
    neverSpendAda?: number,
    submissionProviderConfig: BlockfrostConfig | KupmiosConfig,
    logDirectory: string,
    cacheStorage?: BaseCacheStorage,
    backtest?: BacktestConfig,
    database: DatabaseConfig,
}

export type BacktestRunConfig = {
    fromTimestamp: number,
    toTimestamp: number,
    strategyName: string,
    engine: TradeEngine,
    initialBalances?: Map<string, bigint>,
    filteredAssets?: Asset[],
}

export type BacktestableEntity =
    | Tick
    | LiquidityPool
    | LiquidityPoolState
    | SwapOrder
    | DepositOrder
    | WithdrawOrder
    | OperationStatus;

export type TimestampWindows = {
    [fromTimestamp: number]: number,
}