import { Typography, createStyles, makeStyles } from '@material-ui/core';
import { useSafeTranslation } from 'i18n';
import { borderGray, gray } from 'muiTheme';
import React from 'react';
import {
  AACategoryFiltersSelector,
  AASelectedWindowSelector,
  AnticipatoryActionDataSelector,
  setSelectedDateData,
} from 'context/anticipatoryActionStateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import {
  AACategoryType,
  AAPhaseType,
  AnticipatoryActionData,
  AnticipatoryActionDataRow,
} from 'context/anticipatoryActionStateSlice/types';
import { AAWindowKeys } from 'config/utils';
import {
  getAAAvailableDatesCombined,
  getRequestDate,
} from 'utils/server-utils';
import { availableDatesSelector } from 'context/serverStateSlice';
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

function getDistrictData(
  data: AnticipatoryActionData,
  date: string,
  category: AnticipatoryActionDataRow['category'],
  phase: AnticipatoryActionDataRow['phase'],
) {
  return Object.entries(data)
    .map(([district, districtData]) => {
      const validData = districtData.filter(
        x =>
          x.probability !== 'NA' &&
          Number(x.probability) >= Number(x.trigger) &&
          x.date <= date,
      );

      // NA: There is a date for this district, but all probabilities are under the trigger
      if (category === 'na') {
        const dataExistForDate = !!validData.find(x => x.date === date);
        if (!dataExistForDate) {
          return { name: district, isNew: false };
        }
        return undefined;
      }

      // NY: is monitored, but there are no entry until this date
      if (category === 'ny') {
        if (districtData.filter(x => x.date <= date).length > 0) {
          return undefined;
        }
        return { name: district, isNew: false };
      }

      const categoryData = validData.filter(x => x.category === category);

      const current = categoryData.find(
        x => x.category === category && x.phase === phase && x.date === date,
      );

      if (phase === 'Ready') {
        if (current) {
          return { name: district, isNew: true };
        }
        return undefined;
      }

      // eslint-disable-next-line fp/no-mutating-methods
      const dates = [...new Set(districtData.map(x => x.date))].sort();
      const dateIndex = dates.findIndex(x => x === date);

      if (dates.length === 0 || dateIndex === 0) {
        return undefined;
      }

      const previousDate =
        dateIndex === -1 ? dates.slice(-1)[0] : dates[dateIndex - 1];

      const previous = categoryData.find(
        x =>
          x.category === category &&
          x.phase === 'Ready' &&
          x.date === previousDate,
      );

      if (phase === 'Set') {
        if (current && previous) {
          return { name: district, isNew: true };
        }

        // Check if the district was in SET mode previously for this category
        // If it is the case, we keep the SET status for this district until the end of the window
        const previouslySet = getDistrictData(
          { [district]: data[district] },
          previousDate,
          category,
          'Set',
        ).find(x => x.name === district);
        if (previouslySet) {
          return { name: district, isNew: false };
        }
        return undefined;
      }

      return undefined;
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

function HomeTable() {
  const classes = useHomeTableStyles();
  const dispatch = useDispatch();
  const RawAAData = useSelector(AnticipatoryActionDataSelector);
  const selectedWindow = useSelector(AASelectedWindowSelector);
  const categoryFilters = useSelector(AACategoryFiltersSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);

  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  const layerAvailableDates = getAAAvailableDatesCombined(serverAvailableDates);
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);
  const date = getFormattedDate(queryDate, DateFormat.Default) as string;

  const headerRow: ExtendedRowProps = {
    id: -1,
    iconContent: null,
    windows: selectedWindow === 'All' ? AAWindowKeys.map(x => []) : [[]],
    header: selectedWindow === 'All' ? [...AAWindowKeys] : [selectedWindow],
  };

  const dataForRows: {
    'Window 1': AreaTagProps[];
    'Window 2': AreaTagProps[];
    category: 'ny' | 'na' | 'Leve' | 'Moderado' | 'Severo';
    phase: 'ny' | 'na' | 'Ready' | 'Set';
  }[] = React.useMemo(() => {
    // Calculate initial data for each category and phase without filtering 'na' category
    const initialRows = rowCategories.map(r => {
      const windowData = AAWindowKeys.map(x => [
        x,
        getDistrictData(RawAAData[x] || {}, date, r.category, r.phase),
      ]);
      return {
        ...r,
        ...Object.fromEntries(windowData),
      };
    });

    // Find all district names that are not 'na' to prepare for filtering
    const allDistrictsExceptNa = new Set(
      initialRows
        .filter(r => r.category !== 'na')
        .flatMap(r =>
          AAWindowKeys.flatMap(x =>
            r[x].map((districtData: AreaTagProps) => districtData.name),
          ),
        ),
    );

    // Apply filtering for 'na' category
    const finalRows = initialRows.map(row => {
      if (row.category === 'na') {
        AAWindowKeys.forEach(x => {
          // eslint-disable-next-line fp/no-mutation, no-param-reassign
          row[x] = row[x].filter(
            (districtData: AreaTagProps) =>
              !allDistrictsExceptNa.has(districtData.name),
          );
        });
      }
      return row;
    });

    return finalRows;
  }, [RawAAData, date]);

  const shouldRenderRows = dataForRows.filter(x => {
    switch (x.category) {
      case 'na':
      case 'ny':
        return true;

      case 'Leve':
      case 'Moderado':
      case 'Severo':
        return categoryFilters[x.category];

      default:
        throw new Error(`Invalid category ${x.category}`);
    }
  });

  const districtRows: ExtendedRowProps[] = React.useMemo(
    () =>
      shouldRenderRows.map(r => ({
        id: AADataSeverityOrder(r.category, r.phase),
        iconContent: getAAIcon(r.category, r.phase),
        windows:
          selectedWindow === 'All'
            ? AAWindowKeys.map(x => r[x])
            : [r[selectedWindow]],
      })),
    [selectedWindow, shouldRenderRows],
  );

  React.useEffect(() => {
    const selectedDateData = dataForRows.reduce((acc, curr) => {
      AAWindowKeys.forEach(w => {
        const districts = curr[w].map(x => x.name);
        districts.forEach(dist => {
          const prev = acc.get(dist);
          const newItem = {
            district: dist,
            windows: w,
            category: curr.category,
            phase: curr.phase,
          };
          acc.set(dist, prev ? [...prev, newItem] : [newItem]);
        });
      });

      return acc;
    }, new Map<string, Pick<AnticipatoryActionDataRow, 'district' | 'windows' | 'category' | 'phase'>[]>());

    dispatch(setSelectedDateData(Object.fromEntries(selectedDateData)));
  }, [dataForRows, dispatch]);

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
      overflow: 'scroll',
    },
  }),
);

export default HomeTable;
