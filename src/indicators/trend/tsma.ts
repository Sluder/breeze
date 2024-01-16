import { BaseIndicator } from '@app/indicators/BaseIndicator';
import { Tick } from '@indigo-labs/iris-sdk';
import { TrendIndicators } from '@app/indicators/trend/TrendIndicators';

export class TSMA extends BaseIndicator {

    public run(ticks: Tick[], lengthShort: number, lengthMedium: number, lengthLong: number, indicators: TrendIndicators): number[] {
        return [
            indicators.sma(ticks, lengthShort),
            indicators.sma(ticks, lengthMedium),
            indicators.sma(ticks, lengthLong),
        ];
    }

}
