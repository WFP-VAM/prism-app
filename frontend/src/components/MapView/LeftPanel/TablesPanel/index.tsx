import {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {LinearProgress,
  ListSubheader,
  MenuItem,
  TextField,
  Theme,
  Typography} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { createStyles, makeStyles } from '@mui/styles';
import {
  LayersCategoryType,
  MenuItemType,
  PanelSize,
  TableType,
  Panel,
} from 'config/types';
import { useSafeTranslation } from 'i18n';
import {
  getCurrentData as getTableData,
  getCurrentDefinition as getTableDefinition,
  getIsShowing as getTableIsShowing,
  isLoading as tableLoading,
  loadTable,
} from 'context/tableStateSlice';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import TablesActions from './TablesActions';
import DataTable from './DataTable';
import { tablesMenuItems } from '../utils';

const tableCategories = tablesMenuItems
  .map((menuItem: MenuItemType) => menuItem.layersCategories)
  .flat();

const tabPanelType = Panel.Tables;

const TablesPanel = memo(() => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const dataTableIsLoading = useSelector(tableLoading);
  const tableDefinition = useSelector(getTableDefinition);
  const tableShowing = useSelector(getTableIsShowing);
  const tableData = useSelector(getTableData);
  const tabValue = useSelector(leftPanelTabValueSelector);
  const [tableValue, setTableValue] = useState<string>('');
  const [showDataTable, setShowDataTable] = useState<boolean>(false);

  const { t } = useSafeTranslation();

  useEffect(() => {
    if (tabValue !== tabPanelType) {
      return;
    }

    if (!tableData || !tableDefinition || !tableShowing) {
      setShowDataTable(false);
      return;
    }
    setShowDataTable(true);
  }, [tabValue, tableData, tableDefinition, tableShowing]);

  const handleShowDataTable = useCallback((show: boolean) => {
    setShowDataTable(show);
  }, []);

  const renderedTablesActionsLoader = useMemo(() => {
    if (!dataTableIsLoading) {
      return null;
    }
    return <LinearProgress className={classes.linearProgress} />;
  }, [classes.linearProgress, dataTableIsLoading]);

  const renderedTablesActions = useMemo(() => {
    if (!tableDefinition || !tableData || !tableShowing) {
      return null;
    }
    return (
      <div
        className={classes.tablesActionsContainer}
        style={{
          width: PanelSize.medium,
        }}
      >
        {renderedTablesActionsLoader}
        <TablesActions
          handleShowTable={handleShowDataTable}
          showTable={showDataTable}
          csvTableData={tableDefinition?.table}
        />
      </div>
    );
  }, [
    classes.tablesActionsContainer,
    handleShowDataTable,
    renderedTablesActionsLoader,
    showDataTable,
    tableData,
    tableDefinition,
    tableShowing,
  ]);

  const renderTablesMenuItems = useCallback(
    (tables: TableType[]) =>
      tables.map((individualTable: TableType) => (
        <MenuItem key={individualTable.id} value={individualTable.id}>
          {t(individualTable.title)}
        </MenuItem>
      )),
    [t],
  );

  const renderedTextFieldItems = useMemo(
    () =>
      tableCategories.map((tableCategory: LayersCategoryType) => [
        <ListSubheader key={tableCategory.title}>
          <Typography variant="body2" color="primary">
            {t(tableCategory.title)}
          </Typography>
        </ListSubheader>,
        renderTablesMenuItems(tableCategory.tables),
      ]),
    [renderTablesMenuItems, t],
  );

  const renderedTextFieldBody = useMemo(
    () => [
      <MenuItem key="placeholder" value="placeholder" disabled>
        {t('Choose Table')}
      </MenuItem>,
      renderedTextFieldItems,
    ],
    [renderedTextFieldItems, t],
  );

  const handleTableDropdownChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTableValue(event.target.value);
      dispatch(loadTable(event.target.value));
    },
    [dispatch],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        width: showDataTable ? PanelSize.xlarge : PanelSize.medium,
      }}
    >
      <div className={classes.root}>
        <div className={classes.tablesPanel}>
          <TextField
            classes={{ root: classes.selectRoot }}
            variant="outlined"
            onChange={handleTableDropdownChange}
            value={tableValue}
            select
            placeholder={t('Choose a table')}
            label={t('Tables')}
            defaultValue=""
            InputProps={{
              classes: {
                focused: classes.focused,
                input: classes.input,
              },
            }}
            InputLabelProps={{
              classes: {
                root: classes.label,
              },
            }}
          >
            {renderedTextFieldBody}
          </TextField>
        </div>
        {renderedTablesActions}
      </div>
      {showDataTable && (
        <DataTable
          title={tableDefinition?.title}
          legendText={tableDefinition?.legendText}
          tableLoading={dataTableIsLoading}
          tableData={tableData}
          chart={tableDefinition?.chart}
        />
      )}
    </div>
  );
});

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      position: 'relative',
      display: 'flex',
      width: PanelSize.medium,
      height: '100%',
    },
    linearProgress: {
      width: '100%',
      position: 'absolute',
      top: 0,
    },
    tablesPanel: {
      display: 'flex',
      justifyContent: 'center',
      paddingTop: 40,
      width: PanelSize.medium,
    },
    tablesActionsContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      backgroundColor: theme.palette.primary.main,
      width: '100%',
      bottom: 0,
      paddingTop: 10,
      paddingBottom: 10,
    },
    selectRoot: {
      width: '90%',
      '& .MuiInputBase-root': {
        '&:hover fieldset': {
          borderColor: '#333333',
        },
      },
    },
    input: {
      color: '#333333',
    },
    focused: {
      borderColor: '#333333',
      color: '#333333',
    },
    label: {
      color: '#333333',
    },
  }),
);

export default TablesPanel;
