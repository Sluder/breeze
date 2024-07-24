import { BaseController } from '@app/api/BaseController';
import express from 'express';
import { Backtest } from '@app/entities/Backtest';
import { BacktestOrder } from '@app/entities/BacktestOrder';
import { Asset } from '@indigo-labs/iris-sdk';

export class BacktestController extends BaseController {

    private _currentBacktest: Backtest;

    bootRoutes() {
        this.router.get(`${this.basePath}`, this.check.bind(this));
        this.router.post(`${this.basePath}`, this.run.bind(this));
        this.router.get(`${this.basePath}/status`, this.status.bind(this));
        this.router.get(`${this.basePath}/orders`, this.orders.bind(this));
    }

    private check(request: express.Request, response: express.Response) {
        return response.send(
            super.successResponse()
        );
    }

    private run(request: express.Request, response: express.Response) {
        const {
            fromTimestamp,
            toTimestamp,
            strategyName,
            initialBalances,
            filteredAssets,
        } = request.body;

        if (! fromTimestamp || ! toTimestamp || ! strategyName) {
            return response.send(
                super.failResponse("Must provide both 'fromTimestamp' and 'toTimestamp', along with 'strategyName'")
            );
        }

        this._currentBacktest = new Backtest(
            {
                fromTimestamp,
                toTimestamp,
                strategyName,
                engine: this.engine,
                initialBalances,
                filteredAssets: ((filteredAssets ?? []) as string[]).map((assetIdentifier: string) => Asset.fromIdentifier(assetIdentifier)),
            },
        );
        this._currentBacktest.run();

        return response.send(
            super.successResponse()
        );
    }

    private status(request: express.Request, response: express.Response) {
        if (! this._currentBacktest) {
            return response.send({
                progress: 0,
                error: '',
            });
        }

        return response.send({
            progress: this._currentBacktest.progress,
            error: this._currentBacktest.error,
        });
    }

    private orders(request: express.Request, response: express.Response) {
        if (! this._currentBacktest) {
            return response.send([]);
        }

        return response.send(
            this._currentBacktest.orders
                .map((order: BacktestOrder) => order.toJson())
        );
    }

}