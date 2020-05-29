import React from 'react';
import * as colormap from 'colormap';
import { ChartOptions } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { ChartConfig } from '../../../config/types';
import { TableData } from '../../../context/tableStateSlice';

type ChartProps = {
  title: string;
  data: TableData;
  config: ChartConfig;
};

function getChartConfig(stacked: boolean, title: string) {
  return {
    title: {
      fontColor: '#CCC',
      display: true,
      text: title,
      fontSize: 20,
    },
    scales: {
      xAxes: [
        {
          stacked,
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
          stacked,
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
  } as ChartOptions;
}

function formatChartData(data: TableData, config: ChartConfig) {
  const transpose = config.transpose || false;
  const header = data.rows[0];
  const tableRows = data.rows.slice(1, data.rows.length);

  // Get the keys for the data of interest
  const indices = Object.keys(header).filter(key =>
    key.includes(config.data || ''),
  );

  // rainbow-soft map requires nshades to be at least size 11
  const nshades = Math.max(11, !transpose ? tableRows.length : indices.length);

  const colors = colormap({
    colormap: 'rainbow-soft',
    nshades,
    format: 'hex',
    alpha: 0.5,
  });

  const labels = !transpose
    ? indices.map(index => header[index])
    : tableRows.map(row => row[config.category]);

  const datasets = !transpose
    ? tableRows.map((row, i) => ({
        label: (row[config.category] as string) || '',
        fill: config.fill || false,
        backgroundColor: colors[i],
        borderColor: config.fill ? null : colors[i],
        borderWidth: 2,
        data: indices.map(index => (row[index] as number) || null),
      }))
    : indices.map((index, i) => ({
        label: header[index] as string,
        fill: config.fill || false,
        backgroundColor: colors[i],
        borderColor: config.fill ? null : colors[i],
        borderWidth: 2,
        data: tableRows.map(row => (row[index] as number) || null),
      }));

  return {
    labels,
    datasets,
  };
}

export function Chart({ title, data, config }: ChartProps) {
  try {
    const chartData = formatChartData(data, config);

    switch (config.type) {
      case 'bar':
        return (
          <div>
            <Bar
              data={chartData}
              options={getChartConfig(config.stacked || false, title)}
            />
          </div>
        );
      case 'line':
        return (
          <div>
            <Line
              data={chartData}
              options={getChartConfig(config.stacked || false, title)}
            />
          </div>
        );
      default:
        throw new Error(
          `Charts of type ${config.type} have not been implemented yet.`,
        );
    }
  } catch (err) {
    console.error(
      err,
      'An error occured. This chart structure may not be supported yet.',
    );
  }
  return null;
}

export default Chart;
