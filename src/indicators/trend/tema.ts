import { BaseIndicator } from '@app/indicators/BaseIndicator';
import { Tick } from '@indigo-labs/iris-sdk';
import { TrendIndicators } from '@app/indicators/trend/TrendIndicators';

export class TEMA extends BaseIndicator {

    public run(ticks: Tick[], length: number, indicators: TrendIndicators): number {
        const emaOneTicks: Tick[] = this.calculateList(ticks, length, indicators, []);
        const emaTwoTicks: Tick[] = this.calculateList(ticks, length, indicators, emaOneTicks);
        const emaThreeTicks: Tick[] = this.calculateList(ticks, length, indicators, emaTwoTicks);

        return 3 * (emaOneTicks.slice(-1)[0].close - emaTwoTicks.slice(-1)[0].close) + emaThreeTicks.slice(-1)[0].close;
    }

    private calculateList(ticks: Tick[], length: number, indicators: TrendIndicators, list: Tick[]) {
        for (let i = 0; i < ticks.length; i++) {
            list.push({
                time: ticks[i].time,
                open: ticks[i].open,
                high: ticks[i].high,
                low: ticks[i].low,
                close: indicators.ema(ticks, length),
                volume: ticks[i].volume,
            });
        }

        return list;
    }

}
