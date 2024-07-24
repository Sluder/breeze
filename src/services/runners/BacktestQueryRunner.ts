import { Database } from 'sqlite';

export class BacktestQueryRunner {

    private readonly _connection: Database;

    constructor(connection: Database) {
        this._connection = connection;
    }

    public async insert(
        strategy: string,
    ): Promise<number | undefined> {
        if (! this._connection) throw new Error('Database not connected');

        return this._connection.run(
            'INSERT INTO backtests (strategy) VALUES (:strategy)',
            {
                ':strategy': strategy,
            }
        ).then((result) => result.lastID);
    }

}
