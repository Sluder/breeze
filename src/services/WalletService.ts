import {
    AssetBalance,
    BaseWalletProvider,
    BlockfrostConfig,
    Dexter,
    KupmiosConfig,
    LucidProvider,
    UTxO
} from '@indigo-labs/dexter';

export class WalletService {

    public isWalletLoaded: boolean = false;

    public balances: Map<string, bigint> = new Map<string, bigint>();
    public address: string = '';

    public async boot(dexter: Dexter, seedPhrase: string[], config: BlockfrostConfig | KupmiosConfig): Promise<any> {
        const lucidProvider: LucidProvider = new LucidProvider();

        if (dexter.config.shouldSubmitOrders) {
            if (seedPhrase.length === 0) {
                return Promise.reject("Must provide seed phrase when 'canSubmitOrders' is true");
            }

            return lucidProvider.loadWalletFromSeedPhrase(seedPhrase, {}, config)
                .then((walletProvider: BaseWalletProvider) => {
                    dexter.withWalletProvider(walletProvider);

                    return this.loadBalances(dexter);
                });
        }

        return Promise.resolve();
    }

    private async loadBalances(dexter: Dexter): Promise<any> {
        if (! dexter.dataProvider) {
            return Promise.reject('Dexter data provider not set.');
        }
        if (! dexter.walletProvider) {
            return Promise.reject('Dexter wallet provider not set');
        }

        this.address = dexter.walletProvider.address();

        return dexter.dataProvider.utxos(this.address)
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
