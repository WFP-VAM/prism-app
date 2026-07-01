import { Box, Typography } from '@mui/material';
import SimpleDropdown from 'components/Common/SimpleDropdown';
import { AdminLevelType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { useEffectiveAdminLevelOptions } from 'utils/universal-country-admin';

import { colorBlackSx, formContainerSx } from '../formComponentStyles';

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
  const { t } = useSafeTranslation();
  const rawOptions = useEffectiveAdminLevelOptions();
  const adminLevelOptions = rawOptions.map(
    ([level, label]) => [level, t(label)] as [AdminLevelType, string],
  );

  return (
    <Box sx={formContainerSx()}>
      <Typography sx={colorBlackSx} variant="body2">
        {t('Admin Level')}
      </Typography>
      <SimpleDropdown
        value={value}
        options={adminLevelOptions}
        onChange={onChange}
        textSx={colorBlackSx}
        disabled={disabled}
      />
    </Box>
  );
}

export default AdminLevelSelector;
