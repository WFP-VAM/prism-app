import { BarChartOutlined, GetApp } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { appConfig } from 'config';
import { AAWindowKeys } from 'config/utils';
import {
  AAFiltersSelector,
  AAMonitoredDistrictsSelector,
  AARenderedDistrictsSelector,
  AAWindowRangesSelector,
  setAASelectedDistrict,
  setAAView,
} from 'context/anticipatoryAction/AADroughtStateSlice';
import { AAView } from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { useSafeTranslation } from 'i18n';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentDateTimeForUrl } from 'utils/date-utils';
import { getAADroughtUrl } from 'utils/url-utils';

import { aaCommonSx, aaHomeTableSx } from '../../aaPanelStyles';
import { AADataSeverityOrder, getAAIcon } from '../utils';
import { getRowCategories } from '../utils/countryConfig';

interface AreaTagProps {
  name: string;
  isNew: boolean;
  onClick: (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

function AreaTag({ name, isNew, onClick }: AreaTagProps) {
  const { t } = useSafeTranslation();

  return (
    <Box
      component="button"
      type="button"
      sx={aaHomeTableSx.areaTagWrapper}
      onClick={onClick}
    >
      <Typography>{t(name)}</Typography>
      {isNew && <Box sx={aaCommonSx.newTag}>{t('NEW')}</Box>}
    </Box>
  );
}

export interface RowProps {
  iconContent: React.ReactNode;
  windows: AreaTagProps[][];
  header?: string[];
}

function Row({ iconContent, windows, header }: RowProps) {
  const { t } = useSafeTranslation();

  if (header) {
    return (
      <Box sx={{ ...aaHomeTableSx.rowWrapper, height: '1.5rem' }}>
        <Box sx={aaHomeTableSx.iconCol}>{iconContent}</Box>
        {header.map(name => (
          <Box
            key={name}
            sx={{
              width:
                header.length > 1 ? 'calc(50% - 1.75rem)' : 'calc(100% - 3rem)',
            }}
          >
            <Typography variant="h4" sx={aaCommonSx.windowHeader}>
              {t(name)}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={aaHomeTableSx.rowWrapper}>
      <Box sx={aaHomeTableSx.iconCol}>{iconContent}</Box>
      {windows.map((col, index) => {
        // we may have 2 entries for multiple indexes
        const unique = [...new Map(col.map(x => [x.name, x])).values()];
        return (
          <Box
            // we can actually use the index as key here, since we know each index is a window

            key={index}
            sx={{
              width:
                windows.length > 1
                  ? 'calc(50% - 1.75rem)'
                  : 'calc(100% - 3rem)',
            }}
          >
            <Box sx={aaHomeTableSx.windowBackground}>
              <Box sx={aaHomeTableSx.tagWrapper}>
                {unique.map(x => (
                  <AreaTag key={x.name} {...x} />
                ))}
                {unique.length === 0 && (
                  <Typography sx={aaHomeTableSx.emptyText}>
                    ({t('no district')})
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

const rowCategories = getRowCategories();

type ExtendedRowProps = RowProps & { id: number | 'na' | 'ny' };

interface HomeTableProps {
  dialogs: {
    text: string;
    onclick: () => void;
  }[];
}

function HomeTable({ dialogs }: HomeTableProps) {
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
      <Box sx={aaHomeTableSx.tableWrapper}>
        {rows.map(({ id, ...r }) => (
          <Row key={id} {...r} />
        ))}
      </Box>
      <Box sx={aaCommonSx.footerWrapper}>
        <Box sx={aaCommonSx.footerActionsWrapper}>
          {homeButtons.map(({ text, ...rest }) => (
            <Button
              key={text}
              sx={aaCommonSx.footerButton}
              variant="outlined"
              fullWidth
              {...rest}
            >
              <Typography>{t(text)}</Typography>
            </Button>
          ))}
        </Box>
        <Box sx={aaCommonSx.footerDialogsWrapper}>
          {dialogs.map(dialog => (
            <Typography
              key={dialog.text}
              sx={aaCommonSx.footerDialog}
              component="button"
              onClick={() => dialog.onclick()}
            >
              {t(dialog.text)}
            </Typography>
          ))}
        </Box>
      </Box>
    </>
  );
}

export default HomeTable;
