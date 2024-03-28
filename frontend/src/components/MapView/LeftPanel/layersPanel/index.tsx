import { Box } from '@material-ui/core';
import React, { memo } from 'react';
import HashText from 'components/Common/HashText';
import {
  Panel,
  leftPanelTabValueSelector,
  setPanelSize,
} from 'context/leftPanelStateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { PanelSize } from 'config/types';
import RootAccordionItems from './RootAccordionItems';
import RootAnalysisAccordionItems from './RootAnalysisAccordionItems';

const tabPanelType = Panel.Layers;

interface LayersPanelProps {
  setResultsPage: React.Dispatch<
    React.SetStateAction<React.JSX.Element | null>
  >;
}

function LayersPanel({ setResultsPage }: LayersPanelProps) {
  const dispatch = useDispatch();
  const tabValue = useSelector(leftPanelTabValueSelector);

  React.useEffect(() => {
    if (tabValue !== tabPanelType) {
      return;
    }
    dispatch(setPanelSize(PanelSize.medium));
    setResultsPage(null);
  }, [dispatch, setResultsPage, tabValue]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      width={PanelSize.medium}
    >
      <RootAccordionItems />
      <RootAnalysisAccordionItems />
      <Box flexGrow={1} />
      <HashText />
    </Box>
  );
}

export default memo(LayersPanel);
