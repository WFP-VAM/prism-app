import {
  Tooltip,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { gray } from 'muiTheme';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPanelSize } from 'context/leftPanelStateSlice';
import { PanelSize } from 'config/types';
import { AnticipatoryActionDataRow } from 'context/anticipatoryActionStateSlice/types';
import { AAWindowKeys } from 'config/utils';
import {
  AADataSelector,
  AAFiltersSelector,
  AASelectedDistrictSelector,
} from 'context/anticipatoryActionStateSlice';
import { useSafeTranslation } from 'i18n';
import { AADataSeverityOrder, getAAIcon } from '../utils';
import {
  Action,
  getActionsByPhaseCategoryAndWindow,
} from './ActionsModal/actions';
import ActionsModal from './ActionsModal';
import { districtViewTransform } from './utils';

interface WindowColumnProps {
  win: typeof AAWindowKeys[number];
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
  const classes = useWindowColumnStyles();
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
    <div className={classes.windowWrapper}>
      <div style={{ textAlign: 'center' }}>
        <Typography variant="h3" className={classes.headerText}>
          {win}
        </Typography>
      </div>
      {!hasWindowData && (
        <Typography variant="h3" className={classes.noDataText}>
          {t('No data')}
        </Typography>
      )}
      {hasWindowData && (
        <div className={classes.tableWrapper}>
          <div className={classes.headRowWrapper}>
            {Object.entries(transformed?.months || {}).map(x => (
              <div key={x[0]} className={classes.headColumn}>
                <Typography className={classes.monthText}>{x[1]}</Typography>
              </div>
            ))}
          </div>
          {
            // eslint-disable-next-line fp/no-mutating-methods
            Object.entries(extendedTransformed)
              .sort((a, b) => {
                if (a[0] > b[0]) {
                  return -1;
                }
                if (a[0] < b[0]) {
                  return 1;
                }
                return 0;
              })
              .map(x => (
                <div key={x[0]} className={classes.rowWrapper}>
                  {Object.entries(transformed?.months || {}).map(y => {
                    const elem = x[1].find(z => z.date === y[0]);
                    if (!elem) {
                      return <div key={y[0]} className={classes.column} />;
                    }
                    return (
                      <div key={y[0]} className={classes.column}>
                        <div className={classes.iconWrapper}>
                          {getAAIcon(elem.category, elem.phase)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
          }
        </div>
      )}
      {hasWindowData && (
        <div className={classes.actionsWrapper}>
          <div style={{ textAlign: 'center' }}>
            <Typography variant="h3">ACTIONS</Typography>
          </div>
          <div className={classes.actionBoxesWrapper}>
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
                <button
                  key={x}
                  type="button"
                  id={String(x)}
                  className={classes.actionBox}
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
                    <Tooltip key={action.name} title={action.name}>
                      <div>{action.icon}</div>
                    </Tooltip>
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const useWindowColumnStyles = makeStyles(() =>
  createStyles({
    windowWrapper: {
      display: 'flex',
      flexDirection: 'column',
      padding: '0.5rem 0.25rem',
    },
    tableWrapper: { display: 'flex', flexDirection: 'column', gap: '2px' },
    rowWrapper: {
      display: 'flex',
      flexDirection: 'row',
      minHeight: '3rem',
      background: 'white',
    },
    headRowWrapper: {
      display: 'flex',
      flexDirection: 'row',
      minHeight: '2.5rem',
      background: 'white',
    },
    headColumn: {
      width: '5.2rem',
      padding: '0.1rem 0.25rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    column: {
      width: '5.2rem',
      height: '3.2rem',
      padding: '0.1rem 0.25rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: {
      fontWeight: 'bold',
      textTransform: 'uppercase',
      height: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthText: {
      background: gray,
      borderRadius: '4px',
      textAlign: 'center',
      textTransform: 'uppercase',
      lineHeight: '2rem',
      width: '100%',
    },
    iconWrapper: {
      width: '100%',
      height: '100%',
    },
    actionsWrapper: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      padding: '0.5rem 0',
    },
    actionBoxesWrapper: {
      display: 'flex',
      flexDirection: 'row',
    },
    actionBox: {
      height: '6.2rem',
      width: '5.2rem',
      margin: '0.1rem 0.25rem',
      background: 'white',
      borderRadius: '4px',
      color: 'black',
      display: 'flex',
      flexWrap: 'wrap',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
      paddingTop: '0.2rem',
      border: 'none',
    },
    noDataText: {
      margin: 'auto',
    },
  }),
);

function DistrictView() {
  const dispatch = useDispatch();
  const classes = useDistrictViewStyles();
  const { selectedWindow } = useSelector(AAFiltersSelector);
  const rawAAData = useSelector(AADataSelector);
  const aaFilters = useSelector(AAFiltersSelector);
  const selectedDistrict = useSelector(AASelectedDistrictSelector);
  const [actionsModalOpen, setActionsModalOpen] = React.useState<boolean>(
    false,
  );
  const [modalActions, setModalActions] = React.useState<Action[]>([]);

  const windows = selectedWindow === 'All' ? AAWindowKeys : [selectedWindow];
  const transformed = windows.map(x =>
    districtViewTransform(rawAAData[x][selectedDistrict], aaFilters),
  );
  const rowKeys = transformed
    .map(x => Object.keys(x?.transformed || {}))
    .flat();

  React.useEffect(() => {
    dispatch(setPanelSize(PanelSize.undef));
  }, [dispatch]);

  return (
    <div className={classes.root}>
      <ActionsModal
        open={actionsModalOpen}
        onClose={() => setActionsModalOpen(false)}
        actions={modalActions}
      />
      <div className={classes.districtViewWrapper}>
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
      </div>
    </div>
  );
}

const useDistrictViewStyles = makeStyles(() =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      background: gray,
      overflow: 'scroll',
    },
    districtViewWrapper: {
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      background: gray,
      overflow: 'scroll',
      justifyContent: 'space-around',
    },
  }),
);

export default DistrictView;