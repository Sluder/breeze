import { Database } from 'sqlite';

export class OrderQueryRunner {

    private readonly _connection: Database;

    constructor(connection: Database) {
        this._connection = connection;
    }

    public async insert(
        liquidityPoolIdentifier: string,
        strategy: string,
        swapInAmount: bigint,
        minReceive: bigint,
        swapInTokenIdentifier: string,
        swapOutTokenIdentifier: string,
        priceImpactPercent: number,
        dexFeesPaid: bigint,
        timestamp: number,
        txHash?: string,
        backtestId?: number,
    ): Promise<number | undefined> {

        return this._connection.run(
            'INSERT INTO orders (liquidity_pool, strategy, swap_in_amount, min_receive, swap_in_token, swap_out_token, price_impact_percent, dex_fees_paid, backtest_id) VALUES (:liquidity_pool, :strategy, :swap_in_amount, :min_receive, :swap_in_token, :swap_out_token, :price_impact_percent, :dex_fees_paid, :timestamp, :tx_hash, :backtest_id)',
            {
                ':liquidity_pool': liquidityPoolIdentifier,
                ':strategy': strategy,
                ':swap_in_amount': Number(swapInAmount),
                ':min_receive': Number(minReceive),
                ':swap_in_token': swapInTokenIdentifier,
                ':swap_out_token': swapOutTokenIdentifier,
                ':price_impact_percent': priceImpactPercent,
                ':dex_fees_paid': dexFeesPaid,
                ':timestamp': timestamp,
                ':tx_hash': txHash ?? '',
                ':backtest_id': backtestId,
            }
        ).then((result) => result.lastID);
    }

}
