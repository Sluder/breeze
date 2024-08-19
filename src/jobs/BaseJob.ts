import { TradeEngine } from '@app/TradeEngine';

export abstract class BaseJob {

    protected _app: TradeEngine

    constructor(app: TradeEngine) {
        this._app = app;
    }

    abstract shouldRun(): boolean | Promise<boolean>;

    abstract run(): Promise<void>;

}
