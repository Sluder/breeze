import { BaseNotifier, NotificationService } from '../src';
import { jest } from '@jest/globals'

class MockNotifier extends BaseNotifier {
    public send = jest.fn().mockResolvedValue(undefined);
    public sendForOrder = jest.fn().mockResolvedValue(undefined);
}

describe('NotificationService', () => {
    it('should notify all notifiers', async () => {
        const notifier = new MockNotifier();
        const service = new NotificationService([notifier]);
        await service.notify('test');
        expect(notifier.send).toHaveBeenCalledWith('test');
    });
});