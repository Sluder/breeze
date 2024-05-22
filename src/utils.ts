import { Asset, Token } from '@indigo-labs/iris-sdk';

export function tokensMatch(tokenA: Token, tokenB: Token): boolean {
    const tokenAId: string = tokenA === 'lovelace' ? 'lovelace' : tokenA.identifier();
    const tokenBId: string = tokenB === 'lovelace' ? 'lovelace' : tokenB.identifier();

    return tokenAId === tokenBId;
}

export function tokenFromIdentifier(identifier: string, decimals: number = 0) {
    if (identifier === 'lovelace') return 'lovelace';

    return new Asset(
        identifier.slice(0, 56),
        identifier.slice(56),
        decimals,
    )
}

export function unixToSlot(timestamp: number): number {
    return Math.floor(timestamp - 1596059091000 / 1000) + 4492800;
}

export function slotToUnix(slot: number): number {
    return 1596491091 + slot - 4924800;
}