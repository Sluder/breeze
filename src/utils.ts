import { Asset, LiquidityPool, Token } from '@indigo-labs/iris-sdk';
import { Asset as DexterAsset, Token as DexterToken, LiquidityPool as DexterLiquidityPool } from '@indigo-labs/dexter';

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

export function toDexterToken(token: Token): DexterToken {
    if (token === 'lovelace') return 'lovelace';

    return new DexterAsset(
        token.policyId,
        token.nameHex,
        token.decimals ?? 0,
    );
}

export function toDexterLiquidityPool(liquidityPool: LiquidityPool): DexterLiquidityPool {
    return new DexterLiquidityPool(
        liquidityPool.dex,
        toDexterToken(liquidityPool.tokenA),
        toDexterToken(liquidityPool.tokenB),
        liquidityPool.state?.reserveA ?? 0n,
        liquidityPool.state?.reserveB ?? 0n,
        liquidityPool.address,
        liquidityPool.orderAddress,
        liquidityPool.orderAddress,
    );
}

export function tokenToJson(token: Token): any {
    if (token === 'lovelace') return null;

    return {
        policyId: token.policyId,
        nameHex: token.nameHex,
        decimals: token.decimals,
        name: token.name,
        ticker: token.ticker,
        logo: token.logo,
        description: token.description,
        meta: token.meta,
    };
}

export function liquidityPoolToJson(liquidityPool: LiquidityPool): any {
    return {
        dex: liquidityPool.dex,
        identifier: liquidityPool.identifier,
        address: liquidityPool.address,
        orderAddress: liquidityPool.orderAddress,
        tokenA: tokenToJson(liquidityPool.tokenA),
        tokenB: tokenToJson(liquidityPool.tokenB),
        reserveA: Number(liquidityPool.state?.reserveA ?? 0n),
        reserveB: Number(liquidityPool.state?.reserveB ?? 0n),
    };
}