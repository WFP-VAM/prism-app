import { Typography } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import SimpleDropdown from 'components/Common/SimpleDropdown';
import { AdminLevelType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { range } from 'lodash';
import { getAdminLevelCount } from 'utils/admin-utils';

interface ChartAdminLevelSelectorProps {
  value: AdminLevelType;
  onChange: (adminLevel: AdminLevelType) => void;
  disabled?: boolean;
}

function ChartAdminLevelSelector({
  value,
  onChange,
  disabled = false,
}: ChartAdminLevelSelectorProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  const adminLevelOptions: [AdminLevelType, string][] = range(
    getAdminLevelCount(),
  ).map(i => [(i + 1) as AdminLevelType, `Admin ${i + 1}`]);

  return (
    <div className={classes.container}>
      <Typography className={classes.colorBlack} variant="body2">
        {t('Admin Level')}
      </Typography>
      <SimpleDropdown
        value={value}
        options={adminLevelOptions}
        onChange={onChange}
        textClass={classes.colorBlack}
        disabled={disabled}
      />
    </div>
  );
}

const useStyles = makeStyles(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 30,
    marginLeft: 10,
    width: '90%',
    color: 'black',
  },
  colorBlack: {
    color: 'black',
  },
}));

export default ChartAdminLevelSelector;
