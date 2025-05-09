import { OperationStatus, SwapOrder, WsResponse } from '@indigo-labs/iris-sdk';
import { DexOperationStatus } from '@app/types';
import { TradeEngine } from '@app/TradeEngine';
import { BaseStrategy } from '@app/BaseStrategy';

export class OrderService {

    private _app: TradeEngine;

    constructor(app: TradeEngine) {
        this._app = app;
    }

    public onWebsocketMessage(message: WsResponse): Promise<any> {
        if (message.constructor.name !== OperationStatus.name) return Promise.resolve();

        message = message as OperationStatus;

        const hasReceivedFunds: boolean = [DexOperationStatus.Complete, DexOperationStatus.Cancelled].includes(message.status);

        if (! hasReceivedFunds || ! message.entity || ! (message.entity instanceof SwapOrder)) return Promise.resolve();

        return this._app.database.orders()
            .updateToSettled(message.entity.txHash)
            .then(() => {
                this._app.strategies.forEach((strategy: BaseStrategy) => strategy.wallet.loadBalances());
            });
    }

}