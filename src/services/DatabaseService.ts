import sqlite3 from 'sqlite3'
import { Database, open } from 'sqlite'
import { DatabaseConfig } from '@app/types';
import { OrderQueryRunner } from '@app/services/runners/OrderQueryRunner';
import { BacktestQueryRunner } from '@app/services/runners/BacktestQueryRunner';

export class DatabaseService {

    private _connection: Database | undefined;
    private _config: DatabaseConfig;

    constructor(config: DatabaseConfig) {
        this._config = config;
    }

    public async boot(): Promise<any> {
        this._connection = await open({
            filename: this._config.file,
            driver: sqlite3.Database,
        });

        return this.migrate();
    }

    get connection(): Database {
        if (! this._connection) throw new Error('Database not connected');

        return this._connection;
    }

    public orders(): OrderQueryRunner {
        if (! this._connection) throw new Error('Database not connected');

        return new OrderQueryRunner(this._connection);
    }

    public backtest(): BacktestQueryRunner {
        if (! this._connection) throw new Error('Database not connected');

        return new BacktestQueryRunner(this._connection);
    }

    private migrate(): Promise<any> {
        if (! this._connection) throw new Error('Database not connected');

        return this._connection
            .migrate({
                force: false,
                migrations: [
                    {
                        id: 1,
                        name: 'create-tables',
                        up: `
                            CREATE TABLE backtests ( \
                                id INTEGER PRIMARY KEY, \
                                strategy TEXT NOT NULL, \
                                timestamp INTEGER NOT NULL \
                            ); \
                            CREATE TABLE orders ( \
                                id INTEGER PRIMARY KEY, \
                                backtest_id INTEGER NULL, \
                                liquidity_pool TEXT NOT NULL, \
                                strategy TEXT NOT NULL, \
                                swap_in_amount INTEGER, \
                                min_receive INTEGER, \
                                swap_in_token TEXT NULL, \
                                swap_out_token TEXT NULL,
                                slippage_percent INTEGER, \
                                dex_fees_paid INTEGER NOT NULL, \
                                tx_hash TEXT NULL, \
                                is_settled INTEGER DEFAULT 0, \
                                timestamp INTEGER NOT NULL, \
                                CONSTRAINT orders_fk_backtest_id FOREIGN KEY (backtest_id) REFERENCES backtests (id) ON UPDATE CASCADE ON DELETE CASCADE \
                            ); \
                            CREATE INDEX orders_ix_backtest_id ON orders (backtest_id); \
                            CREATE INDEX orders_ix_tx_hash_id ON orders (tx_hash);
                        `,
                        down: `
                            DROP TABLE orders; \
                            DROP TABLE backtests;
                        `,
                    },
                ],
            });
    }

}
