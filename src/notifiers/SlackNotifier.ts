import { BaseNotifier } from '@app/notifiers/BaseNotifier';
import { WebClient } from '@slack/web-api';
import { LiquidityPool, Token, tokenDecimals } from '@indigo-labs/iris-sdk';
import { formatDigits, formatWithDecimals, tokensMatch, tokenTicker } from '@app/utils';

export class SlackNotifier extends BaseNotifier {

    private _client: WebClient;
    private readonly _channelId: string;

    constructor(token: string, channelId: string) {
        super();

        this._client = new WebClient(token);
        this._channelId = channelId;
    }

    public async send(liquidityPool: LiquidityPool, strategyName: string, inToken: Token, outToken: Token, amount: bigint, estReceive: bigint): Promise<any> {
        const inAmount: number = formatWithDecimals(amount, inToken);
        const outAmount: number = formatWithDecimals(estReceive, outToken);
        const side: string = tokensMatch(liquidityPool.tokenA, inToken) ? 'BUY' : 'SELL';
        const price: number = formatDigits(
            tokensMatch(liquidityPool.tokenA, inToken) ? (inAmount / outAmount) : (outAmount / inAmount),
            tokenDecimals(outToken) ?? 10
        );

        return this._client
            .chat
            .postMessage({
                text: [
                    `> \`${side}\` *${liquidityPool.dex} ${liquidityPool.readableTokenATicker}/${liquidityPool.tokenB.readableTicker} @ ${price}*`,
                    `> • *Strategy* : ${strategyName}`,
                    `> • *In* : ${inAmount} ${inToken === 'lovelace' ? '₳' : tokenTicker(inToken)}`,
                    `> • *Out* : ${outAmount} ${outToken === 'lovelace' ? '₳' : tokenTicker(outToken)}`,
                ].join("\n"),
                channel: this._channelId,
            });
    }

}