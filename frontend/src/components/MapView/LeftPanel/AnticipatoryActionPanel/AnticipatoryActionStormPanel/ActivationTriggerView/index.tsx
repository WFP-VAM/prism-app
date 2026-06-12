import { Box, Typography } from '@mui/material';
import { AADataSelector } from 'context/anticipatoryAction/AAStormStateSlice';
import { AACategory } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { useSafeTranslation } from 'i18n';
import { useSelector } from 'react-redux';

import { aaActivationTriggerSx, aaCommonSx } from '../../aaPanelStyles';
import { getAAColor } from '../utils';
import { AADisplayCategory, AAPanelCategories } from './types';

interface AreaTagProps {
  name: string;
  color: {
    background: string;
    text: string;
  };
}

function AreaTag({ name, color }: AreaTagProps) {
  const { t } = useSafeTranslation();

  return (
    <Box
      component="button"
      type="button"
      sx={aaActivationTriggerSx.areaTagWrapper}
      style={{ borderColor: color.background, color: color.text }}
    >
      <Typography>{t(name)}</Typography>
    </Box>
  );
}

interface CategoryTextProps {
  color: {
    background: string;
    text: string;
  };
  text: string;
}

function CategoryText({ color, text }: CategoryTextProps) {
  return (
    <Typography
      sx={aaActivationTriggerSx.categoryText}
      style={{ backgroundColor: color.background, color: color.text }}
    >
      {text}
    </Typography>
  );
}

interface ActivationTriggerProps {
  dialogs: {
    text: string;
    onclick: () => void;
  }[];
}

function ActivationTrigger({ dialogs }: ActivationTriggerProps) {
  const { t } = useSafeTranslation();
  const parsedStormData = useSelector(AADataSelector);

  const filteredActiveDistricts = parsedStormData.activeDistricts
    ? Object.entries(parsedStormData.activeDistricts).filter(([category]) =>
        AAPanelCategories.includes(category as AACategory),
      )
    : [];

  // Ensure districts appearing in Severe are not duplicated in Moderate
  const severeDistrictsSet = new Set(
    parsedStormData.activeDistricts?.[AACategory.Severe]?.districtNames ?? [],
  );

  // Check if there are any districts to display
  const hasActiveDistricts = filteredActiveDistricts.some(
    ([category, data]) => {
      const names =
        (category as AACategory) === AACategory.Moderate
          ? data.districtNames.filter(name => !severeDistrictsSet.has(name))
          : data.districtNames;
      return names.length > 0;
    },
  );

  // Don't render anything if there are no active districts
  if (!hasActiveDistricts) {
    return null;
  }

  return (
    <Box sx={aaActivationTriggerSx.root}>
      <Typography sx={aaActivationTriggerSx.headerText}>
        {t('Activation trigger')}
      </Typography>

      <Box sx={aaActivationTriggerSx.wrapper}>
        {filteredActiveDistricts.map(([category, data]) => {
          const names =
            (category as AACategory) === AACategory.Moderate
              ? data.districtNames.filter(name => !severeDistrictsSet.has(name))
              : data.districtNames;

          if (names.length === 0) {
            return null;
          }

          return (
            <Box
              key={`${category}-active`}
              sx={aaActivationTriggerSx.headColumnWrapper}
            >
              {/* Active districts */}
              <Box sx={aaActivationTriggerSx.headColumn}>
                <CategoryText
                  color={getAAColor(category as AACategory, 'Active', true)}
                  text={t(`${AADisplayCategory[category as AACategory]}`)}
                />
              </Box>
              <Box sx={aaActivationTriggerSx.rowWrapper}>
                {names.map((name: string) => (
                  <Box sx={aaActivationTriggerSx.tagWrapper} key={name}>
                    <AreaTag
                      name={name}
                      color={getAAColor(category as AACategory, 'Active', true)}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
      <Box sx={aaCommonSx.footerWrapper}>
        <Box sx={aaCommonSx.footerDialogsWrapper}>
          {dialogs.map(dialog => (
            <Typography
              key={dialog.text}
              sx={aaCommonSx.footerDialog}
              component="button"
              onClick={() => dialog.onclick()}
            >
              {t(dialog.text)}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default ActivationTrigger;
