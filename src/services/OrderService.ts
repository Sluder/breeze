import { DexTransaction, SplitSwapRequest, SwapFee, SwapRequest } from '../../../dexter/src';
import { TradeEngine } from '@app/TradeEngine';
import { TradeEngineConfig } from '@app/types';

export class OrderService {

    private _engine: TradeEngine;
    private _engineConfig: TradeEngineConfig;

    constructor(engine: TradeEngine, engineConfig: TradeEngineConfig) {
        this._engine = engine;
        this._engineConfig = engineConfig;
    }

    public submit(request: SwapRequest | SplitSwapRequest) {
        this._engine.logInfo(`[${this._engineConfig.appName}] Building order ...`);

        const totalFees: bigint = request.getSwapFees().reduce((totalFees: bigint, fee: SwapFee) => totalFees + fee.value, 0n);
        this._engine.logInfo(`[${this._engineConfig.appName}] \t\t Estimated receive : ${request.getEstimatedReceive()}`);
        this._engine.logInfo(`[${this._engineConfig.appName}] \t\t Total Fees : ${Number(totalFees) / 10**6} ADA`);

        return request.submit()
            .onSigning(() => {
                this._engine.logInfo(`[${this._engineConfig.appName}] \t\t Signing order ...`);
            })
            .onSubmitting(() => {
                this._engine.logInfo(`[${this._engineConfig.appName}] \t\t Submitting order ...`);
            })
            .onSubmitted((transaction: DexTransaction) => {
                this._engine.logInfo(`[${this._engineConfig.appName}] \t\t  Order submitted : ${transaction.hash}`);
            })
            .onError((transaction: DexTransaction) => {
                this._engine.logInfo(`[${this._engineConfig.appName}] \t\t  Error submitting order : ` + transaction.error?.reasonRaw);
            });
    }

}
