import {
  AACategoryType,
  AnticipatoryActionDataRow,
  AnticipatoryActionState,
} from 'context/anticipatoryActionStateSlice/types';

const months = [
  'JF',
  'F',
  'MA',
  'AM',
  'MJ',
  'JJ',
  'JA',
  'AS',
  'S',
  'O',
  'N',
  'D',
];

interface ForecastTransformParams {
  filters: AnticipatoryActionState['filters'];
  selectedDistrict: AnticipatoryActionState['selectedDistrict'];
  data: AnticipatoryActionState['data'];
}

export function forecastTransform({
  filters,
  selectedDistrict,
  data,
}: ForecastTransformParams) {
  const { selectedWindow } = filters;

  const allData =
    selectedWindow === 'All'
      ? [
          ...(data['Window 1'][selectedDistrict] || []),
          ...(data['Window 2'][selectedDistrict] || []),
        ]
      : data[selectedWindow][selectedDistrict] || [];

  // eslint-disable-next-line fp/no-mutating-methods
  const indexes = [...new Set(allData.map(x => x.index))].sort((a, b) => {
    const typeA = a.split(' ')[0];
    const typeB = b.split(' ')[0];

    const indexA = a.split(' ')[1];
    const indexB = b.split(' ')[1];
    const monthA = months.findIndex(x => indexA.startsWith(x));
    const monthB = months.findIndex(x => indexB.startsWith(x));

    if (typeA > typeB) {
      return 1;
    }
    if (typeA < typeB) {
      return -1;
    }
    if (monthA > monthB) {
      return 1;
    }
    if (monthA < monthB) {
      return -1;
    }
    return 0;
  });

  const sevMap = new Map<AACategoryType, AnticipatoryActionDataRow[]>();
  allData.forEach(x => {
    const val = sevMap.get(x.category);
    sevMap.set(x.category, val ? [...val, x] : [x]);
  });
  const groupedBySev = Object.fromEntries(sevMap);

  const chartData = Object.fromEntries(
    Object.entries(groupedBySev).map(([cat, catData]) => {
      const val = indexes.map(index => {
        const indexData = catData.filter(x => x.index === index);
        // TODO: is this right?
        const max =
          indexData.length > 0
            ? Math.trunc(Math.max(...indexData.map(x => x.probability)) * 100)
            : null;
        return [index, max];
      });
      return [cat, Object.fromEntries(val)];
    }),
  );

  return { chartData, indexes };
}

export const chartOptions = {
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
      top: 15,
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

export const getChartData = (
  indexes: { [key: string]: number | null },
  backgroundColor: string,
) => ({
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
      backgroundColor,
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
});
