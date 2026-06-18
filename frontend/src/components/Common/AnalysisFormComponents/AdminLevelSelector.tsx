import { makeStyles, Typography } from '@material-ui/core';
import SimpleDropdown from 'components/Common/SimpleDropdown';
import { AdminLevelType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { useEffectiveAdminLevelOptions } from 'utils/universal-country-admin';

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
  const rawOptions = useEffectiveAdminLevelOptions();
  const adminLevelOptions = rawOptions.map(
    ([level, label]) => [level, t(label)] as [AdminLevelType, string],
  );

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
