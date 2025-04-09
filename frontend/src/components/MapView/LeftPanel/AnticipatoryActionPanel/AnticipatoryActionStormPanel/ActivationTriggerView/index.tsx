import {
  Typography,
  createStyles,
  makeStyles,
  Button,
} from '@material-ui/core';
import { useSelector } from 'react-redux';
import { AADataSelector } from 'context/anticipatoryAction/AAStormStateSlice';
import { useSafeTranslation } from 'i18n';
import { AACategory } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { getAAColor } from '../utils';
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

  const handleDownloadGeoJSON = () => {
    if (!parsedStormData.mergedGeoJSON || !parsedStormData.forecastDetails) {
      return;
    }

    const dataStr = JSON.stringify(parsedStormData.mergedGeoJSON);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    // eslint-disable-next-line fp/no-mutation
    link.href = url;
    const date =
      parsedStormData.forecastDetails.reference_time.split(':00Z')[0];
    // eslint-disable-next-line fp/no-mutation
    link.download = `${parsedStormData.forecastDetails?.cyclone_name || 'cyclone'}_${date}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredActiveDistricts = parsedStormData.activeDistricts
    ? Object.entries(parsedStormData.activeDistricts).filter(([category]) =>
        AAPanelCategories.includes(category as AACategory),
      )
    : [];

  const filteredNADistricts = parsedStormData.naDistricts
    ? Object.entries(parsedStormData.naDistricts).filter(([category]) =>
        AAPanelCategories.includes(category as AACategory),
      )
    : [];

  return (
    <div className={classes.root}>
      <Typography className={classes.headerText}>
        {t('Activation trigger')}
      </Typography>

      <div className={classes.ActivationTriggerWrapper}>
        {filteredActiveDistricts.map(
          ([category, data]) =>
            data.districtNames.length > 0 && (
              <div
                key={`${category}-active`}
                className={classes.headColumnWrapper}
              >
                {/* Affichage pour les districts actifs */}
                <div className={classes.headColumn}>
                  <CategoryText
                    color={getAAColor(category as AACategory, 'Active', true)}
                    text={t(
                      `Active ${AADisplayCategory[category as AACategory]}`,
                    )}
                  />
                </div>
                <div className={classes.rowWrapper}>
                  {data.districtNames.map((name: string) => (
                    <div className={classes.tagWrapper} key={name}>
                      <AreaTag
                        name={name}
                        color={getAAColor(
                          category as AACategory,
                          'Active',
                          true,
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ),
        )}
        {filteredNADistricts.map(
          ([category, data]) =>
            data.districtNames.length > 0 && (
              <div
                key={`${category}-active`}
                className={classes.headColumnWrapper}
              >
                {/* Affichage pour les districts actifs */}
                <div className={classes.headColumn}>
                  <CategoryText
                    color={getAAColor(category as AACategory, 'na', true)}
                    text={t(`NA ${AADisplayCategory[category as AACategory]}`)}
                  />
                </div>
                <div className={classes.rowWrapper}>
                  {data.districtNames.map((name: string) => (
                    <div className={classes.tagWrapper} key={name}>
                      <AreaTag
                        name={name}
                        color={getAAColor(category as AACategory, 'na', true)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ),
        )}
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
          {parsedStormData.mergedGeoJSON && (
            <Button
              style={{
                width: '50%',
                margin: '1rem auto',
              }}
              className={commonClasses.footerButton}
              variant="outlined"
              fullWidth
              onClick={handleDownloadGeoJSON}
            >
              <Typography>{t('Download GeoJSON')}</Typography>
            </Button>
          )}
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
      background: '#F1F1F1',
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
