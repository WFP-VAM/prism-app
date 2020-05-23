import React from 'react';
import { Bar } from 'react-chartjs-2';
import { ChartConfig } from '../../../config/types';

function getRandomColor() {
  const letters = '0123456789ABCDEF'.split('');
  let color = '#';
  Array.from(Array(6)).forEach(() => {
    color += letters[Math.floor(Math.random() * 16)];
  });
  return color;
}

export function buildChart(
  tableJson: any[],
  chartConfig: ChartConfig,
  title: string,
) {
  const tableData = [...tableJson];
  try {
    const header = tableData.shift();
    const indices = Object.keys(header).filter(key =>
      key.includes(chartConfig.xAxis || ''),
    );
    const labels = indices.map(index => header[index]);
    const datasets = tableData.map(row => ({
      label: row[chartConfig.category],
      stack: '1',
      fill: true,
      backgroundColor: getRandomColor(),
      // lineTension: 0.5,
      // backgroundColor: 'rgba(75,192,192,1)',
      // borderColor: 'rgba(0,0,0,1)',
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
