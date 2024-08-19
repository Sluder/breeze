import { BaseJob } from '@app/jobs/BaseJob';
import { BaseStrategy } from '@app/BaseStrategy';
import { LiquidityPool } from '@indigo-labs/iris-sdk';
import { toDexterLiquidityPool } from '@app/utils';
import { LiquidityPool as DexterLiquidityPool } from '@indigo-labs/dexter';
import { DexTransaction } from '@indigo-labs/dexter/build/dex/models/dex-transaction';

export class AutoCancelJob extends BaseJob {

    public shouldRun(): boolean {
        return true;
    }

    public async run(): Promise<any> {
        const pendingOrders = await this._app.database.orders().unsettledOrders();

        if (! pendingOrders || pendingOrders.length === 0) return Promise.resolve();

        const cancelPromises: Promise<any>[] = pendingOrders.map(async (pendingOrder: any) => {
           return new Promise(async (resolve, reject) => {
               const strategy: BaseStrategy | undefined = this._app.strategies.find((strategy: BaseStrategy) => {
                   return strategy.identifier === pendingOrder.strategy;
               });

               if (! strategy) return resolve(undefined);

               const cancelAfterSeconds: number = strategy.config?.autoCancelAfterSeconds ?? 0;
               if (cancelAfterSeconds === 0) return resolve(undefined);

               const isPastDeadline: boolean = (pendingOrder.timestamp + cancelAfterSeconds) <= Date.now() / 1000;
               if (! isPastDeadline) return resolve(undefined);

               const liquidityPool: LiquidityPool | undefined = (await this._app.api
                   .liquidityPools()
                   .match({ identifier: pendingOrder.liquidity_pool }))
                   .data[0];

               if (! liquidityPool) return resolve(undefined);

               this._app.logInfo(`Auto-cancelling ${pendingOrder.tx_hash}`, strategy.identifier);

               const dexterLiquidityPool: DexterLiquidityPool = toDexterLiquidityPool(liquidityPool);

               const transaction: DexTransaction = this._app.dexter.newCancelSwapRequest()
                   .forDex(dexterLiquidityPool.dex)
                   .forTransaction(pendingOrder.tx_hash)
                   .cancel();

               transaction
                   .onSubmitted(() => {
                       return resolve(undefined);
                   }).onError((tx: DexTransaction) => {
                       console.error((tx.error?.reasonRaw[0] as any));
                       this._app.logError(tx.error?.reason ?? `Failed to auto-cancel`, strategy.identifier);

                       return reject(`Failed to auto-cancel`);
                   });
           });
        });

        for (const promise of cancelPromises) {
            await promise
                .catch(() => {});
        }

        return Promise.resolve();
    }

}