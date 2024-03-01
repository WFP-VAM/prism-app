import { Typography, createStyles, makeStyles } from '@material-ui/core';
import { useSafeTranslation } from 'i18n';
import { borderGray, gray } from 'muiTheme';
import React from 'react';
import { Phase } from '../utils';

interface AreaTagProps {
  name: string;
  isNew: boolean;
}

function AreaTag({ name, isNew }: AreaTagProps) {
  return (
    <div
      style={{
        border: `1px solid ${borderGray}`,
        height: '2rem',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25em',
        padding: '0 0.25em',
      }}
    >
      <Typography>{name}</Typography>
      {isNew && (
        <div
          style={{
            height: '2em',
            padding: '0 0.5em',
            color: 'white',
            background: '#A4A4A4',
            fontSize: '10px',
            borderRadius: '32px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          NEW
        </div>
      )}
    </div>
  );
}

export interface RowProps {
  id: Phase | 'header';
  iconContent: React.ReactNode;
  windows: [AreaTagProps[], AreaTagProps[]];
  header?: string[];
}

function Row({ iconContent, windows, header }: RowProps) {
  const classes = useRowStyles();
  const { t } = useSafeTranslation();

  if (header) {
    return (
      <div className={classes.rowWrapper}>
        <div className={classes.iconCol}>{iconContent}</div>
        {header.map(name => (
          <div key={name} className={classes.windowWrapper}>
            <Typography variant="h3" className={classes.headerText}>
              {name}
            </Typography>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={classes.rowWrapper}>
      <div className={classes.iconCol}>{iconContent}</div>
      {windows.map((col, index) => (
        // we can actually use the index as key here, since we know each index is a window
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className={classes.windowWrapper}>
          <div className={classes.windowBackground}>
            <div className={classes.tagWrapper}>
              {col.map(x => (
                <AreaTag key={x.name} {...x} />
              ))}
              {col.length === 0 && (
                <Typography className={classes.emptyText}>
                  ({t('no district')})
                </Typography>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const useRowStyles = makeStyles(() =>
  createStyles({
    rowWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: '0.125rem 0.5rem',
    },
    iconCol: { width: '3rem' },
    windowWrapper: { width: 'calc(50% - 1.75rem)' },
    windowBackground: {
      background: 'white',
      height: '100%',
      width: '100%',
    },
    tagWrapper: {
      padding: '1rem 0.5rem',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: '0.5em',
    },
    headerText: {
      fontWeight: 'bold',
      textTransform: 'uppercase',
      minHeight: '3rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      color: borderGray,
    },
  }),
);

interface HomeTableProps {
  rows: RowProps[];
}

function HomeTable({ rows }: HomeTableProps) {
  const classes = useHomeTableStyles();

  return (
    <div className={classes.tableWrapper}>
      {rows.map(r => (
        <Row key={r.id} {...r} />
      ))}
    </div>
  );
}

const useHomeTableStyles = makeStyles(() =>
  createStyles({
    tableWrapper: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      background: gray,
      padding: '0.5rem 0',
    },
  }),
);

export default HomeTable;
