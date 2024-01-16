import { BaseIndicator } from '@app/indicators/BaseIndicator';
import { Tick } from '@indigo-labs/iris-sdk';

export class SMA extends BaseIndicator {

    public run(ticks: Tick[], length: number): number {
        if (length > ticks.length) {
            return ticks.slice(-1)[0].close;
        }

        return ticks
            .slice(-length)
            .reduce((total: number, tick: Tick) => total + tick.close, 0)
            / length;
    }

}
