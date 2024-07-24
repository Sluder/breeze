import express, { Router } from 'express';
import { TradeEngine } from '@app/TradeEngine';

export abstract class BaseController {

    public router: Router;
    public basePath: string;
    public engine: TradeEngine;

    constructor(basePath: string, engine: TradeEngine) {
        this.router = express.Router();
        this.basePath = basePath;
        this.engine = engine;
    }

    abstract bootRoutes(): void;

    public successResponse(): Object {
        return {
            success: true,
        };
    }

    public failResponse(message: string): Object {
        return {
            success: false,
            message,
        };
    }

}
