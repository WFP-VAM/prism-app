;
import { LayerKey } from 'config/types';
import { makeStyles } from '@mui/styles';
import LayerDropdown from 'components/MapView/Layers/LayerDropdown';
import { useSafeTranslation } from 'i18n';

interface BaselineLayerSelectorProps {
  value: LayerKey | undefined;
  onChange: (layerId: LayerKey | undefined) => void;
  className?: string;
  disabled?: boolean;
}

function BaselineLayerSelector({
  value,
  onChange,
  className,
  disabled = false,
}: BaselineLayerSelectorProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  return (
    <div className={classes.container}>
      <LayerDropdown
        type="admin_level_data"
        value={value || ''}
        setValue={onChange}
        className={className || classes.dropdown}
        label={t('Baseline Layer')}
        placeholder={t('Choose baseline layer')}
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
  dropdown: {
    width: '100%',
    color: 'black',
  },
}));

export default BaselineLayerSelector;
