import React from 'react';
import { cloneDeep } from 'lodash';
import * as Charts from 'react-chartjs-2';

export default ({ params }: { params: Charts.ChartComponentProps }) => {
  const component: any = (Charts as any)[params.type!];
  const paramsCloned = cloneDeep(params);
  return React.createElement(component, paramsCloned);
};
