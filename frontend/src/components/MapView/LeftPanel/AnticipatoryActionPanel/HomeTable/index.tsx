import { Typography, createStyles, makeStyles } from '@material-ui/core';
import { useSafeTranslation } from 'i18n';
import { borderGray, gray } from 'muiTheme';
import React from 'react';
import {
  AACategoryType,
  AAPhaseType,
  AnticipatoryActionData,
  AnticipatoryActionDataSelector,
  AnticipatoryActionWindowsSelector,
} from 'context/anticipatoryActionStateSlice';
import { useSelector } from 'react-redux';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import { AADataSeverityOrder, getAAIcon } from '../utils';

interface AreaTagProps {
  name: string;
  isNew: boolean;
}

function AreaTag({ name, isNew }: AreaTagProps) {
  const classes = useAreaTagStyles();
  return (
    <div className={classes.areaTagWrapper}>
      <Typography>{name}</Typography>
      {isNew && <div className={classes.newTag}>NEW</div>}
    </div>
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
      <div className={classes.rowWrapper}>
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
      {windows.map((col, index) => (
        <div
          // we can actually use the index as key here, since we know each index is a window
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          style={{
            width:
              windows.length > 1 ? 'calc(50% - 1.75rem)' : 'calc(100% - 3rem)',
          }}
        >
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
      justifyContent: 'space-between',
      padding: '0.125rem 0.5rem',
    },
    iconCol: { width: '3rem' },
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
  selectedWindow: string;
}

function getDistrictData(
  data: {
    [k: string]: AnticipatoryActionData[];
  },
  date: string,
  AAwindow: string,
  category: AnticipatoryActionData['category'],
  phase: AnticipatoryActionData['phase'],
) {
  return Object.entries(data)
    .map(([district, districtData]) => {
      const validData = districtData.filter(
        x =>
          x.probability !== 'NA' &&
          Number(x.probability) >= Number(x.trigger) &&
          AAwindow === x.windows,
      );

      // NA: There is date for this district, but all probabilities are under the trigger
      if (category === 'na') {
        const validDataForDate = validData.filter(x => x.date === date);
        if (validDataForDate.length > 0) {
          return undefined;
        }
        const dataExistForDate = !!districtData.find(
          x => AAwindow === x.windows && x.date === date,
        );
        if (!dataExistForDate) {
          return undefined;
        }
        return { name: district, isNew: false };
      }

      // NY: is monitored, but no entry for this date
      if (category === 'ny') {
        const dataForDate = districtData.filter(
          x => x.date === date && x.windows === AAwindow,
        );
        if (dataForDate.length > 0) {
          return undefined;
        }
        return { name: district, isNew: false };
      }

      const dates = [...new Set(validData.map(x => x.date))];
      const dateIndex = dates.findIndex(x => x === date);
      if (dateIndex < 0) {
        return undefined;
      }
      const current = validData.find(
        x => x.category === category && x.phase === phase && x.date === date,
      );
      if (!current) {
        return undefined;
      }
      let isNew = false;
      if (dateIndex - 1 >= 0) {
        const prevDateData = validData.filter(
          x => x.date === dates[dateIndex - 1],
        );
        const prevDateDataSev = Math.max(
          ...prevDateData.map(x => AADataSeverityOrder(x.category, x.phase)),
        );
        const currentSev = AADataSeverityOrder(current.category, current.phase);
        // TODO: is this accurate?
        // eslint-disable-next-line fp/no-mutation
        isNew = currentSev > prevDateDataSev;
      }
      return { name: district, isNew };
    })
    .filter((x): x is AreaTagProps => x !== undefined);
}

const rowCategories: {
  category: AACategoryType;
  phase: AAPhaseType;
}[] = [
  { category: 'Severo', phase: 'Set' },
  { category: 'Severo', phase: 'Ready' },
  { category: 'Moderado', phase: 'Set' },
  { category: 'Moderado', phase: 'Ready' },
  { category: 'Leve', phase: 'Set' },
  { category: 'Leve', phase: 'Ready' },
  { category: 'na', phase: 'na' },
  { category: 'ny', phase: 'ny' },
];

type ExtendedRowProps = RowProps & { id: number | 'na' | 'ny' };

function HomeTable({ selectedWindow }: HomeTableProps) {
  const classes = useHomeTableStyles();
  const RawAAData = useSelector(AnticipatoryActionDataSelector);
  const windows = useSelector(AnticipatoryActionWindowsSelector);

  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  const date = getFormattedDate(selectedDate, DateFormat.Default) as string;

  // TODO - LEVE is "MILD" and should be added as a new category, see Figma.

  // TODO: implement NA and NY
  // NA means that no proba is above the trigger for that district
  // NY means that the district is not monitored yet (no rows for the district)
  // const na = React.useMemo(() => [], []);
  // const ny = React.useMemo(() => [], []);

  // -1 means all
  const selectedWindowIndex = windows.findIndex(x => x === selectedWindow);

  const headerRow: ExtendedRowProps = {
    id: -1,
    iconContent: null,
    windows: selectedWindowIndex === -1 ? windows.map(x => []) : [[]],
    header:
      selectedWindowIndex === -1
        ? [...windows]
        : [windows[selectedWindowIndex]],
  };

  const districtRows: ExtendedRowProps[] = rowCategories.map(r => ({
    id: AADataSeverityOrder(r.category, r.phase),
    iconContent: getAAIcon(r.category, r.phase),
    windows:
      selectedWindowIndex === -1
        ? windows.map(x =>
            getDistrictData(RawAAData, date, x, r.category, r.phase),
          )
        : [
            getDistrictData(
              RawAAData,
              date,
              selectedWindow,
              r.category,
              r.phase,
            ),
          ],
  }));

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
      width: '100%',
      background: gray,
      padding: '0.5rem 0',
    },
  }),
);

export default HomeTable;
