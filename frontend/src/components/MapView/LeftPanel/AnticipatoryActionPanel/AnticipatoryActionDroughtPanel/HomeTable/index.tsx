import {Button,
  Typography} from '@mui/material';
import { useSafeTranslation } from 'i18n';
import { makeStyles, createStyles } from '@mui/styles';
import { borderGray, grey, lightGrey } from 'muiTheme';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AAView } from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { AAWindowKeys } from 'config/utils';
import {
  AAFiltersSelector,
  AAMonitoredDistrictsSelector,
  AARenderedDistrictsSelector,
  AAWindowRangesSelector,
  setAASelectedDistrict,
  setAAView,
} from 'context/anticipatoryAction/AADroughtStateSlice';
import { GetApp, BarChartOutlined } from '@mui/icons-material';
import { appConfig } from 'config';
import { PanelSize } from 'config/types';
import { getCurrentDateTimeForUrl } from 'utils/date-utils';
import { getAADroughtUrl } from 'utils/url-utils';
import { AADataSeverityOrder, getAAIcon } from '../utils';
import { useAACommonStyles } from '../../utils';
import { getRowCategories } from '../utils/countryConfig';

interface AreaTagProps {
  name: string;
  isNew: boolean;
  onClick: (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

function AreaTag({ name, isNew, onClick }: AreaTagProps) {
  const classes = useAreaTagStyles();
  const commonClasses = useAACommonStyles();
  const { t } = useSafeTranslation();

  return (
    <button type="button" className={classes.areaTagWrapper} onClick={onClick}>
      <Typography>{t(name)}</Typography>
      {isNew && <div className={commonClasses.newTag}>{t('NEW')}</div>}
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
  }),
);

export interface RowProps {
  iconContent: React.ReactNode;
  windows: AreaTagProps[][];
  header?: string[];
}

function Row({ iconContent, windows, header }: RowProps) {
  const classes = useRowStyles();
  const commonClasses = useAACommonStyles();
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
            <Typography variant="h4" className={commonClasses.windowHeader}>
              {t(name)}
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
      paddingRight: 0,
    },
    iconCol: { width: '3rem', minHeight: '4rem' },
    windowBackground: {
      background: 'white',
      height: '100%',
      width: '100%',
    },
    tagWrapper: {
      padding: '0.5rem 0.5rem',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: '0.5em',
    },
    emptyText: {
      color: borderGray,
    },
  }),
);

const rowCategories = getRowCategories();

type ExtendedRowProps = RowProps & { id: number | 'na' | 'ny' };

interface HomeTableProps {
  dialogs: {
    text: string;
    onclick: () => void;
  }[];
}

function HomeTable({ dialogs }: HomeTableProps) {
  const classes = useHomeTableStyles();
  const commonClasses = useAACommonStyles();
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const { selectedWindow, categories } = useSelector(AAFiltersSelector);
  const renderedDistricts = useSelector(AARenderedDistrictsSelector);
  const monitoredDistrict = useSelector(AAMonitoredDistrictsSelector);
  const { 'Window 2': window2Range } = useSelector(AAWindowRangesSelector);

  const filename = getAADroughtUrl(appConfig)?.split('/').at(-1);

  const homeButtons = [
    {
      startIcon: <GetApp />,
      text: 'Assets',
      component: 'a',
      href: `${getAADroughtUrl(appConfig)}?date=${getCurrentDateTimeForUrl()}`,
      download: `${window2Range?.end}-${filename}`,
    },
    {
      startIcon: <BarChartOutlined />,
      text: 'Forecast',
      onClick: () => {
        dispatch(setAASelectedDistrict(monitoredDistrict[0]?.name));
        dispatch(setAAView(AAView.Forecast));
      },
    },
  ];

  const headerRow: ExtendedRowProps = {
    id: -1,
    iconContent: null,
    windows: selectedWindow === 'All' ? AAWindowKeys.map(_x => []) : [[]],
    header: selectedWindow === 'All' ? [...AAWindowKeys] : [selectedWindow],
  };

  const districtRows: ExtendedRowProps[] = React.useMemo(
    () =>
      rowCategories
        .filter(x => categories[x.category])
        .map(x => {
          const getWinData = (win: (typeof AAWindowKeys)[number]) =>
            Object.entries(renderedDistricts[win])
              .map(([district, distData]) =>
                distData.map(dist => {
                  if (dist.category === x.category && dist.phase === x.phase) {
                    return {
                      name: district,
                      isNew: dist.isNew,
                      onClick: () => {
                        dispatch(setAASelectedDistrict(district));
                        dispatch(setAAView(AAView.District));
                      },
                    };
                  }
                  return undefined;
                }),
              )
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
    <>
      <div className={classes.tableWrapper}>
        {rows.map(({ id, ...r }) => (
          <Row key={id} {...r} />
        ))}
      </div>
      <div className={commonClasses.footerWrapper}>
        <div className={commonClasses.footerActionsWrapper}>
          {homeButtons.map(({ text, ...rest }) => (
            <Button
              key={text}
              className={commonClasses.footerButton}
              variant="outlined"
              fullWidth
              {...rest}
            >
              <Typography>{t(text)}</Typography>
            </Button>
          ))}
        </div>
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
    </>
  );
}

const useHomeTableStyles = makeStyles(() =>
  createStyles({
    tableWrapper: {
      display: 'flex',
      flexDirection: 'column',
      width: PanelSize.medium,
      background: lightGrey,
      padding: '0.5rem 0',
      overflowY: 'scroll',
      borderBottom: `1px solid ${grey}`,
      // Browser-specific properties for forcing scrollbar visibility and styling
      '&::-webkit-scrollbar': {
        width: '0.5rem',
        height: '0.5rem',
      },
      '&::-webkit-scrollbar-thumb': {
        background: '#888',
        borderRadius: '0.25rem', // Rounded corners for the scrollbar thumb
      },
      '&::-webkit-scrollbar-thumb:hover': {
        background: '#555',
      },
      '&::-webkit-scrollbar-track': {
        borderRadius: '0.25rem', // Rounded corners for the scrollbar track
      },
    },
  }),
);

export default HomeTable;
