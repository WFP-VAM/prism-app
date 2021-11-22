import React from 'react';
import { PopupComponentSpec } from '../../../../context/tooltipStateSlice';
import Chartjs from './Chartjs';
import Fsva from './Fsva';
import RawHtml from './RawHtml';
import Title from './Title';

const components = {
  Fsva,
  Title,
  RawHtml,
  Chartjs,
} as {
  [key: string]: any;
};

export default (spec: PopupComponentSpec) => {
  return React.createElement(components[spec.type], spec);
};
