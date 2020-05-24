import React from 'react';
import { Bar } from 'react-chartjs-2';
import colormap from 'colormap';
import { shuffle } from 'lodash';
import { ChartConfig } from '../../../config/types';

export function buildChart(
  tableJson: any[],
  chartConfig: ChartConfig,
  title: string,
) {
  const header = tableJson[0];
  const tableData = tableJson.slice(1, tableJson.length);
  const colors = shuffle(
    colormap({
      colormap: 'rainbow-soft',
      nshades: tableData.length,
      format: 'hex',
      alpha: 0.7,
    }),
  );
  try {
    const indices = Object.keys(header).filter(key =>
      key.includes(chartConfig.xAxis || ''),
    );
    const labels = indices.map(index => header[index]);
    const datasets = tableData.map((row, i) => ({
      label: row[chartConfig.category],
      stack: '1',
      fill: true,
      backgroundColor: colors[i],
      borderWidth: 2,
      data: indices.map(index => row[index]),
    }));
    const chartData = {
      labels,
      datasets,
      backgroundColor: ['red', 'blue', 'green', 'blue', 'red', 'blue'],
    };
    return (
      <div>
        <Bar
          type="bar"
          data={chartData}
          options={{
            title: {
              fontColor: 'white',
              display: true,
              text: title,
              fontSize: 20,
            },
            scales: {
              yAxes: [
                {
                  stacked: true,
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
