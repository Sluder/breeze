import { Database } from 'sqlite';
import { Token } from '@indigo-labs/iris-sdk';

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
        slippagePercent: number,
        dexFeesPaid: bigint,
        timestamp: number,
        txHash?: string,
        backtestId?: number,
    ): Promise<number | undefined> {
        return this._connection.run(
            'INSERT INTO orders (liquidity_pool, strategy, swap_in_amount, min_receive, swap_in_token, swap_out_token, slippage_percent, dex_fees_paid, timestamp, tx_hash, backtest_id, is_settled) VALUES (:liquidity_pool, :strategy, :swap_in_amount, :min_receive, :swap_in_token, :swap_out_token, :slippage_percent, :dex_fees_paid, :timestamp, :tx_hash, :backtest_id, :is_settled)',
            {
                ':liquidity_pool': liquidityPoolIdentifier,
                ':strategy': strategy,
                ':swap_in_amount': Number(swapInAmount),
                ':min_receive': Number(minReceive),
                ':swap_in_token': swapInTokenIdentifier,
                ':swap_out_token': swapOutTokenIdentifier,
                ':slippage_percent': slippagePercent,
                ':dex_fees_paid': Number(dexFeesPaid),
                ':timestamp': timestamp,
                ':tx_hash': txHash ?? 'NULL',
                ':backtest_id': backtestId ?? 'NULL',
                ':is_settled': backtestId ? 1 : 0,
            }
        ).then((result) => result.lastID);
    }

    public async updateToSettled(txHash: string) {
        return this._connection.run(
            `UPDATE orders SET is_settled = 1 WHERE tx_hash = :tx_hash`,
            {
                ':tx_hash': txHash,
            }
        );
    }

    public async lastOrderFromStrategy(strategy: string) {
        return this._connection.get(
            `SELECT * from orders WHERE strategy = :strategy ORDER BY timestamp DESC LIMIT 1`,
            {
                ':strategy': strategy,
            }
        );
    }

    public async lastOrderForPair(strategy: string, tokenA: Token, tokenB: Token) {
        return this._connection.get(
            `SELECT * from orders WHERE strategy = :strategy AND swap_in_token ${tokenA === 'lovelace' ? 'IS NULL' : '= ' + `\'${tokenA.identifier()}\'`} AND swap_out_token ${tokenB === 'lovelace' ? 'IS NULL' : '= ' + `\'${tokenB.identifier()}\'`} ORDER BY timestamp DESC LIMIT 1`,
            {
                ':strategy': strategy,
            }
        );
    }

    public async unsettledOrdersForPair(strategy: string, tokenA: Token, tokenB: Token) {
        return this._connection.all(
            `SELECT * from orders WHERE strategy = :strategy AND swap_in_token ${tokenA === 'lovelace' ? 'IS NULL' : '= ' + `\'${tokenA.identifier()}\'`} AND swap_out_token ${tokenB === 'lovelace' ? 'IS NULL' : '= ' + `\'${tokenB.identifier()}\'`} AND is_settled = 0`,
            {
                ':strategy': strategy,
            }
        );
    }

    public async unsettledOrders() {
        return this._connection.all(
            `SELECT * from orders WHERE is_settled = 0 AND (backtest_id IS NULL OR backtest_id = 'NULL' OR backtest_id = '')`,
        );
    }

}
