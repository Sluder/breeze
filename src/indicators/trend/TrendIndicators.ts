import { Tick } from '@indigo-labs/iris-sdk';
import { SMA } from '@app/indicators/trend/sma';
import { EMA } from '@app/indicators/trend/ema';
import { TSMA } from '@app/indicators/trend/tsma';
import { TEMA } from '@app/indicators/trend/tema';

export class TrendIndicators {

    /**
     * Simple Moving Average
     *
     * https://www.investopedia.com/terms/s/sma.asp
     */
    public sma(ticks: Tick[], length: number): number {
        return (new SMA()).run(ticks, length);
    }

    /**
     * Triple Simple Moving Average
     */
    public tsma(ticks: Tick[], lengthShort: number, lengthMedium: number, lengthLong: number): number[] {
        return (new TSMA()).run(ticks, lengthShort, lengthMedium, lengthLong, this);
    }

    /**
     * Exponential Moving Average
     *
     * https://www.investopedia.com/terms/e/ema.asp
     */
    public ema(ticks: Tick[], length: number, smoothing: number = 2): number {
        return (new EMA()).run(ticks, length, smoothing);
    }

    /**
     * Triple Exponential Moving Average
     *
     * https://www.investopedia.com/terms/t/triple-exponential-moving-average.asp
     */
    public tema(ticks: Tick[], length: number): number {
        return (new TEMA()).run(ticks, length, this);
    }

}
