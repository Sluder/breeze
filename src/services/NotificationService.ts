import { BaseNotifier } from '@app/notifiers/BaseNotifier';
import { LiquidityPool, Token } from '@indigo-labs/iris-sdk';

export class NotificationService {

    private _notifiers: BaseNotifier[];

    constructor(notifiers: BaseNotifier[]) {
        this._notifiers = notifiers;
    }

    public notify(text: string): Promise<any> {
        return Promise.all(
            this._notifiers.map((notifier: BaseNotifier) => notifier.send(text))
        );
    }

    public notifyForOrder(liquidityPool: LiquidityPool, strategyName: string, inToken: Token, outToken: Token, amount: bigint, estReceive: bigint): Promise<any> {
        return Promise.all(
            this._notifiers.map((notifier: BaseNotifier) => notifier.sendForOrder(liquidityPool, strategyName, inToken, outToken, amount, estReceive))
        );
    }

}
