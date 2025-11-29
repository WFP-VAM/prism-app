import { Typography } from '@mui/material';
import { makeStyles, createStyles } from '@mui/styles';
import { useSelector } from 'react-redux';
import { AADataSelector } from 'context/anticipatoryAction/AAStormStateSlice';
import { useSafeTranslation } from 'i18n';
import { AACategory } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { getAAColor, AAStormColors } from '../utils';
import { useAACommonStyles } from '../../utils';
import { AADisplayCategory, AAPanelCategories } from './types';

interface AreaTagProps {
  name: string;
  color: {
    background: string;
    text: string;
  };
}

function AreaTag({ name, color }: AreaTagProps) {
  const classes = useAreaTagStyles();
  const { t } = useSafeTranslation();

  return (
    <button
      type="button"
      className={classes.areaTagWrapper}
      style={{ borderColor: color.background, color: color.text }}
    >
      <Typography>{t(name)}</Typography>
    </button>
  );
}

const useAreaTagStyles = makeStyles(() =>
  createStyles({
    areaTagWrapper: {
      border: `1px solid`,
      height: 'calc(2rem - 2px)',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25em',
      padding: '0 0.25em',
      background: 'none',
      boxShadow: 'none',
      '&:hover': {
        cursor: 'pointer',
      },
    },
  }),
);

const useStyles = makeStyles(() =>
  createStyles({
    categoryText: {
      borderRadius: '4px 4px 0px 0px',
      textAlign: 'left',
      textTransform: 'uppercase',
      lineHeight: '2rem',
      width: '100%',
      paddingLeft: '0.5rem',
    },
  }),
);

interface CategoryTextProps {
  color: {
    background: string;
    text: string;
  };
  text: string;
}

function CategoryText({ color, text }: CategoryTextProps) {
  const classes = useStyles();

  return (
    <Typography
      className={classes.categoryText}
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
  const classes = useActivationTriggerStyles();
  const parsedStormData = useSelector(AADataSelector);
  const commonClasses = useAACommonStyles();

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
    <div className={classes.root}>
      <Typography className={classes.headerText}>
        {t('Activation trigger')}
      </Typography>

      <div className={classes.ActivationTriggerWrapper}>
        {filteredActiveDistricts.map(([category, data]) => {
          const names =
            (category as AACategory) === AACategory.Moderate
              ? data.districtNames.filter(name => !severeDistrictsSet.has(name))
              : data.districtNames;

          if (names.length === 0) {
            return null;
          }

          return (
            <div
              key={`${category}-active`}
              className={classes.headColumnWrapper}
            >
              {/* Active districts */}
              <div className={classes.headColumn}>
                <CategoryText
                  color={getAAColor(category as AACategory, 'Active', true)}
                  text={t(`${AADisplayCategory[category as AACategory]}`)}
                />
              </div>
              <div className={classes.rowWrapper}>
                {names.map((name: string) => (
                  <div className={classes.tagWrapper} key={name}>
                    <AreaTag
                      name={name}
                      color={getAAColor(category as AACategory, 'Active', true)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className={commonClasses.footerWrapper}>
        <div className={commonClasses.footerDialogsWrapper}>
          {dialogs.map(dialog => (
            <Typography
              key={dialog.text}
              className={commonClasses.footerDialog}
              component="button"
              onClick={() => dialog.onclick()}
            >
              {t(dialog.text)}
            </Typography>
          ))}
        </div>
      </div>
    </div>
  );
}

const useActivationTriggerStyles = makeStyles(() =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
    },
    ActivationTriggerWrapper: {
      width: '100%',
      background: AAStormColors.background,
    },
    headColumnWrapper: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '2.5rem',
      margin: '1.5rem 1.5rem',
    },
    headColumn: {
      width: '10rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: {
      fontWeight: 'bold',
      textTransform: 'uppercase',
      height: '2rem',
      display: 'flex',
      margin: '0.2rem 1.5rem',
    },
    rowWrapper: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: '0.5rem',
      gap: '0.5rem',
      background: 'white',
    },
    tagWrapper: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    },
  }),
);

export default ActivationTrigger;
