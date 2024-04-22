import { makeStyles, createStyles } from '@material-ui/core';
import {
  AACategoryType,
  AAPhaseType,
} from 'context/anticipatoryActionStateSlice/types';
import { useSafeTranslation } from 'i18n';
import React from 'react';
import { AACategoryPhaseMap, getAAColor } from './utils';

export interface AAIconLayoutProps {
  background?: string;
  topText: string;
  bottomText?: string;
  color: string;
  fillBackground: boolean;
}

function AAIconLayout({
  background,
  topText,
  bottomText,
  color,
  fillBackground,
}: AAIconLayoutProps) {
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

interface AAIconProps {
  category: AACategoryType;
  phase: AAPhaseType;
  forLayer?: boolean;
}

function AAIcon({ category, phase, forLayer }: AAIconProps) {
  const background = getAAColor(category, phase, forLayer);

  const categoryData = AACategoryPhaseMap[category];
  if (categoryData.iconProps) {
    const iconProps = forLayer
      ? { ...categoryData.iconProps, bottomText: undefined }
      : categoryData.iconProps;
    return (
      <AAIconLayout
        background={background}
        fillBackground={!forLayer}
        {...iconProps}
      />
    );
  }
  const phaseData = categoryData[phase];
  if (!phaseData) {
    throw new Error(`Icon not implemented: ${category}, ${phase}`);
  }
  return (
    <AAIconLayout
      background={background}
      fillBackground={!forLayer}
      {...phaseData.iconProps}
    />
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
      fontWeight: 400,
    },
  }),
);

export default AAIcon;
