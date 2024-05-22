import { BaseController } from '@app/services/backtesting/BaseController';
import express from 'express';
import { BaseStrategy } from '@app/BaseStrategy';

export class StrategyController extends BaseController {

    bootRoutes() {
        this.router.get(`${this.basePath}`, this.all.bind(this));
    }

    /**
     * Retrieve list of enabled strategies.
     */
    private all(request: express.Request, response: express.Response) {
        return response.send(
            this.engine.strategies.map((strategy: BaseStrategy) => strategy.identifier)
        );
    }

}