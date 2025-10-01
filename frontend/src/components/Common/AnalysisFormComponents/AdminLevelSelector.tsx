import { Typography, makeStyles } from '@material-ui/core';
import { range } from 'lodash';
import { AdminLevelType } from 'config/types';
import { getAdminLevelCount } from 'utils/admin-utils';
import SimpleDropdown from 'components/Common/SimpleDropdown';
import { useSafeTranslation } from 'i18n';

interface AdminLevelSelectorProps {
  value: AdminLevelType;
  onChange: (adminLevel: AdminLevelType) => void;
  disabled?: boolean;
}

function AdminLevelSelector({
  value,
  onChange,
  disabled = false,
}: AdminLevelSelectorProps) {
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

export default AdminLevelSelector;
