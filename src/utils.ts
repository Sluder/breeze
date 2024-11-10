import { Asset, LiquidityPool, Token, tokenDecimals } from '@indigo-labs/iris-sdk';
import { Asset as DexterAsset, Token as DexterToken, LiquidityPool as DexterLiquidityPool } from '@indigo-labs/dexter';
import { SundaeSwapV1 } from '@indigo-labs/dexter/build/dex/sundaeswap-v1';

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

export function tokenTicker(token: Token): string {
    return token === 'lovelace'
        ? 'ADA'
        : token.readableTicker;
}

export function formatWithDecimals(amount: bigint, token: Token): number {
    return tokenDecimals(token) > 0
        ? Number(amount) / 10**tokenDecimals(token)
        : Number(amount);
}

export function formatDigits(value: any, digits: number = 6): number {
    return Math.round(value * 10 ** digits) / 10 ** digits;
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
    let dex: string = liquidityPool.dex;

    if (dex === 'SundaeSwap') {
        dex = SundaeSwapV1.identifier;
    }

    const pool: DexterLiquidityPool = new DexterLiquidityPool(
        dex,
        toDexterToken(liquidityPool.tokenA),
        toDexterToken(liquidityPool.tokenB),
        BigInt(liquidityPool.state?.reserveA ?? 0),
        BigInt(liquidityPool.state?.reserveB ?? 0),
        liquidityPool.address,
        liquidityPool.orderAddress,
        liquidityPool.orderAddress,
    );

    pool.poolFeePercent = liquidityPool.state?.feePercent ?? 0;
    pool.identifier = liquidityPool.identifier;

    if (liquidityPool.lpToken) {
        pool.lpToken = new DexterAsset(liquidityPool.lpToken.policyId, liquidityPool.lpToken.nameHex);
    }
    if (liquidityPool.state && liquidityPool.state.lpToken) {
        pool.lpToken = new DexterAsset(liquidityPool.state.lpToken.policyId, liquidityPool.state.lpToken.nameHex);
    }

    return pool;
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