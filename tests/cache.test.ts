import { NodeCacheStorage } from '../src/storage/NodeCacheStorage';

describe('NodeCacheStorage', () => {
    let cache: NodeCacheStorage;

    beforeEach(async () => {
        cache = new NodeCacheStorage();
        await cache.boot();
    });

    it('should set and get a key', async () => {
        await cache.setKey('foo', 'bar', 10);
        const value = await cache.getKey('foo');
        expect(value).toBe('bar');
    });

    it('should delete a key', async () => {
        await cache.setKey('foo', 'bar');
        await cache.deleteKey('foo');
        const value = await cache.getKey('foo');
        expect(value).toBeUndefined();
    });

    it('should flush all keys', async () => {
        await cache.setKey('foo', 'bar');
        await cache.flushAll();
        const keys = await cache.keys();
        expect(keys).toEqual([]);
    });
});