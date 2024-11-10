import {
    AssetBalance,
    BaseWalletProvider,
    BlockfrostConfig,
    KupmiosConfig,
    LucidProvider,
    UTxO
} from '@indigo-labs/dexter';
import { TradeEngine } from '@app/TradeEngine';
import { Blockfrost, Kupmios, Lucid, LucidEvolution } from '@lucid-evolution/lucid';

export class WalletService {

    public isWalletLoaded: boolean = false;

    public balances: Map<string, bigint> = new Map<string, bigint>();
    public address: string = '';

    private _engine: TradeEngine;
    private _lucid: LucidEvolution;

    public async boot(engine: TradeEngine, seedPhrase: string[], config: BlockfrostConfig | KupmiosConfig, accountIndex: number = 0): Promise<any> {
        this._engine = engine;

        // Load lucid instance for breeze.
        this._lucid = await Lucid(
            'projectId' in config ? new Blockfrost(config.url, config.projectId) : new Kupmios(config.kupoUrl, config.ogmiosUrl),
            'Mainnet',
        );
        this._lucid.selectWallet.fromSeed(seedPhrase.join(' '), { accountIndex });

        // Load lucid instance for dexter.
        const lucidProvider: LucidProvider = new LucidProvider();

        if (! engine.config.canSubmitOrders) {
            return Promise.resolve();
        }

        if (seedPhrase.length === 0) {
            return Promise.reject("Must provide seed phrase when 'canSubmitOrders' is true");
        }

        return lucidProvider.loadWalletFromSeedPhrase(seedPhrase, { accountIndex }, config)
            .then((walletProvider: BaseWalletProvider) => {
                engine.dexter.withWalletProvider(walletProvider);

                return this.loadBalances();
            });
    }

    public lucid(): LucidEvolution {
        return this._lucid;
    }

    public balanceFromAsset(assetIdentifier: string) {
        return this.balances.get(assetIdentifier);
    }

    public async loadBalances(): Promise<any> {
        if (! this._engine.dexter.dataProvider) {
            return Promise.reject('Dexter data provider not set.');
        }
        if (! this._engine.dexter.walletProvider) {
            return Promise.reject('Dexter wallet provider not set');
        }

        this.address = this._engine.dexter.walletProvider.address();

        return this._engine.dexter.dataProvider.utxos(this.address)
            .then((utxos: UTxO[]) => {
                const assetBalances: AssetBalance[] = utxos.map((utxo: UTxO) => utxo.assetBalances).flat();

                this.balances = assetBalances.reduce((totalBalances: Map<string, bigint>, balance: AssetBalance) => {
                    const balanceId: string = balance.asset === 'lovelace' ? 'lovelace' : balance.asset.identifier();

                    totalBalances = totalBalances.set(balanceId, (totalBalances.get(balanceId) ?? 0n) + balance.quantity);

                    return totalBalances;
                }, new Map<string, bigint>());

                this.isWalletLoaded = true;
            });
    }

}
