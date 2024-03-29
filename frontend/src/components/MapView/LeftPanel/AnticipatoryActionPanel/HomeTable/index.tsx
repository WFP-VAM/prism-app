import { Typography, createStyles, makeStyles } from '@material-ui/core';
import { useSafeTranslation } from 'i18n';
import { borderGray, gray } from 'muiTheme';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  AACategoryType,
  AAPhaseType,
} from 'context/anticipatoryActionStateSlice/types';
import { AAWindowKeys } from 'config/utils';
import {
  AAFiltersSelector,
  AARenderedDistrictsSelector,
  setAASelectedDistrict,
} from 'context/anticipatoryActionStateSlice';
import { setPanelSize } from 'context/leftPanelStateSlice';
import { PanelSize } from 'config/types';
import { AADataSeverityOrder, getAAIcon } from '../utils';

interface AreaTagProps {
  name: string;
  isNew: boolean;
  onClick: (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

function AreaTag({ name, isNew, onClick }: AreaTagProps) {
  const classes = useAreaTagStyles();
  return (
    <button type="button" className={classes.areaTagWrapper} onClick={onClick}>
      <Typography>{name}</Typography>
      {isNew && <div className={classes.newTag}>NEW</div>}
    </button>
  );
}

const useAreaTagStyles = makeStyles(() =>
  createStyles({
    areaTagWrapper: {
      border: `1px solid ${borderGray}`,
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
    newTag: {
      height: '2em',
      padding: '0 0.5em',
      color: 'white',
      background: '#A4A4A4',
      fontSize: '10px',
      borderRadius: '32px',
      display: 'flex',
      alignItems: 'center',
    },
  }),
);

export interface RowProps {
  iconContent: React.ReactNode;
  windows: AreaTagProps[][];
  header?: string[];
}

function Row({ iconContent, windows, header }: RowProps) {
  const classes = useRowStyles();
  const { t } = useSafeTranslation();

  if (header) {
    return (
      <div className={classes.rowWrapper} style={{ height: '1.5rem' }}>
        <div className={classes.iconCol}>{iconContent}</div>
        {header.map(name => (
          <div
            key={name}
            style={{
              width:
                header.length > 1 ? 'calc(50% - 1.75rem)' : 'calc(100% - 3rem)',
            }}
          >
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
      {windows.map((col, index) => {
        // we may have 2 entries for multiple indexes
        const unique = [...new Map(col.map(x => [x.name, x])).values()];
        return (
          <div
            // we can actually use the index as key here, since we know each index is a window
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            style={{
              width:
                windows.length > 1
                  ? 'calc(50% - 1.75rem)'
                  : 'calc(100% - 3rem)',
            }}
          >
            <div className={classes.windowBackground}>
              <div className={classes.tagWrapper}>
                {unique.map(x => (
                  <AreaTag key={x.name} {...x} />
                ))}
                {unique.length === 0 && (
                  <Typography className={classes.emptyText}>
                    ({t('no district')})
                  </Typography>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const useRowStyles = makeStyles(() =>
  createStyles({
    rowWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: '0.125rem 0.5rem',
    },
    iconCol: { width: '3rem', minHeight: '4rem' },
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '0.5rem',
    },
    emptyText: {
      color: borderGray,
    },
  }),
);

const rowCategories: {
  category: AACategoryType;
  phase: AAPhaseType;
}[] = [
  { category: 'Severe', phase: 'Set' },
  { category: 'Severe', phase: 'Ready' },
  { category: 'Moderate', phase: 'Set' },
  { category: 'Moderate', phase: 'Ready' },
  { category: 'Mild', phase: 'Set' },
  { category: 'Mild', phase: 'Ready' },
  { category: 'na', phase: 'na' },
  { category: 'ny', phase: 'ny' },
];

type ExtendedRowProps = RowProps & { id: number | 'na' | 'ny' };

function HomeTable() {
  const classes = useHomeTableStyles();
  const dispatch = useDispatch();
  const { selectedWindow, categories } = useSelector(AAFiltersSelector);
  const renderedDistricts = useSelector(AARenderedDistrictsSelector);

  React.useEffect(() => {
    dispatch(setPanelSize(PanelSize.medium));
  }, [dispatch]);

  const headerRow: ExtendedRowProps = {
    id: -1,
    iconContent: null,
    windows: selectedWindow === 'All' ? AAWindowKeys.map(x => []) : [[]],
    header: selectedWindow === 'All' ? [...AAWindowKeys] : [selectedWindow],
  };

  const districtRows: ExtendedRowProps[] = React.useMemo(
    () =>
      rowCategories
        .filter(x => categories[x.category])
        .map(x => {
          const getWinData = (win: typeof AAWindowKeys[number]) =>
            Object.entries(renderedDistricts[win])
              .map(([district, distData]) => {
                return distData.map(dist => {
                  if (dist.category === x.category && dist.phase === x.phase) {
                    return {
                      name: district,
                      isNew: dist.isNew,
                      onClick: () => dispatch(setAASelectedDistrict(district)),
                    };
                  }
                  return undefined;
                });
              })
              .flat()
              .filter(y => y !== undefined);

          return {
            id: AADataSeverityOrder(x.category, x.phase),
            iconContent: getAAIcon(x.category, x.phase),
            windows:
              selectedWindow === 'All'
                ? AAWindowKeys.map(winKey => getWinData(winKey))
                : [getWinData(selectedWindow)],
          } as any;
        }),
    [categories, dispatch, renderedDistricts, selectedWindow],
  );

  const rows: ExtendedRowProps[] = [headerRow, ...districtRows];

  return (
    <div className={classes.tableWrapper}>
      {rows.map(({ id, ...r }) => (
        <Row key={id} {...r} />
      ))}
    </div>
  );
}

const useHomeTableStyles = makeStyles(() =>
  createStyles({
    tableWrapper: {
      display: 'flex',
      flexDirection: 'column',
      width: PanelSize.medium,
      background: gray,
      padding: '0.5rem 0',
      overflow: 'scroll',
    },
  }),
);

export default HomeTable;
