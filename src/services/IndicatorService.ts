import { TrendIndicators } from '@app/indicators/trend/TrendIndicators';
import { VolumeIndicators } from '@app/indicators/volume/VolumeIndicators';
import { VolatilityIndicators } from '@app/indicators/volatility/VolatilityIndicators';
import { MomentumIndicators } from '@app/indicators/momentum/MomentumIndicators';

export class IndicatorService {

    public trend() {
        return new TrendIndicators();
    }

    public volume() {
        return new VolumeIndicators();
    }

    public volatility() {
        return new VolatilityIndicators();
    }

    public momentum() {
        return new MomentumIndicators();
    }

}
