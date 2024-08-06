import { BaseNotifier } from '@app/notifiers/BaseNotifier';
import { LiquidityPool, Token } from '@indigo-labs/iris-sdk';

export class NotificationService {

    private _notifiers: BaseNotifier[];

    constructor(notifiers: BaseNotifier[]) {
        this._notifiers = notifiers;
    }

    public notify(liquidityPool: LiquidityPool, strategyName: string, inToken: Token, outToken: Token, amount: bigint, estReceive: bigint): Promise<any> {
        return Promise.all(
            this._notifiers.map((notifier: BaseNotifier) => notifier.send(liquidityPool, strategyName, inToken, outToken, amount, estReceive))
        );
    }

}
