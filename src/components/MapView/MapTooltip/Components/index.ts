import React from 'react';
import { PopupComponentSpec } from '../../../../context/tooltipStateSlice';
import Chartjs from './Chartjs';
import Title from './Title';

const components = {
  Title,
  Chartjs,
} as {
  [key: string]: any;
};

export default (spec: PopupComponentSpec) => {
  return React.createElement(components[spec.type], spec);
};
