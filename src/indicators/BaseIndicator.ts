import { Tick } from '@indigo-labs/iris-sdk';

export abstract class BaseIndicator {

    public abstract run(ticks: Tick[], ...params: any): any;

}
