import { Box } from '@mui/material';
import { useSafeTranslation } from 'i18n';

import { aaIconSx } from './aaPanelStyles';

export interface AAIconProps {
  background?: string;
  topText: string;
  bottomText?: string;
  color: string;
  fillBackground: boolean;
}

function AAIcon({
  background,
  topText,
  bottomText,
  color,
  fillBackground,
}: AAIconProps) {
  const { t } = useSafeTranslation();

  return (
    <Box
      sx={aaIconSx.iconWrapper}
      style={fillBackground ? { background } : undefined}
    >
      <Box
        sx={aaIconSx.centerContainer}
        style={{ border: `1px solid ${color}`, color }}
      >
        <Box
          sx={aaIconSx.topTextContainer}
          style={{
            borderBottom: bottomText ? `1px solid ${color}` : undefined,
            background,
          }}
        >
          {t(topText)}
        </Box>
        {bottomText && (
          <Box sx={aaIconSx.bottomTextContainer} style={{ background }}>
            {t(bottomText)}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default AAIcon;
