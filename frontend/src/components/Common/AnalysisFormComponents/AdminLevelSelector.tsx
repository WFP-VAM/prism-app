import { Box, Typography } from '@mui/material';
import SimpleDropdown from 'components/Common/SimpleDropdown';
import { AdminLevelType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { range } from 'lodash';
import { getAdminLevelCount } from 'utils/admin-utils';

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

  const adminLevelOptions: [AdminLevelType, string][] = range(
    getAdminLevelCount(),
  ).map(i => [(i + 1) as AdminLevelType, t(`Admin ${i + 1}`)]);

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
