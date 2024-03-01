import { makeStyles, createStyles } from '@material-ui/core';
import React from 'react';

export interface AAIconProps {
  background: string;
  topText: string;
  bottomText: string;
  color: string;
}

function AAIcon({ background, topText, bottomText, color }: AAIconProps) {
  const classes = useAAIconStyles();

  return (
    <div style={{ background }} className={classes.iconWrapper}>
      <div
        style={{ border: `1px solid ${color}`, color }}
        className={classes.centerContainer}
      >
        <div
          style={{ borderBottom: `1px solid ${color}` }}
          className={classes.topTextContainer}
        >
          {topText}
        </div>
        <div className={classes.bottomTextContainer}>{bottomText}</div>
      </div>
    </div>
  );
}

const useAAIconStyles = makeStyles(() =>
  createStyles({
    iconWrapper: {
      minHeight: '4rem',
      height: '100%',
      borderRadius: '2px 0 0 2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerContainer: {
      width: '2.1em',
      borderRadius: '2px',
      display: 'flex',
      flexDirection: 'column',
    },
    topTextContainer: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '13px',
      lineHeight: '21px',
    },
    bottomTextContainer: {
      textAlign: 'center',
      fontSize: '9px',
      lineHeight: '21px',
    },
  }),
);

export default AAIcon;
