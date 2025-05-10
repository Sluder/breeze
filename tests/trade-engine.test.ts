import { BaseStrategy, TradeEngine, TradeEngineConfig } from '../src';

describe('TradeEngine', () => {
    const mockConfig: TradeEngineConfig = {
        appName: 'TestApp',
        irisApiHost: 'http://localhost',
        irisWebsocketHost: 'ws://localhost',
        canSubmitOrders: false,
        logDirectory: '.',
        submissionProviderConfig: { kupoUrl: 'http://localhost', ogmiosUrl: 'http://localhost' },
        database: { file: 'test' },
        seedPhrase: [],
    };

    class DummyStrategy extends BaseStrategy {
        identifier = 'dummy';
        config = {};
    }

    it('should initialize with strategies and config', () => {
        const strategies = [new DummyStrategy()];
        const engine = new TradeEngine(strategies, mockConfig);
        expect(engine.strategies.length).toBe(1);
        expect(engine.config.appName).toBe('TestApp');
    });

    it('should log info and error', () => {
        const engine = new TradeEngine([], mockConfig);
        expect(() => engine.logInfo('info')).not.toThrow();
        expect(() => engine.logError('error')).not.toThrow();
    });
});