import { Token } from '@indigo-labs/iris-sdk';

export function tokensMatch(tokenA: Token, tokenB: Token): boolean {
    const tokenAId: string = tokenA === 'lovelace' ? 'lovelace' : tokenA.identifier();
    const tokenBId: string = tokenB === 'lovelace' ? 'lovelace' : tokenB.identifier();

    return tokenAId === tokenBId;
}