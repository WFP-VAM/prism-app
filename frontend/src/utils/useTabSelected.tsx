import { Panel, leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import React from 'react';
import { useSelector } from 'react-redux';

function useTabSelected(
  tab: Panel,
  effect: React.EffectCallback,
  deps: React.DependencyList,
) {
  const tabValue = useSelector(leftPanelTabValueSelector);

  const callback = tab === tabValue ? effect : () => {};

  React.useEffect(callback, [tabValue, ...deps]);
}

export default useTabSelected;
