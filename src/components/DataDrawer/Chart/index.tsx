import React from 'react';
import { Bar } from 'react-chartjs-2';
import * as colormap from 'colormap';
import { shuffle } from 'lodash';
import { ChartConfig } from '../../../config/types';
import { TableData } from '../../../context/tableStateSlice';

type ChartProps = {
  title: string;
  data: TableData;
  config: ChartConfig;
};

export function Chart({ title, data, config }: ChartProps) {
  const header = data.rows[0];
  const tableRows = data.rows.slice(1, data.rows.length);
  const colors = shuffle(
    colormap({
      colormap: 'rainbow-soft',
      nshades: tableRows.length,
      format: 'hex',
      alpha: 0.7,
    }),
  );
  try {
    const indices = Object.keys(header).filter(key =>
      key.includes(config.xAxis || ''),
    );
    const labels = indices.map(index => header[index]);
    const datasets = tableRows.map((row, i) => ({
      label: (row[config.category] as string) || '',
      fill: true,
      backgroundColor: colors[i],
      borderWidth: 2,
      data: indices.map(index => (row[index] as number) || null),
    }));
    const chartData = {
      labels,
      datasets,
      backgroundColor: ['red', 'blue', 'green', 'blue', 'red', 'blue'],
    };
    return (
      <div>
        <Bar
          data={chartData}
          options={{
            title: {
              fontColor: '#CCC',
              display: true,
              text: title,
              fontSize: 20,
            },
            scales: {
              xAxes: [
                {
                  stacked: config.stacked || false,
                  gridLines: {
                    display: false,
                  },
                  ticks: {
                    fontColor: '#CCC',
                  },
                },
              ],
              yAxes: [
                {
                  ticks: {
                    fontColor: '#CCC',
                  },
                  stacked: config.stacked || false,
                  gridLines: {
                    display: false,
                  },
                },
              ],
            },
            legend: {
              display: false,
              position: 'right',
            },
          }}
        />
      </div>
    );
  } catch (err) {
    console.error(
      err,
      'An error occured. This chart structure may not be supported yet.',
    );
  }
  return null;
}

export default Chart;
