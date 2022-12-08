import React from 'react';
import { createStyles, Grid, WithStyles, withStyles } from '@material-ui/core';
import { Bar, Line } from 'react-chartjs-2';
import * as chartjs from 'chart.js';
import { PopupComponentSpec } from '../../../../context/tooltipStateSlice';

const styles = () =>
  createStyles({
    table: {
      maxWidth: '50vw',
      overflowX: 'scroll',
      borderCollapse: 'collapse',
      marginBottom: '1rem',
    },
    cellHead: {
      backgroundColor: '#fafafa',
      fontWeight: 'normal',
      padding: '0.3rem',
    },
    cell: {
      border: '1px solid #eee',
      padding: '0.3rem',
    },
  });

type FsvaTooltipData = {
  mainIndicator: string;
  table: {
    header: {
      id: string;
      label: string;
    }[];
    rows: { [key: string]: number }[];
  };
  lang: { [key: string]: string };
};

interface FsvaProps extends PopupComponentSpec, WithStyles<typeof styles> {}

function makeChartData(
  indicator: string,
  tooltipData: FsvaTooltipData,
): chartjs.ChartData {
  const { table } = tooltipData;
  return {
    labels: table.rows.map(r => r.year.toString()),
    datasets: [
      {
        label: indicator,
        fill: false,
        backgroundColor: '#418FDE',
        borderColor: '#418FDE',
        data: table.rows.map(r => Math.floor(r[indicator])),
      },
    ],
  };
}

const Fsva = ({ params, classes }: FsvaProps) => {
  const p = params as FsvaTooltipData;
  const barData = makeChartData('vulnerability', p);
  const lineData = makeChartData(p.mainIndicator, p);
  const options: chartjs.ChartOptions = {
    scales: {
      type: 'linear',
      yAxes: [
        {
          ticks: {
            min: 0,
          },
        },
      ],
    },
  };
  return (
    <div>
      <table className={classes.table}>
        <thead>
          <tr>
            <th className={classes.cellHead}>{p.lang.year}</th>
            {p.table.header.map(h => (
              <th key={h.id} className={classes.cellHead}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.table.rows.map(r => (
            <tr key={r.year}>
              <td className={classes.cell}>{r.year}</td>
              {p.table.header.map(h => (
                <td key={h.id} className={classes.cell}>
                  {r[h.id] ? r[h.id].toFixed(2) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Grid container>
        <Grid item xs={6}>
          <Bar data={barData} options={options} />
        </Grid>
        <Grid item xs={6}>
          <Line data={lineData} options={options} />
        </Grid>
      </Grid>
    </div>
  );
};

export default withStyles(styles)(Fsva);
