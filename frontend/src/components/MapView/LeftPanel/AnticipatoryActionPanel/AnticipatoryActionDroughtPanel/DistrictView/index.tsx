import { ClearAll, Equalizer, Reply } from '@mui/icons-material';
import { Box, Button, Tooltip, Typography } from '@mui/material';
import { AAWindowKeys } from 'config/utils';
import {
  AADataSelector,
  AAFiltersSelector,
  AASelectedDistrictSelector,
  setAASelectedDistrict,
  setAAView,
} from 'context/anticipatoryAction/AADroughtStateSlice';
import {
  AAView,
  AnticipatoryActionDataRow,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { useSafeTranslation } from 'i18n';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { aaCommonSx, aaDistrictViewSx } from '../../aaPanelStyles';
import { AADataSeverityOrder, getAAIcon } from '../utils';
import ActionsModal from './ActionsModal';
import {
  Action,
  getActionsByPhaseCategoryAndWindow,
} from './ActionsModal/actions';
import { dateSorter, districtViewTransform } from './utils';

interface WindowColumnProps {
  win: (typeof AAWindowKeys)[number];
  transformed: ReturnType<typeof districtViewTransform>;
  rowKeys: string[];
  openActionsDialog: () => void;
  setModalActions: React.Dispatch<React.SetStateAction<Action[]>>;
}

function WindowColumn({
  win,
  transformed,
  rowKeys,
  openActionsDialog,
  setModalActions,
}: WindowColumnProps) {
  const { t } = useSafeTranslation();

  const extendedTransformed = {
    ...Object.fromEntries(
      rowKeys.map(x => [x, [] as AnticipatoryActionDataRow[]]),
    ),
    ...(transformed?.transformed || {}),
  };

  const allEntries = Object.values(transformed?.transformed || {}).flat();

  if (!transformed) {
    return null;
  }
  const hasWindowData = Object.keys(transformed.months).length > 0;

  return (
    <Box sx={aaDistrictViewSx.windowWrapper}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" sx={aaDistrictViewSx.headerText}>
          {t(win)}
        </Typography>
      </Box>
      {!hasWindowData && (
        <Typography variant="h3" sx={aaDistrictViewSx.noDataText}>
          {t('No data')}
        </Typography>
      )}
      {hasWindowData && (
        <Box sx={aaDistrictViewSx.tableWrapper}>
          <Box sx={aaDistrictViewSx.headRowWrapper}>
            {Object.entries(transformed?.months || {}).map(x => (
              <Box key={x[0]} sx={aaDistrictViewSx.headColumn}>
                <Typography sx={aaDistrictViewSx.monthText}>
                  {t(x[1])}
                </Typography>
              </Box>
            ))}
          </Box>
          {Object.entries(extendedTransformed)
            .sort(dateSorter)
            .map(x => (
              <Box key={x[0]} sx={aaDistrictViewSx.rowWrapper}>
                {Object.entries(transformed?.months || {}).map(y => {
                  const elem = x[1].find(z => z.date === y[0]);
                  if (!elem) {
                    return <Box key={y[0]} sx={aaDistrictViewSx.column} />;
                  }
                  return (
                    <Box key={y[0]} sx={aaDistrictViewSx.column}>
                      <Box sx={aaDistrictViewSx.iconWrapper}>
                        {getAAIcon(elem.category, elem.phase)}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ))}
        </Box>
      )}
      {hasWindowData && (
        <Box sx={aaDistrictViewSx.actionsWrapper}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3">{t('ACTIONS')}</Typography>
          </Box>
          <Box sx={aaDistrictViewSx.actionBoxesWrapper}>
            {Object.keys(transformed.months).map(x => {
              const dateData = allEntries.filter(y => y.date === x);
              const elem = dateData.reduce(
                (max, curr) =>
                  AADataSeverityOrder(max.category, max.phase) >
                  AADataSeverityOrder(curr.category, curr.phase)
                    ? max
                    : curr,
                dateData[0],
              );
              const actions = getActionsByPhaseCategoryAndWindow(
                elem.phase,
                elem.category,
                elem.window,
              );
              return (
                <Box
                  key={x}
                  component="button"
                  type="button"
                  id={String(x)}
                  sx={aaDistrictViewSx.actionBox}
                  style={{
                    justifyContent: actions.length <= 2 ? 'center' : undefined,
                    cursor: actions.length > 0 ? 'pointer' : undefined,
                  }}
                  onClick={() => {
                    if (actions.length === 0) {
                      return;
                    }
                    openActionsDialog();
                    setModalActions(actions);
                  }}
                >
                  {actions.map(action => (
                    // wrapping in div to show tooltip with FontAwesomeIcons
                    <Tooltip
                      key={action.name}
                      title={t(action.name) || action.name}
                    >
                      <div>{action.icon}</div>
                    </Tooltip>
                  ))}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}

interface DistrictViewProps {
  dialogs: {
    text: string;
    onclick: () => void;
  }[];
}

function DistrictView({ dialogs }: DistrictViewProps) {
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const { selectedWindow } = useSelector(AAFiltersSelector);
  const rawAAData = useSelector(AADataSelector);
  const aaFilters = useSelector(AAFiltersSelector);
  const selectedDistrict = useSelector(AASelectedDistrictSelector);
  const [actionsModalOpen, setActionsModalOpen] =
    React.useState<boolean>(false);
  const [modalActions, setModalActions] = React.useState<Action[]>([]);

  const districtButtons = [
    {
      icon: ClearAll,
      text: 'Timeline',
      onClick: () => dispatch(setAAView(AAView.Timeline)),
    },
    {
      icon: Equalizer,
      text: 'Forecast',
      onClick: () => dispatch(setAAView(AAView.Forecast)),
    },
    {
      icon: Reply,
      text: 'Summary',
      onClick: () =>
        dispatch(setAAView(AAView.Home)) && dispatch(setAASelectedDistrict('')),
    },
  ];

  const windows = selectedWindow === 'All' ? AAWindowKeys : [selectedWindow];
  const transformed = windows.map(x =>
    districtViewTransform(rawAAData[x][selectedDistrict], aaFilters),
  );
  const rowKeys = transformed
    .map(x => Object.keys(x?.transformed || {}))
    .flat();

  return (
    <>
      <Box sx={aaDistrictViewSx.root}>
        <ActionsModal
          open={actionsModalOpen}
          onClose={() => setActionsModalOpen(false)}
          actions={modalActions}
        />
        <Box sx={aaDistrictViewSx.districtViewWrapper}>
          {windows.map((win, index) => (
            <WindowColumn
              key={win}
              win={win}
              transformed={transformed[index]}
              rowKeys={rowKeys}
              openActionsDialog={() => setActionsModalOpen(true)}
              setModalActions={setModalActions}
            />
          ))}
        </Box>
      </Box>
      <Box sx={aaCommonSx.footerWrapper}>
        <Box sx={aaCommonSx.footerActionsWrapper}>
          {districtButtons.map(x => (
            <Button
              key={x.text}
              sx={aaCommonSx.footerButton}
              variant="outlined"
              fullWidth
              onClick={x.onClick}
              startIcon={<x.icon />}
            >
              <Typography>{t(x.text)}</Typography>
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

export default DistrictView;
