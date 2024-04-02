import { BlockfrostConfig, KupmiosConfig } from '@indigo-labs/dexter';
import { BaseCacheStorage } from '@app/storage/BaseCacheStorage';
import { SwapOrder } from '../../iris-sdk';

export type StrategyConfig = {
    runEveryMilliseconds: number, // Use 0 to disable timer
    params: any,                  // Extra parameters you can provide
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
}

export type StrategyOrders = {
    [strategyIdentifier: string]: SwapOrder[],
}