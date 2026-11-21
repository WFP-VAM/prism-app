import { AccessTime, PriorityHigh } from '@material-ui/icons';
import { AAFloodColors } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionFloodPanel/constants';
import {
  AAFloodPhase,
  AAFloodRiskLevelType,
} from 'context/anticipatoryAction/AAFloodStateSlice/types';
import { getFloodRiskColor } from 'context/anticipatoryAction/AAFloodStateSlice/utils';

interface FloodStatusIconProps {
  phase?: AAFloodPhase | null;
  riskLevel: AAFloodRiskLevelType | 'No data';
  size?: number;
}

export function FloodStatusIcon({
  phase,
  riskLevel,
  size = 16,
}: FloodStatusIconProps) {
  const color =
    riskLevel === 'No data'
      ? AAFloodColors.riskLevels.noData
      : getFloodRiskColor(riskLevel);
  const glyph = riskLevel === 'Bankfull' ? '#1a1a1a' : '#fff';

  if (phase === 'activation' || phase === 'readiness') {
    const Icon = phase === 'activation' ? PriorityHigh : AccessTime;
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon style={{ fontSize: Math.round(size * 0.72), color: glyph }} />
      </span>
    );
  }

  if (riskLevel === 'No data') {
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          boxSizing: 'border-box',
          border: `2px solid ${color}`,
          backgroundColor: '#fff',
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
    );
  }

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}
