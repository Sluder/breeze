import express, { Application } from 'express';
import { BaseController } from '@app/api/BaseController';
import { TradeEngine } from '@app/TradeEngine';
import { StrategyController } from '@app/api/StrategyController';
import { BacktestController } from '@app/api/BacktestController';
import cors from 'cors';

export class ConnectorService {

    private _express: Application;
    private readonly _port: number;
    private readonly _engine: TradeEngine;

    constructor(port: number, engine: TradeEngine) {
        this._express = express();
        this._port = port;
        this._engine = engine;

        this._express.use(express.json());
        this._express.use(cors());
    }

    public async boot(): Promise<any> {
        const controllers: BaseController[] = [
            new StrategyController('/strategies', this._engine),
            new BacktestController('/backtest', this._engine),
        ];

        controllers.forEach((controller: BaseController) => {
            controller.bootRoutes();

            this._express.use('/', controller.router);
        });

        return this._express.listen(this._port);
    }

}