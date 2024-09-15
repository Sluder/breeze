import { LiquidityPool, Token } from '@indigo-labs/iris-sdk';

export abstract class BaseNotifier {

    public abstract send(text: string): Promise<any>;

    public abstract sendForOrder(liquidityPool: LiquidityPool, strategyName: string, inToken: Token, outToken: Token, amount: bigint, estReceive: bigint): Promise<any>;

}
