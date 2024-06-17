import React, { ChangeEvent, memo, useCallback } from 'react';
import Switch from 'components/Common/Switch';

interface SwitchActionProps {
  someLayerAreSelected: boolean;
  toggleLayerValue: (selectedLayerId: string, checked: boolean) => void;
  activeLayerId: string;
  validatedTitle: string;
}
const SwitchAction = ({
  someLayerAreSelected,
  toggleLayerValue,
  activeLayerId,
  validatedTitle,
}: SwitchActionProps) => {
  const handleOnChangeSwitch = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      toggleLayerValue(activeLayerId, event.target.checked);
    },
    [activeLayerId, toggleLayerValue],
  );
  return (
    <Switch
      checked={someLayerAreSelected}
      onChange={handleOnChangeSwitch}
      ariaLabel={validatedTitle}
    />
  );
};

export default memo(SwitchAction);
