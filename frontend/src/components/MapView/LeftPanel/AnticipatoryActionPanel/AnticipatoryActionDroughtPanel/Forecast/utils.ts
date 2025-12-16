import {
  AACategoryType,
  AnticipatoryActionDataRow,
  AnticipatoryActionState,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { calculateSeason } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionDroughtPanel/utils/countryConfig';

const indexOrder = ['SPI', 'DRY'];
const monthsOrder = ['O', 'N', 'D', 'J', 'F', 'M', 'A', 'M', 'J'];

function sortIndexes(indexes: string[]): string[] {
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

interface IndexData {
  probability: number | null;
  showWarningSign: boolean;
}

interface CategoryData {
  [index: string]: IndexData;
}

interface ChartData {
  [category: string]: CategoryData;
}

export function forecastTransform({
  filters,
  selectedDistrict,
  data,
}: ForecastTransformParams) {
  const { selectedWindow, selectedDate } = filters;
  const season = calculateSeason(selectedDate);

  const dateData = (
    selectedWindow === 'All'
      ? [
          ...(data['Window 1'][selectedDistrict] || []),
          ...(data['Window 2'][selectedDistrict] || []),
        ]
      : data[selectedWindow][selectedDistrict] || []
  ).filter(
    x => !selectedDate || (x.date <= selectedDate && x.season === season),
  );

  const indexes = sortIndexes([...new Set(dateData.map(x => x.index))]);

  const sevMap = new Map<AACategoryType, AnticipatoryActionDataRow[]>();
  dateData.forEach(x => {
    const val = sevMap.get(x.category);
    sevMap.set(x.category, val ? [...val, x] : [x]);
  });
  const groupedBySev = Object.fromEntries(sevMap);

  const chartData: ChartData = Object.fromEntries(
    Object.entries(groupedBySev).map(([cat, catData]) => {
      const val = indexes.map(index => {
        const indexData = catData.filter(
          x => x.index === index && !x.computedRow,
        );
        if (indexData.length > 0) {
          // Sort by date in descending order to get the latest date first

          indexData.sort((a, b) => b.date.localeCompare(a.date));
          // Take the probability of the first element (latest date)
          const latest = parseFloat(
            ((indexData[0].probability || 0) * 100).toFixed(2),
          );

          const showWarningSign = Boolean(indexData[0].isValid);
          return [index, { probability: latest, showWarningSign }];
        }
        return [index, { probability: null, showWarningSign: false }];
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
          callback: (value: number, _index: number, _values: number[]) =>
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
  indexes: {
    [key: string]: {
      probability?: number | null;
      showWarningSign: boolean | null;
    } | null;
  },
  backgroundColor: string,
) => ({
  labels: Object.keys(indexes),
  datasets: [
    {
      data: Object.entries(indexes).map(([_index, val], i) => ({
        x: i + 0.6,
        y: val?.probability,
        z: val?.showWarningSign,
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
            borderColor: (ctx: any) => ctx.dataset.backgroundColor,
            borderWidth: 1,
            borderRadius: 2,
            color: 'black',
            formatter: (value: any, _ctx: any) =>
              `${value.z ? '⚠️ ' : ''}${value.y}%`,
          },
        },
      },
    },
  ],
});
