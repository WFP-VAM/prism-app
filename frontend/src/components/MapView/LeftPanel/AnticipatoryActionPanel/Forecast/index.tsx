import { Typography, createStyles, makeStyles } from '@material-ui/core';
import React from 'react';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Scatter } from 'react-chartjs-2';
import { useDispatch } from 'react-redux';
import { setPanelSize } from 'context/leftPanelStateSlice';
import { PanelSize } from 'config/types';
import { gray } from 'muiTheme';

const indexes = {
  'DRY DJ': null,
  'DRY JF': null,
  'SPI DJ': 8,
  'SPI DJF': 12,
  'SPI JF': 10,
  'SPI ND': 15,
  'SPI NDJ': 5,
  'SPI ON': 19,
  'SPI OND': 15,
};

const data = {
  labels: Object.keys(indexes),
  datasets: [
    {
      label: 'Severe',
      data: Object.entries(indexes).map(([index, val], i) => ({
        x: i + 0.7,
        y: val,
      })),
      // Triangle pointer
      pointStyle: 'triangle',
      rotation: 90,
      radius: 10,
      hoverRadius: 10,
      backgroundColor: '#E63701',
      // Label
      datalabels: {
        labels: {
          value: {
            offset: -2, // offset from the point
            align: 'left',
            backgroundColor: 'white',
            borderColor: (ctx: any) => {
              return ctx.dataset.backgroundColor;
            },
            borderWidth: 1,
            borderRadius: 2,
            color: 'black',
            formatter: (value: any, ctx: any) => {
              return `${value.y}%`;
            },
          },
        },
      },
    },
  ],
};

const options = {
  legend: {
    display: false,
  },
  tooltips: {
    enabled: false,
  },
  layout: {
    padding: {
      left: 10,
      right: 10,
    },
  },
  maintainAspectRatio: false,
  scales: {
    xAxes: [
      {
        gridLines: {
          display: false,
        },
        ticks: {
          display: false,
        },
      },
    ],
    yAxes: [
      {
        ticks: {
          suggestedMin: 0,
          suggestedMax: 40,
          stepSize: 10,
          callback: (value: number, index: number, values: number[]) =>
            `${value}%`,
        },
      },
    ],
  },
  plugins: {
    datalabels: {
      align: 'left',
      anchor: 'right',
      color: (context: any) => context.dataset.backgroundColor,
    },
    legend: {
      labels: {
        usePointStyle: true,
      },
    },
  },
};

function Forecast() {
  const classes = useForecastStyle();
  const dispatch = useDispatch();

  React.useEffect(() => {
    dispatch(setPanelSize(PanelSize.large));
  }, [dispatch]);

  return (
    <div className={classes.root}>
      <div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            paddingLeft: '3.5rem',
            paddingRight: '0.5rem',
          }}
        >
          <div style={{ minWidth: '3rem' }} />
          {Object.keys(indexes).map(x => (
            <Typography className={classes.label}>{x}</Typography>
          ))}
          <div style={{ minWidth: '10px' }} />
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap' }}
        >
          <div
            style={{
              backgroundColor: '#E63701',
              width: '3rem',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="h2"
              style={{
                fontWeight: 400,
                color: 'white',
                border: '1px solid white',
                borderRadius: '2px',
                writingMode: 'vertical-lr',
                textTransform: 'uppercase',
                transform: 'rotate(180deg)',
                padding: '0.1rem',
                height: '5rem',
                margin: 'auto',
              }}
            >
              Severe
            </Typography>
          </div>

          <div className={classes.chartWrapper}>
            <Scatter
              data={data as any}
              plugins={[ChartDataLabels]}
              options={options as any}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const useForecastStyle = makeStyles(() =>
  createStyles({
    root: {
      width: '100%',
    },
    chartWrapper: {
      padding: '0.5rem',
      height: '15rem',
      width: '100%',
    },
    label: {
      background: gray,
      margin: '0.5rem',
      borderRadius: '4px',
      textAlign: 'center',
      textTransform: 'uppercase',
      lineHeight: '2rem',
      width: '100%',
    },
  }),
);

export default Forecast;
