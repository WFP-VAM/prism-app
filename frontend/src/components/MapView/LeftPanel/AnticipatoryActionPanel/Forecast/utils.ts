import {
  AACategoryType,
  AnticipatoryActionDataRow,
  AnticipatoryActionState,
} from 'context/anticipatoryActionStateSlice/types';

const indexOrder = ['SPI', 'DRY'];
const monthsOrder = ['O', 'N', 'D', 'J', 'F', 'M', 'A', 'M', 'J'];

function sortIndexes(indexes: string[]): string[] {
  // eslint-disable-next-line fp/no-mutating-methods
  return indexes.sort((a, b) => {
    const [typeA, monthA] = a.split(' ');
    const [typeB, monthB] = b.split(' ');

    const typeIndexA = indexOrder.indexOf(typeA);
    const typeIndexB = indexOrder.indexOf(typeB);

    if (typeIndexA !== typeIndexB) {
      return typeIndexA - typeIndexB;
    }

    const monthIndexA = monthsOrder.findIndex(month =>
      monthA.startsWith(month),
    );
    const monthIndexB = monthsOrder.findIndex(month =>
      monthB.startsWith(month),
    );

    return monthIndexA - monthIndexB;
  });
}

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
  const { selectedWindow, selectedDate } = filters;

  const dateData = (selectedWindow === 'All'
    ? [
        ...(data['Window 1'][selectedDistrict] || []),
        ...(data['Window 2'][selectedDistrict] || []),
      ]
    : data[selectedWindow][selectedDistrict] || []
  ).filter(x => !selectedDate || x.date <= selectedDate);

  // eslint-disable-next-line fp/no-mutating-methods
  const indexes = sortIndexes([...new Set(dateData.map(x => x.index))]);

  const sevMap = new Map<AACategoryType, AnticipatoryActionDataRow[]>();
  dateData.forEach(x => {
    const val = sevMap.get(x.category);
    sevMap.set(x.category, val ? [...val, x] : [x]);
  });
  const groupedBySev = Object.fromEntries(sevMap);

  const chartData = Object.fromEntries(
    Object.entries(groupedBySev).map(([cat, catData]) => {
      const val = indexes.map(index => {
        const indexData = catData.filter(x => x.index === index);
        if (indexData.length > 0) {
          // Sort by date in descending order to get the latest date first
          // eslint-disable-next-line fp/no-mutating-methods
          indexData.sort((a, b) => b.date.localeCompare(a.date));
          // Take the probability of the first element (latest date)
          const max = Math.trunc(indexData[0].probability * 100);
          return [index, max];
        }
        return [index, null];
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
          suggestedMin: 0,
          display: false,
          stepSize: 1,
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
      data: Object.entries(indexes).map(([index, val], i) => ({
        x: i + 0.6,
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