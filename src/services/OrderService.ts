import { SwapOrder, WsResponse } from '@indigo-labs/iris-sdk';
import { DatabaseService } from '@app/services/DatabaseService';

export class OrderService {

    private _databaseService: DatabaseService;

    constructor(databaseService: DatabaseService) {
        this._databaseService = databaseService;
    }

    public onWebsocketMessage(message: WsResponse): Promise<any> {
        if (! (message instanceof SwapOrder)) return Promise.resolve();

        return this._databaseService.orders().updateToSettled(message.txHash);
    }

}