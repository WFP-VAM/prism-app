;
import { useSafeTranslation } from 'i18n';

import { makeStyles, createStyles } from '@mui/styles';
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
  const classes = useAAIconStyles();
  const { t } = useSafeTranslation();

  return (
    <div
      style={fillBackground ? { background } : undefined}
      className={classes.iconWrapper}
    >
      <div
        style={{ border: `1px solid ${color}`, color }}
        className={classes.centerContainer}
      >
        <div
          style={{
            borderBottom: bottomText ? `1px solid ${color}` : undefined,
            background,
          }}
          className={classes.topTextContainer}
        >
          {t(topText)}
        </div>
        {bottomText && (
          <div style={{ background }} className={classes.bottomTextContainer}>
            {t(bottomText)}
          </div>
        )}
      </div>
    </div>
  );
}

const useAAIconStyles = makeStyles(() =>
  createStyles({
    iconWrapper: {
      height: '100%',
      borderRadius: '2px 0 0 2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Roboto',
    },
    centerContainer: {
      width: '2.1em',
      borderRadius: '2px',
      display: 'flex',
      flexDirection: 'column',
    },
    topTextContainer: {
      textAlign: 'center',
      fontSize: '14px',
      lineHeight: '17px',
      fontWeight: 700,
    },
    bottomTextContainer: {
      textAlign: 'center',
      fontSize: '10px',
      lineHeight: '17px',
      fontWeight: 700,
    },
  }),
);

export default AAIcon;
