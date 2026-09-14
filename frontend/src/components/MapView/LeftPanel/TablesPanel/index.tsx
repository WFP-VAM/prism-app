import {
  Box,
  LinearProgress,
  ListSubheader,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { usePostHog } from '@posthog/react';
import {
  LayersCategoryType,
  MenuItemType,
  Panel,
  PanelSize,
  TableType,
} from 'config/types';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import {
  getCurrentData as getTableData,
  getCurrentDefinition as getTableDefinition,
  getIsShowing as getTableIsShowing,
  isLoading as tableLoading,
  loadTable,
} from 'context/tableStateSlice';
import { useSafeTranslation } from 'i18n';
import {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  tablesActionsContainerSx,
  tablesPanelLinearProgressSx,
  tablesPanelRootSx,
  tablesPanelSx,
  tablesSelectRootSx,
} from '../leftPanelStyles';
import { tablesMenuItems } from '../utils';
import DataTable from './DataTable';
import TablesActions from './TablesActions';

const tableCategories = tablesMenuItems
  .map((menuItem: MenuItemType) => menuItem.layersCategories)
  .flat();

const tabPanelType = Panel.Tables;

const TablesPanel = memo(() => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const dataTableIsLoading = useSelector(tableLoading);
  const tableDefinition = useSelector(getTableDefinition);
  const tableShowing = useSelector(getTableIsShowing);
  const tableData = useSelector(getTableData);
  const tabValue = useSelector(leftPanelTabValueSelector);
  const [tableValue, setTableValue] = useState<string>('');
  const [showDataTable, setShowDataTable] = useState<boolean>(false);

  const posthog = usePostHog();
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
    return <LinearProgress sx={tablesPanelLinearProgressSx} />;
  }, [dataTableIsLoading]);

  const renderedTablesActions = useMemo(() => {
    if (!tableDefinition || !tableData || !tableShowing) {
      return null;
    }
    return (
      <Box
        sx={tablesActionsContainerSx(theme)}
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
      </Box>
    );
  }, [
    handleShowDataTable,
    renderedTablesActionsLoader,
    showDataTable,
    tableData,
    tableDefinition,
    tableShowing,
    theme,
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
      posthog?.capture('table_loaded', { table_id: event.target.value });
      setTableValue(event.target.value);
      dispatch(loadTable(event.target.value));
    },
    [dispatch, posthog],
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
      <Box sx={tablesPanelRootSx}>
        <Box sx={tablesPanelSx}>
          <TextField
            sx={tablesSelectRootSx}
            variant="outlined"
            onChange={handleTableDropdownChange}
            value={tableValue}
            select
            placeholder={t('Choose a table')}
            label={t('Tables')}
            defaultValue=""
          >
            {renderedTextFieldBody}
          </TextField>
        </Box>
        {renderedTablesActions}
      </Box>
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

export default TablesPanel;
