import { Typography, createStyles, makeStyles } from '@material-ui/core';
import { grey } from 'muiTheme';
import { useSelector } from 'react-redux';
import { AADataSelector } from 'context/anticipatoryAction/AAStormStateSlice';
import { useSafeTranslation } from 'i18n';
import {
  AADisplayCategory,
  AACategory,
  phaseValues,
  AADisplayPhase,
} from 'context/anticipatoryAction/AAStormStateSlice/types';
import { getAAColor } from '../utils';
import { useAACommonStyles } from '../../utils';

interface AreaTagProps {
  name: string;
  color: {
    background: string;
    text: string;
  };
}

function AreaTag({ name, color }: AreaTagProps) {
  const classes = useAreaTagStyles({ color });
  const { t } = useSafeTranslation();

  return (
    <button type="button" className={classes.areaTagWrapper}>
      <Typography>{t(name)}</Typography>
    </button>
  );
}

const useAreaTagStyles = makeStyles(() =>
  createStyles({
    areaTagWrapper: (props: {
      color: { background: string; text: string };
    }) => ({
      border: `1px solid ${props.color.background}`,
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
    }),
  }),
);

const useStyles = makeStyles(() =>
  createStyles({
    categoryText: (props: { color: { background: string; text: string } }) => ({
      background: props.color.background,
      color: props.color.text,
      borderRadius: '4px 4px 0px 0px',
      textAlign: 'left',
      textTransform: 'uppercase',
      lineHeight: '2rem',
      width: '100%',
      paddingLeft: '0.5rem',
    }),
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
  const classes = useStyles({ color });

  return <Typography className={classes.categoryText}>{text}</Typography>;
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
  const rawAAData = useSelector(AADataSelector);
  const commonClasses = useAACommonStyles();

  return (
    <div className={classes.root}>
      <Typography className={classes.headerText}>
        {t('Activation trigger')}
      </Typography>

      <div className={classes.ActivationTriggerWrapper}>
        {phaseValues.map(phase =>
          Object.entries(rawAAData.exposed || {}).map(([category, data]) =>
            data[phase] ? (
              <div
                key={`${category}-${phase}`}
                className={classes.headColumnWrapper}
              >
                <div className={classes.headColumn}>
                  <CategoryText
                    color={getAAColor(category as AACategory, phase, true)}
                    text={t(
                      `${AADisplayPhase[phase]}${
                        AADisplayCategory[category as AACategory]
                      }`,
                    )}
                  />
                </div>
                <div className={classes.rowWrapper}>
                  {data[phase].districtNames.map((name: string) => (
                    <div className={classes.tagWrapper} key={name}>
                      <AreaTag
                        name={name}
                        color={getAAColor(category as AACategory, phase, true)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null,
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
      background: grey,
    },
    headColumnWrapper: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '2.5rem',
      background: grey,
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
      padding: '0.125rem 0.5rem',
      paddingRight: 0,
      background: 'white',
    },
    tagWrapper: {
      padding: '0.5rem 0.5rem',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: '0.5em',
    },
  }),
);

export default ActivationTrigger;
