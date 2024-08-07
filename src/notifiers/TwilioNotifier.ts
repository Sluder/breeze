import { BaseNotifier } from '@app/notifiers/BaseNotifier';
import { default as Twilio } from 'twilio';
import { LiquidityPool, Token } from '@indigo-labs/iris-sdk';

export class TwilioNotifier extends BaseNotifier {

    private _twilio;
    private readonly _fromPhoneNumber: string;
    private readonly _toPhoneNumber: string;

    constructor(
        accountSid: string,
        authToken: string,
        fromPhoneNumber: string,
        toPhoneNumber: string,
    ) {
        super();

        this._twilio = Twilio(accountSid, authToken);
        this._fromPhoneNumber = fromPhoneNumber;
        this._toPhoneNumber = toPhoneNumber;
    }

    public async send(liquidityPool: LiquidityPool, strategyName: string, inToken: Token, outToken: Token, amount: bigint, estReceive: bigint): Promise<any> {
        return this._twilio
            .messages
            .create({
                body: '', //todo
                to: this._toPhoneNumber,
                from: this._fromPhoneNumber,
            })
            .then((e: any) => console.error(e));
    }

}