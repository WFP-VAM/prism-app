import { memo, useCallback, useMemo } from 'react';
import { createStyles, withStyles, WithStyles } from '@material-ui/styles';
import { Button, Typography } from '@material-ui/core';
import { useSafeTranslation } from 'i18n';
import { cyanBlue } from 'muiTheme';

const TablesActions = memo(
  ({
    classes,
    showTable,
    handleShowTable,
    csvTableData,
  }: TablesActionsProps) => {
    const { t } = useSafeTranslation();

    const handleOnClickHideShowTable = useCallback(() => {
      handleShowTable(!showTable);
    }, [handleShowTable, showTable]);

    const renderedHideShowTableButtonLabel = useMemo(() => {
      if (showTable) {
        return t('Hide Table');
      }
      return t('View Table');
    }, [showTable, t]);

    return (
      <div className={classes.buttonsContainer}>
        <Button
          className={classes.showHideTableButton}
          onClick={handleOnClickHideShowTable}
        >
          <Typography variant="body2">
            {renderedHideShowTableButtonLabel}
          </Typography>
        </Button>
        <Button className={classes.downloadCsvButton}>
          <a href={csvTableData}>
            <Typography variant="body2">{t('Download as CSV')}</Typography>
          </a>
        </Button>
      </div>
    );
  },
);

const styles = () => {
  return createStyles({
    buttonsContainer: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      width: '50%',
      gap: 10,
    },
    showHideTableButton: {
      backgroundColor: '#788489',
      '&:hover': {
        backgroundColor: '#788489',
      },
      width: '100%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
    downloadCsvButton: {
      backgroundColor: cyanBlue,
      '&:hover': {
        backgroundColor: cyanBlue,
      },
      width: '100%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
  });
};

interface TablesActionsProps extends WithStyles<typeof styles> {
  showTable: boolean;
  handleShowTable: (show: boolean) => void;
  csvTableData: any;
}

export default withStyles(styles)(TablesActions);
