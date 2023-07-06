import React, { useCallback, useState, MouseEvent, useMemo } from 'react';
import {
  Button,
  createStyles,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { snakeCase } from 'lodash';
import { useSelector } from 'react-redux';
import { downloadToFile } from 'components/MapView/utils';
import { useSafeTranslation } from 'i18n';
import {
  getCurrentDefinition,
  TableRow,
  TableRow as AnalysisTableRow,
} from 'context/analysisResultStateSlice';
import { layersSelector } from 'context/mapStateSlice/selectors';
import { ReportType } from 'components/Common/ReportDialog/types';
import ReportDialog from 'components/Common/ReportDialog';
import { Column, quoteAndEscapeCell } from 'utils/analysis-utils';

function ExposureAnalysisActions({
  analysisButton,
  bottomButton,
  clearAnalysis,
  tableData,
  columns,
}: ExposureAnalysisActionsProps) {
  // only display local names if local language is selected, otherwise display english name
  const { t } = useSafeTranslation();
  const analysisDefinition = useSelector(getCurrentDefinition);
  const selectedLayers = useSelector(layersSelector);

  const [openReport, setOpenReport] = useState(false);

  const isShowingStormData = useMemo(() => {
    return selectedLayers.some(({ id }) => id === 'adamts_buffers');
  }, [selectedLayers]);

  const getCellValue = useCallback((value: string | number, column: Column) => {
    if (column.format && typeof value === 'number') {
      return quoteAndEscapeCell(column.format(value));
    }
    return quoteAndEscapeCell(value);
  }, []);

  const columnsToRenderCsv = useMemo(() => {
    return columns.reduce(
      (acc: { [key: string]: string | number }, column: Column) => {
        return {
          ...acc,
          [column.id]: column.label,
        };
      },
      {},
    );
  }, [columns]);

  const tableDataRowsToRenderCsv = useMemo(() => {
    return tableData.map((tableRowData: TableRow) => {
      return columns.reduce(
        (acc: { [key: string]: string | number }, column: Column) => {
          const value = tableRowData[column.id];
          return {
            ...acc,
            [column.id]: getCellValue(value, column),
          };
        },
        {},
      );
    });
  }, [columns, getCellValue, tableData]);

  const analysisCsvData = useMemo(() => {
    return [columnsToRenderCsv, ...tableDataRowsToRenderCsv]
      .map(analysisCsvItem => {
        return Object.values(analysisCsvItem);
      })
      .join('\n');
  }, [columnsToRenderCsv, tableDataRowsToRenderCsv]);

  const handleOnDownloadCsv = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      downloadToFile(
        {
          content: analysisCsvData,
          isUrl: false,
        },
        `${snakeCase(analysisDefinition?.id)}_${snakeCase(
          analysisDefinition?.legendText,
        )}`,
        'text/csv',
      );
    },
    [analysisCsvData, analysisDefinition],
  );

  return (
    <>
      <Button className={analysisButton} onClick={clearAnalysis}>
        <Typography variant="body2">{t('Clear Analysis')}</Typography>
      </Button>
      {analysisCsvData && (
        <Button className={bottomButton} onClick={handleOnDownloadCsv}>
          <Typography variant="body2">{t('Download as CSV')}</Typography>
        </Button>
      )}
      <Button className={bottomButton} onClick={() => setOpenReport(true)}>
        <Typography variant="body2">{t('Create Report')}</Typography>
      </Button>
      <ReportDialog
        open={openReport}
        handleClose={() => setOpenReport(false)}
        reportType={isShowingStormData ? ReportType.Storm : ReportType.Flood}
        tableData={tableData}
        columns={columns}
      />
    </>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    tableContainer: {
      height: '60vh',
      maxWidth: '90%',
      marginTop: 5,
      zIndex: theme.zIndex.modal + 1,
    },
    tableHead: {
      backgroundColor: '#EBEBEB',
      boxShadow: 'inset 0px -1px 0px rgba(0, 0, 0, 0.25)',
    },
    tableHeaderText: {
      color: 'black',
      fontWeight: 500,
    },
    tableBodyText: {
      color: 'black',
    },
    innerAnalysisButton: {
      backgroundColor: theme.surfaces?.dark,
    },
    tablePagination: {
      display: 'flex',
      justifyContent: 'center',
      color: 'black',
    },
    select: {
      flex: '1 1 10%',
      maxWidth: '10%',
      marginRight: 0,
    },
    caption: {
      flex: '1 2 30%',
      marginLeft: 0,
    },
    backButton: {
      flex: '1 1 5%',
      maxWidth: '10%',
    },
    nextButton: {
      flex: '1 1 5%',
      maxWidth: '10%',
    },
    spacer: {
      flex: '1 1 5%',
      maxWidth: '5%',
    },
  });

interface ExposureAnalysisActionsProps extends WithStyles<typeof styles> {
  analysisButton?: string;
  bottomButton?: string;
  clearAnalysis: () => void;
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default withStyles(styles)(ExposureAnalysisActions);
