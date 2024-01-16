import { BaseIndicator } from '@app/indicators/BaseIndicator';
import { Tick } from '@indigo-labs/iris-sdk';

export class EMA extends BaseIndicator {

    public run(ticks: Tick[], length: number, smoothing: number): number {
        if (length > ticks.length) {
            return ticks.slice(-1)[0].close;
        }

        const weightFactor: number = 2 / (length + 1);
        const previousEma: number = this.run(ticks.slice(0, -1), length, smoothing);

        return ticks.slice(-1)[0].close * weightFactor + previousEma * (1 - weightFactor);
    }

}
