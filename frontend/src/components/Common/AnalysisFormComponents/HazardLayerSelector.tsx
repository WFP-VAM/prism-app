import { makeStyles } from '@material-ui/core';
import { LayerKey } from 'config/types';
import LayerDropdown from 'components/MapView/Layers/LayerDropdown';
import { useSafeTranslation } from 'i18n';

interface HazardLayerSelectorProps {
  value: LayerKey | undefined;
  onChange: (layerId: LayerKey | undefined) => void;
  className?: string;
  disabled?: boolean;
}

function HazardLayerSelector({
  value,
  onChange,
  className,
  disabled = false,
}: HazardLayerSelectorProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  return (
    <div className={classes.container}>
      <LayerDropdown
        type="wms"
        value={value || ''}
        setValue={onChange}
        className={className || classes.dropdown}
        label={t('Hazard Layer')}
        placeholder="Choose hazard layer"
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

export default HazardLayerSelector;
