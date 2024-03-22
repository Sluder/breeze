import { TrendIndicators } from '@app/indicators/trend/TrendIndicators';
import { VolumeIndicators } from '@app/indicators/volume/VolumeIndicators';
import { VolatilityIndicators } from '@app/indicators/volatility/VolatilityIndicators';
import { MomentumIndicators } from '@app/indicators/momentum/MomentumIndicators';

export class IndicatorService {

    public trend(): TrendIndicators {
        return new TrendIndicators();
    }

    public volume(): VolumeIndicators {
        return new VolumeIndicators();
    }

    public volatility(): VolatilityIndicators {
        return new VolatilityIndicators();
    }

    public momentum(): MomentumIndicators {
        return new MomentumIndicators();
    }

}
