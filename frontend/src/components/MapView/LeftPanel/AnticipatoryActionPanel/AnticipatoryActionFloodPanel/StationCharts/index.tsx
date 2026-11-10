import 'chartjs-plugin-annotation';

import {
  Button,
  CircularProgress,
  createStyles,
  IconButton,
  makeStyles,
  Menu,
  MenuItem,
  Paper,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Theme,
  Typography,
} from '@material-ui/core';
import { Close, GetApp, TableChart } from '@material-ui/icons';
import Chart from 'chart.js';
import {
  AAFloodDataSelector,
  setAAFloodStationDetailActiveTab,
  setAAFloodStationDetailViewMode,
} from 'context/anticipatoryAction/AAFloodStateSlice';
import {
  combinationRank,
  defaultChartPhase,
  focusCombination,
  phaseStatusLevel,
} from 'context/anticipatoryAction/AAFloodStateSlice/floodStatus';
import {
  AAFloodPhase,
  AAFloodSeverityKey,
  FloodStation,
  FloodTriggerCombination,
} from 'context/anticipatoryAction/AAFloodStateSlice/types';
import {
  floodStationKey,
  forecastLeadDay,
  getFloodRiskColor,
  isForecastDateInWindow,
  parseFloodStatus,
} from 'context/anticipatoryAction/AAFloodStateSlice/utils';
import { useSafeTranslation } from 'i18n';
import sortBy from 'lodash/sortBy';
import { cyanBlue } from 'muiTheme';
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  ReactElement,
} from 'react';
import { useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getFormattedDate } from 'utils/date-utils';

import {
  AAFloodColors,
  CHART_WIDTH,
  ForecastWindowPerCountry,
  TABLE_WIDTH,
} from '../constants';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function dayMon(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return iso;
  }
  return `${Number(match[3])}-${MONTHS[Number(match[2]) - 1]}`;
}

// ColorBrewer Reds, 5 classes. Equal 20-point bins of the daily exceedance.
const PROBABILITY_QUINTILES = [
  '#fee5d9',
  '#fcae91',
  '#fb6a4a',
  '#de2d26',
  '#a50f15',
] as const;

function probabilityQuintile(value: number): { fill: string; text: string } {
  const bin = Math.min(4, Math.max(0, Math.floor(value / 20)));
  return {
    fill: PROBABILITY_QUINTILES[bin],
    text: bin >= 3 ? '#fff' : '#1a1a1a',
  };
}

type DailyExceedance = {
  values: (number | null)[];
  dates: string[];
  beginIdx: number;
  endIdx: number;
  color: string;
  pill: string;
  pillFill: string;
  pillText: string;
  pillDash: boolean;
};

function daySlots(
  xs: number[],
  leftLimit: number,
  rightLimit: number,
): { left: number; right: number; cx: number }[] {
  return xs.map((x, i) => {
    const prev = i > 0 ? xs[i - 1] : x - (xs[1] - xs[0] || 36);
    const next = i < xs.length - 1 ? xs[i + 1] : x + (x - xs[i - 1] || 36);
    const left = Math.max((prev + x) / 2 + 1.5, leftLimit);
    const right = Math.min((x + next) / 2 - 1.5, rightLimit);
    return { left, right: Math.max(right, left + 8), cx: x };
  });
}

const dailyExceedancePlugin = {
  beforeDatasetsDraw(chart: any) {
    const spec = chart.options?.dailyExceedance as DailyExceedance | undefined;
    if (!spec || spec.beginIdx < 0 || spec.endIdx < spec.beginIdx) {
      return;
    }
    const xScale = chart.scales?.['x-axis-0'];
    const area = chart.chartArea;
    if (!xScale || !area) {
      return;
    }
    const n = spec.values.length;
    const xs = Array.from({ length: n }, (_v, i) => xScale.getPixelForTick(i));
    const slots = daySlots(xs, area.left, area.right);
    const start = slots[spec.beginIdx];
    const end = slots[spec.endIdx];
    if (!start || !end) {
      return;
    }
    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(
      start.left,
      area.top,
      end.right - start.left,
      area.bottom - area.top,
    );
    ctx.restore();
  },
  afterDraw(chart: any) {
    const spec = chart.options?.dailyExceedance as DailyExceedance | undefined;
    if (!spec?.values.length) {
      return;
    }
    const xScale = chart.scales?.['x-axis-0'];
    const area = chart.chartArea;
    if (!xScale || !area) {
      return;
    }
    const { ctx } = chart;
    const n = spec.values.length;
    const xs = Array.from({ length: n }, (_v, i) => xScale.getPixelForTick(i));
    const rightLimit = Math.min(area.right, chart.width - 2);
    const slots = daySlots(xs, area.left, rightLimit);
    const boxH = 20;
    const boxTop = area.bottom + 8;
    ctx.save();
    spec.values.forEach((value, i) => {
      const slot = slots[i];
      const shade = value == null ? null : probabilityQuintile(value);
      ctx.fillStyle = shade?.fill ?? '#f3f3f3';
      ctx.fillRect(slot.left, boxTop, slot.right - slot.left, boxH);
      ctx.fillStyle = shade?.text ?? '#1a1a1a';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = (slot.left + slot.right) / 2;
      if (value != null) {
        ctx.fillText(`${Math.round(value)}%`, cx, boxTop + boxH / 2);
      }
      ctx.fillStyle = '#333';
      ctx.font = '9px sans-serif';
      ctx.textBaseline = 'top';
      const date = spec.dates[i] ?? '';
      const dateW = ctx.measureText(date).width;
      const dateX = Math.min(
        Math.max(cx, area.left + dateW / 2),
        rightLimit - dateW / 2,
      );
      ctx.fillText(date, dateX, boxTop + boxH + 3);
    });
    if (spec.beginIdx >= 0 && spec.endIdx >= spec.beginIdx) {
      const start = slots[spec.beginIdx];
      const end = slots[spec.endIdx];
      const x0 = start.left - 1;
      const x1 = end.right + 1;
      ctx.strokeStyle = spec.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(spec.pillDash ? [3, 3] : []);
      ctx.strokeRect(x0, boxTop - 2, x1 - x0, boxH + 4);
      ctx.font = '10px sans-serif';
      const textW = Math.min(
        ctx.measureText(spec.pill).width + 14,
        chart.width - 8,
      );
      const py = boxTop + boxH + 18;
      const px = Math.min(
        Math.max((x0 + x1) / 2 - textW / 2, 4),
        chart.width - textW - 4,
      );
      ctx.beginPath();
      const radius = 8;
      ctx.moveTo(px + radius, py);
      ctx.arcTo(px + textW, py, px + textW, py + 16, radius);
      ctx.arcTo(px + textW, py + 16, px, py + 16, radius);
      ctx.arcTo(px, py + 16, px, py, radius);
      ctx.arcTo(px, py, px + textW, py, radius);
      ctx.closePath();
      ctx.fillStyle = spec.pillFill;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = spec.pillText;
      ctx.textBaseline = 'middle';
      ctx.fillText(spec.pill, px + textW / 2, py + 8);
    }
    ctx.restore();
  },
};

if (!(Chart as any).__prismDailyExceedance) {
  Chart.plugins.register(dailyExceedancePlugin);
  (Chart as any).__prismDailyExceedance = true;
}

const forecastWindow = ForecastWindowPerCountry.mozambique;
const SEVERITY_ORDER: AAFloodSeverityKey[] = ['bankfull', 'moderate', 'severe'];
const SEVERITY_NAME: Record<AAFloodSeverityKey, string> = {
  bankfull: 'Bankfull',
  moderate: 'Moderate',
  severe: 'Severe',
};

type ProbabilityPoint = {
  time: string;
  bankfullPercentage: number;
  moderatePercentage: number;
  severePercentage: number;
};

function windowIndexBounds(
  points: { time: string }[],
  combo: FloodTriggerCombination | null,
): { beginIdx: number; endIdx: number } {
  let beginIdx = -1;
  let endIdx = -1;
  if (!combo) {
    return { beginIdx, endIdx };
  }
  points.forEach((point, idx) => {
    if (
      isForecastDateInWindow(point.time, combo.windowBegin, combo.windowEnd)
    ) {
      if (beginIdx < 0) {
        beginIdx = idx;
      }
      endIdx = idx;
    }
  });
  return { beginIdx, endIdx };
}

function combinationProbabilityData(
  sorted: ProbabilityPoint[],
  labels: string[],
  visible: FloodTriggerCombination[],
  translate: (key: string) => string,
) {
  const percentage: Record<AAFloodSeverityKey, number[]> = {
    bankfull: sorted.map(point => point.bankfullPercentage),
    moderate: sorted.map(point => point.moderatePercentage),
    severe: sorted.map(point => point.severePercentage),
  };
  const flatWindow = (combo: FloodTriggerCombination, value: number | null) => {
    const { beginIdx, endIdx } = windowIndexBounds(sorted, combo);
    return percentage.bankfull.map((_value, idx) =>
      beginIdx >= 0 && idx >= beginIdx && idx <= endIdx ? (value ?? NaN) : NaN,
    );
  };
  const thresholdName: Record<AAFloodSeverityKey, string> = {
    bankfull: 'Bankfull threshold',
    moderate: 'Moderate threshold',
    severe: 'Severe threshold',
  };
  const meanName: Record<AAFloodSeverityKey, string> = {
    bankfull: 'Bankfull mean (window)',
    moderate: 'Moderate mean (window)',
    severe: 'Severe mean (window)',
  };
  const datasets: any[] = [];
  const thresholdIndex: Partial<Record<AAFloodSeverityKey, number>> = {};
  visible.forEach(combo => {
    thresholdIndex[combo.severity] = datasets.length;
    const color = AAFloodColors.chart[combo.severity];
    datasets.push({
      label: translate(thresholdName[combo.severity]),
      data: Array.from({ length: labels.length }, () => combo.trigger),
      borderColor: color.solid,
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [6, 6],
      pointRadius: 0,
      fill: false,
    });
  });
  visible.forEach(combo => {
    const color = AAFloodColors.chart[combo.severity];
    datasets.push({
      label: translate(SEVERITY_NAME[combo.severity]),
      data: percentage[combo.severity],
      borderColor: color.solid,
      backgroundColor: color.solid,
      borderWidth: 2,
      showLine: false,
      pointRadius: 3,
      fill: false,
    });
  });
  visible.forEach(combo => {
    const color = AAFloodColors.chart[combo.severity];
    datasets.push({
      label: translate(meanName[combo.severity]),
      data: flatWindow(combo, combo.avgProbability),
      borderColor: color.solid,
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
    });
  });
  const fillCombo = [...visible]
    .filter(combo => combo.exceeded)
    .sort((a, b) => combinationRank(b) - combinationRank(a))[0];
  if (fillCombo && thresholdIndex[fillCombo.severity] !== undefined) {
    datasets.push({
      label: translate(`${SEVERITY_NAME[fillCombo.severity]} mean fill`),
      excludeFromTable: true,
      data: flatWindow(fillCombo, fillCombo.avgProbability),
      borderColor: 'rgba(0,0,0,0)',
      backgroundColor: AAFloodColors.chart[fillCombo.severity].fill,
      borderWidth: 0,
      pointRadius: 0,
      fill: thresholdIndex[fillCombo.severity],
    });
  }
  return { labels, datasets };
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    container: {
      position: 'fixed',
      top: '56px',
      left: TABLE_WIDTH + 16,
      width: CHART_WIDTH,
      marginLeft: '2rem',
      height: 'calc(100vh - 130px)',
      maxHeight: 'calc(100vh - 130px)',
      // Above the app bar, so the map legend (rendered inside it) sits behind this panel.
      zIndex: theme.zIndex.modal,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
    paper: {
      height: '100%',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 1rem 0 1rem',
    },
    title: {
      fontWeight: 'bold',
      fontSize: '1.2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      paddingBottom: '0.5rem',
    },
    closeButton: {
      marginTop: '-1rem',
    },
    tabs: {
      minHeight: '34px',
      borderBottom: '1px solid #D4D4D4',
      display: 'flex',
      gap: '4px',
      margin: '0 1rem',
    },
    tab: {
      border: '1px solid #D4D4D4',
      borderBottom: 'none',
      borderRadius: '4px 4px 0 0',
      fontSize: '12px',
      color: '#000',
      textTransform: 'none',
      background: '#F1F1F1',
      minWidth: '150px',
    },
    selectedTab: {
      background: '#FFF',
      fontWeight: 'bold',
    },
    tabPanel: {
      flex: 1,
      minHeight: 0,
      margin: '0 1rem',
      border: '1px solid #D4D4D4',
      borderTop: 'none',
      padding: '0.5rem',
      overflow: 'auto',
    },
    chartContainer: {
      height: '260px',
      position: 'relative',
    },
    chartTitle: {
      marginBottom: '1rem',
      fontWeight: 'bold',
      fontSize: '1rem',
    },
    noDataMessage: {
      textAlign: 'center',
      color: '#666',
      fontStyle: 'italic',
      padding: '2rem',
    },
    actionButtons: {
      flexShrink: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '1.5rem',
      marginTop: 'auto',
      backgroundColor: cyanBlue,
    },
    actionButton: {
      textTransform: 'none',
      fontSize: '0.9rem',
      color: '#fff',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
      },
      '&.Mui-disabled': {
        color: 'rgba(255, 255, 255, 0.7)',
      },
    },
    tableContainer: {
      height: '400px',
      overflow: 'auto',
      color: '#000',
    },
    tableCell: {
      fontSize: '0.8rem',
      padding: '8px',
      color: '#000000',
    },
    tableHeader: {
      fontWeight: 'bold',
      fontSize: '0.8rem',
      minWidth: '40px',
      backgroundColor: '#f5f5f5',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      zIndex: 10,
      flexDirection: 'column',
      gap: '1rem',
    },
    titleRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    },
    statusChip: {
      fontSize: '0.75rem',
      fontWeight: 600,
      borderRadius: 16,
      padding: '4px 10px',
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
    },
    phaseToggle: {
      display: 'flex',
      gap: 8,
      padding: '0 1rem 0.75rem',
    },
    phaseButton: {
      textTransform: 'none',
      borderRadius: 20,
      minWidth: 110,
      border: '1px solid var(--phase-ink, #D4D4D4)',
      color: 'var(--phase-ink, #555)',
      backgroundColor: '#fff',
      fontSize: 13,
      '&&:hover': {
        backgroundColor: '#fff',
        color: 'var(--phase-ink, #555)',
        borderColor: 'var(--phase-ink, #D4D4D4)',
      },
    },
    phaseReadiness: {
      borderStyle: 'dashed',
    },
    phaseSelected: {
      backgroundColor: 'var(--phase-color, #FF8C21)',
      color: 'var(--phase-text, #fff)',
      borderColor: 'var(--phase-color, #FF8C21)',
      fontWeight: 600,
      '&&:hover': {
        backgroundColor: 'var(--phase-color, #FF8C21)',
        color: 'var(--phase-text, #fff)',
        filter: 'brightness(0.92)',
      },
    },
    comboTable: {
      marginTop: '0.5rem',
    },
    comboHeader: {
      fontWeight: 600,
      fontSize: '0.75rem',
      color: '#333',
      padding: '6px 8px',
    },
    comboCell: {
      fontSize: '0.8rem',
      padding: '4px 8px',
      color: '#111',
    },
    chartSentence: {
      fontSize: '0.85rem',
      color: '#222',
      margin: '0.25rem 0 0.5rem',
    },
    chartWindow: {
      fontSize: '0.8rem',
      fontWeight: 600,
      textAlign: 'center',
      marginBottom: '0.25rem',
    },
    chartLegend: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px 14px',
      fontSize: '0.7rem',
      color: '#333',
      margin: '0.35rem 0 0.5rem',
    },
    legendItem: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    },
  }),
);

// (removed unused chartFillColor helper)

interface StationChartsProps {
  station: FloodStation;
  onClose?: () => void;
}

function phaseButtonVars(
  combinations: FloodTriggerCombination[] | undefined,
  phase: AAFloodPhase,
): CSSProperties {
  const level = phaseStatusLevel(combinations, phase);
  const fill = level
    ? getFloodRiskColor(level)
    : AAFloodColors.riskLevels.noData;
  const darkText = level === 'Bankfull' || level === 'Not exceeded';
  // Bankfull yellow disappears on white. Outline uses a darker gold.
  const ink = level === 'Bankfull' ? '#6F5600' : fill;
  return {
    '--phase-color': fill,
    '--phase-ink': ink,
    '--phase-text': darkText ? '#1a1a1a' : '#fff',
  } as CSSProperties;
}

function StationCharts({ station, onClose }: StationChartsProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const floodState = useSelector(AAFloodDataSelector);
  const activeTab = floodState.stationDetailActiveTab === 1 ? 1 : 0;
  const viewMode = floodState.stationDetailViewMode ?? 'chart';
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMenuAnchor, setDownloadMenuAnchor] =
    useState<null | HTMLElement>(null);
  const [phaseSelection, setPhaseSelection] = useState<{
    statusKey: string;
    phase: AAFloodPhase;
    severities: AAFloodSeverityKey[];
  }>({ statusKey: '', phase: 'activation', severities: [] });
  const hydrographChartRef = useRef<Line>(null);
  const probabilityChartRef = useRef<Line>(null);

  if (!station) {
    return null;
  }

  const stationKey = floodStationKey(station.station_id, station.station_name);
  const probs = floodState.probabilitiesData[stationKey];
  const stationSummary = floodState.stationSummaryData
    ? floodState.stationSummaryData[stationKey]
    : undefined;
  const parsedStatus = parseFloodStatus(
    stationSummary?.floodStatus || stationSummary?.trigger_status,
  );
  const activeCombination = stationSummary?.combinations?.find(
    combo => `${combo.phase}_${combo.severity}` === parsedStatus.id,
  );
  const statusKey = `${stationKey}|${floodState.selectedDate ?? ''}|${parsedStatus.id}`;
  const selectionReady = phaseSelection.statusKey === statusKey;
  const viewPhase = selectionReady
    ? phaseSelection.phase
    : defaultChartPhase(parsedStatus);
  const phaseCombinations = (stationSummary?.combinations ?? []).filter(
    combo => combo.phase === viewPhase,
  );
  const visibleSeverities = selectionReady
    ? phaseSelection.severities
    : [
        focusCombination(stationSummary?.combinations, viewPhase)?.severity,
      ].filter((severity): severity is AAFloodSeverityKey => Boolean(severity));
  const visibleCombinations = SEVERITY_ORDER.map(severity =>
    phaseCombinations.find(combo => combo.severity === severity),
  ).filter(
    (combo): combo is FloodTriggerCombination =>
      combo != null && visibleSeverities.includes(combo.severity),
  );
  const highlighted =
    [...visibleCombinations].sort(
      (a, b) => combinationRank(b) - combinationRank(a),
    )[0] ?? null;
  const usesCombinationWindows = Boolean(stationSummary?.combinations?.length);

  const selectPhase = (phase: AAFloodPhase) => {
    const focus = focusCombination(stationSummary?.combinations, phase);
    setPhaseSelection({
      statusKey,
      phase,
      severities: focus ? [focus.severity] : [],
    });
  };
  const selectSeverity = (severity: AAFloodSeverityKey) => {
    const already =
      visibleSeverities.length === 1 && visibleSeverities[0] === severity;
    setPhaseSelection({
      statusKey,
      phase: viewPhase,
      severities: already ? [] : [severity],
    });
  };

  // Prepare hydrograph data using fetched forecast (discharge) data
  const hydrographData = useMemo(() => {
    const forecast = floodState.forecastData[stationKey] || [];
    if (!forecast.length) {
      return null;
    }

    // Use valid_time dates for x-axis labels (same as probability format)
    const labels = forecast.map(
      p => getFormattedDate(p.time, 'shortDayFirst') as string,
    );
    // Guard against missing or empty probs array
    if (!probs || !Array.isArray(probs) || probs.length === 0) {
      return null;
    }
    const { thresholdBankfull, thresholdModerate, thresholdSevere } = probs[0];
    const dischargeFallback: Record<AAFloodSeverityKey, number> = {
      bankfull: thresholdBankfull,
      moderate: thresholdModerate,
      severe: thresholdSevere,
    };
    const shownSeverities = usesCombinationWindows
      ? SEVERITY_ORDER.filter(
          severity =>
            visibleSeverities.includes(severity) &&
            phaseCombinations.some(combo => combo.severity === severity),
        )
      : SEVERITY_ORDER;
    const thresholdLabel: Record<AAFloodSeverityKey, string> = {
      bankfull: t('Bankfull threshold'),
      moderate: t('Moderate threshold'),
      severe: t('Severe threshold'),
    };

    const membersCount = forecast[0]?.ensemble_members?.length || 0;
    const ensembleDatasets = Array.from(
      { length: membersCount },
      (_v, mIdx) => ({
        label: `Member ${mIdx + 1}`,
        data: forecast.map(fp => fp.ensemble_members[mIdx] ?? 0),
        borderColor: AAFloodColors.chart.ensemble.border,
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line' as const,
        hoverRadius: 0,
        fill: false,
        tension: 0.35,
      }),
    );

    const meanSeries = forecast.map(p => {
      const arr = p.ensemble_members || [];
      if (!arr.length) {
        return 0;
      }
      const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
      // round to 2 decimal places
      return Math.round(avg * 100) / 100;
    });
    const meanDataset = {
      label: t('Ensemble Mean'),
      data: meanSeries,
      borderColor: AAFloodColors.chart.ensemble.mean,
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      pointStyle: 'line' as const,
      fill: false,
      tension: 0.4,
    };
    const thresholdDatasets = shownSeverities.map(severity => {
      const combo = phaseCombinations.find(item => item.severity === severity);
      const value =
        combo?.dischargeThreshold != null
          ? combo.dischargeThreshold
          : dischargeFallback[severity];
      return {
        label: thresholdLabel[severity],
        severity,
        data: Array.from({ length: labels.length }, () => value),
        borderColor: AAFloodColors.chart[severity].solid,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 0,
        pointStyle: 'line' as const,
      };
    });

    return {
      labels,
      datasets: usesCombinationWindows
        ? [...ensembleDatasets, meanDataset, ...thresholdDatasets]
        : [meanDataset, ...thresholdDatasets, ...ensembleDatasets],
    };
  }, [
    floodState.forecastData,
    stationKey,
    probs,
    t,
    usesCombinationWindows,
    visibleSeverities,
    phaseCombinations,
  ]);

  // Prepare trigger probability data from fetched probabilities
  const sortedData = sortBy(probs, p => new Date(p.time).getTime());
  const labels = sortedData.map(
    d => getFormattedDate(d.time, 'shortDayFirst') as string,
  );

  const legacyWindow = usesCombinationWindows
    ? windowIndexBounds(sortedData, highlighted)
    : { beginIdx: forecastWindow.start - 1, endIdx: forecastWindow.end - 1 };
  const { beginIdx } = legacyWindow;
  const { endIdx } = legacyWindow;
  const leadTimes = sortedData.map(point => point.time);
  const windowStartDay =
    beginIdx >= 0
      ? forecastLeadDay(leadTimes, sortedData[beginIdx].time)
      : undefined;
  const windowEndDay =
    endIdx >= 0
      ? forecastLeadDay(leadTimes, sortedData[endIdx].time)
      : undefined;

  const triggerProbabilityData = useMemo(() => {
    if (!probs || probs.length === 0) {
      return null;
    }
    if (usesCombinationWindows) {
      return combinationProbabilityData(
        sortedData,
        labels,
        visibleCombinations,
        key => String(t(key)),
      );
    }

    const bankfullSeries = sortedData.map(d => d.bankfullPercentage);
    const moderateSeries = sortedData.map(d => d.moderatePercentage);
    const severeSeries = sortedData.map(d => d.severePercentage);

    // Legacy files: means from the single window. New files: the active combination only.
    const meanFor = (
      severity: 'bankfull' | 'moderate' | 'severe',
      legacy: number | undefined,
    ): number | null => {
      if (!usesCombinationWindows) {
        return legacy ?? 0;
      }
      if (activeCombination?.severity !== severity) {
        return null;
      }
      return activeCombination.avgProbability;
    };
    const bankfullMean = meanFor(
      'bankfull',
      stationSummary?.avg_bankfull_percentage,
    );
    const moderateMean = meanFor(
      'moderate',
      stationSummary?.avg_moderate_percentage,
    );
    const severeMean = meanFor('severe', stationSummary?.avg_severe_percentage);

    // Build flat series over the window only (NaN elsewhere)
    const flatWindowSeries = (value: number | null) =>
      bankfullSeries.map((_v, idx) =>
        beginIdx >= 0 && endIdx >= 0 && idx >= beginIdx && idx <= endIdx
          ? (value ?? NaN)
          : NaN,
      );

    // New files trust the pipeline status. Legacy files still compare mean > trigger.
    const bankfullExceeded = usesCombinationWindows
      ? activeCombination?.severity === 'bankfull'
      : typeof stationSummary?.trigger_bankfull === 'number' &&
        (bankfullMean ?? 0) > stationSummary.trigger_bankfull;
    const moderateExceeded = usesCombinationWindows
      ? activeCombination?.severity === 'moderate'
      : typeof stationSummary?.trigger_moderate === 'number' &&
        (moderateMean ?? 0) > stationSummary.trigger_moderate;
    const severeExceeded = usesCombinationWindows
      ? activeCombination?.severity === 'severe'
      : typeof stationSummary?.trigger_severe === 'number' &&
        (severeMean ?? 0) > stationSummary.trigger_severe;
    const thresholdFillIndex = usesCombinationWindows
      ? 0
      : (() => {
          if (severeExceeded) {
            return 2;
          }
          if (moderateExceeded) {
            return 1;
          }
          return 0;
        })();

    const fillDatasets: any[] = (() => {
      if (severeExceeded) {
        return [
          {
            label: t('Severe mean fill'),
            data: flatWindowSeries(severeMean),
            borderColor: 'rgba(0,0,0,0)',
            backgroundColor: 'rgba(230, 55, 1, 0.25)',
            borderWidth: 0,
            pointRadius: 0,
            fill: thresholdFillIndex,
            tension: 0,
            lineTension: 0,
          },
        ];
      }
      if (moderateExceeded) {
        return [
          {
            label: t('Moderate mean fill'),
            data: flatWindowSeries(moderateMean),
            borderColor: 'rgba(0,0,0,0)',
            backgroundColor: 'rgba(255, 140, 33, 0.25)',
            borderWidth: 0,
            pointRadius: 0,
            fill: thresholdFillIndex,
            tension: 0,
            lineTension: 0,
          },
        ];
      }
      if (bankfullExceeded) {
        return [
          {
            label: t('Bankfull mean fill'),
            data: flatWindowSeries(bankfullMean),
            borderColor: 'rgba(0,0,0,0)',
            backgroundColor: 'rgba(255, 204, 0, 0.25)',
            borderWidth: 0,
            pointRadius: 0,
            fill: thresholdFillIndex,
            tension: 0,
            lineTension: 0,
          },
        ];
      }
      return [];
    })();

    const thresholdColor = {
      bankfull: 'rgba(255, 204, 0, 0.8)',
      moderate: 'rgba(255, 140, 33, 0.8)',
      severe: 'rgba(230, 55, 1, 0.8)',
    };
    const thresholdLabel = {
      bankfull: t('Bankfull'),
      moderate: t('Moderate'),
      severe: t('Severe'),
    };
    const legacyThresholds = [
      stationSummary?.trigger_bankfull !== undefined && {
        severity: 'bankfull' as const,
        value: stationSummary!.trigger_bankfull as number,
      },
      stationSummary?.trigger_moderate !== undefined && {
        severity: 'moderate' as const,
        value: stationSummary!.trigger_moderate as number,
      },
      stationSummary?.trigger_severe !== undefined && {
        severity: 'severe' as const,
        value: stationSummary!.trigger_severe as number,
      },
    ].filter(Boolean) as {
      severity: 'bankfull' | 'moderate' | 'severe';
      value: number;
    }[];
    const activeThresholds =
      usesCombinationWindows && typeof activeCombination?.trigger === 'number'
        ? [
            {
              severity: activeCombination.severity,
              value: activeCombination.trigger,
            },
          ]
        : legacyThresholds;
    const shownThresholds = usesCombinationWindows
      ? activeThresholds
      : legacyThresholds;
    const thresholdDatasets = shownThresholds.map(item => ({
      label: `${thresholdLabel[item.severity]} ${t('threshold')}`,
      data: Array.from({ length: labels.length }, () => item.value),
      borderColor: thresholdColor[item.severity],
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [6, 6],
      pointRadius: 0,
      fill: false,
    }));

    return {
      labels,
      datasets: [
        ...thresholdDatasets,
        // Normal lines (no fill)
        {
          label: t('Bankfull'),
          data: bankfullSeries,
          borderColor: AAFloodColors.chart.bankfull.transparent,
          backgroundColor: AAFloodColors.chart.bankfull.transparent,
          borderWidth: 2,
          showLine: false,
          pointRadius: 3,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        {
          label: t('Moderate'),
          data: moderateSeries,
          borderColor: AAFloodColors.chart.moderate.transparent,
          backgroundColor: AAFloodColors.chart.moderate.transparent,
          borderWidth: 2,
          showLine: false,
          pointRadius: 3,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        {
          label: t('Severe'),
          data: severeSeries,
          borderColor: AAFloodColors.chart.severe.transparent,
          backgroundColor: AAFloodColors.chart.severe.transparent,
          borderWidth: 2,
          showLine: false,
          pointRadius: 3,
          fill: true,
          tension: 0,
          lineTension: 0,
        },
        // Mean lines over window only (no fill)
        {
          label: t('Bankfull mean (window)'),
          data: flatWindowSeries(bankfullMean),
          borderColor: AAFloodColors.chart.bankfull.solid,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        {
          label: t('Moderate mean (window)'),
          data: flatWindowSeries(moderateMean),
          borderColor: AAFloodColors.chart.moderate.solid,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        {
          label: t('Severe mean (window)'),
          data: flatWindowSeries(severeMean),
          borderColor: AAFloodColors.chart.severe.solid,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        // Conditional mean-to-threshold fill: include only highest severity exceeded
        ...fillDatasets,
      ],
    };
  }, [
    probs,
    stationSummary,
    sortedData,
    t,
    labels,
    beginIdx,
    endIdx,
    usesCombinationWindows,
    activeCombination,
    visibleCombinations,
  ]);

  const hydrographOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      elements: {
        point: {
          // Improve hoverability without showing points
          hitRadius: 8,
        },
      },
      tooltips: {
        mode: 'index' as const,
        intersect: false,
        // Hide ensemble members from tooltips
        filter: (tooltipItem: any, data: any) => {
          const datasetLabel = String(
            data?.datasets?.[tooltipItem.datasetIndex]?.label ?? '',
          );
          return !/^Member\s\d+$/i.test(datasetLabel);
        },
        callbacks: {
          // Add min and max values to the tooltip
          afterBody: (items: any[]) => {
            if (!items || !items.length) {
              return [] as string[];
            }
            const idx = items[0].index as number;
            const p = (floodState.forecastData[stationKey] || [])[idx];
            const arr: number[] = p?.ensemble_members || [];
            if (!arr.length) {
              return [] as string[];
            }
            const min = Math.min(...arr).toFixed(2);
            const max = Math.max(...arr).toFixed(2);
            return [
              `${String(t('Min'))}: ${min}`,
              `${String(t('Max'))}: ${max}`,
            ];
          },
        },
      },
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 12,
          padding: 15,
          fontSize: 11,
          // Hide ensemble members from legend using the dataset label
          filter: (legendItem: any, chartData: any) => {
            const datasetLabel = String(
              chartData?.datasets?.[legendItem.datasetIndex]?.label ?? '',
            );
            return !/^Member\s\d+$/i.test(datasetLabel);
          },
        },
      },
      scales: {
        xAxes: [
          {
            display: true,
            scaleLabel: {
              display: false,
            },
            ticks: { maxRotation: 0, autoSkip: true },
          },
        ],
        yAxes: [
          {
            display: true,
            ticks: { beginAtZero: true },
            scaleLabel: {
              display: true,
              labelString: t('River Discharge (m³/s)'),
            },
          },
        ],
      },
    }),
    [t, floodState.forecastData, stationKey],
  );

  const forecastSeries = floodState.forecastData[stationKey] || [];
  const selectedWindow = windowIndexBounds(forecastSeries, highlighted);
  const probabilityByDay = new Map(
    (probs ?? []).map(point => [point.time.slice(0, 10), point]),
  );
  const selectedSeverity = highlighted?.severity;
  const dailyValues = forecastSeries.map(point => {
    const match = probabilityByDay.get(point.time.slice(0, 10));
    if (!match || !selectedSeverity) {
      return null;
    }
    const field = {
      bankfull: match.bankfullPercentage,
      moderate: match.moderatePercentage,
      severe: match.severePercentage,
    }[selectedSeverity];
    return field;
  });
  const phaseExceeded = phaseCombinations.some(combo => combo.exceeded);
  const chartSentence = (() => {
    if (!highlighted || highlighted.trigger == null) {
      return phaseExceeded
        ? t('Select a severity to see its threshold and daily exceedance.')
        : t('No scored window reaches its trigger.');
    }
    const above =
      highlighted.exceeded || highlighted.avgProbability >= highlighted.trigger;
    return t(
      above
        ? '{{percent}}% of the ensemble exceeds the {{severity}} threshold on average across {{start}} – {{end}}, above the {{trigger}}% trigger.'
        : '{{percent}}% of the ensemble exceeds the {{severity}} threshold on average across {{start}} – {{end}}, below the {{trigger}}% trigger.',
      {
        percent: highlighted.avgProbability.toFixed(1),
        severity: t(SEVERITY_NAME[highlighted.severity]),
        start: dayMon(highlighted.windowBegin),
        end: dayMon(highlighted.windowEnd),
        trigger: highlighted.trigger.toFixed(1),
      },
    );
  })();
  const chartWindowTitle = highlighted
    ? t('{{phase}} window {{start}} – {{end}}', {
        phase: t(
          highlighted.phase === 'activation' ? 'Activation' : 'Readiness',
        ),
        start: dayMon(highlighted.windowBegin),
        end: dayMon(highlighted.windowEnd),
      })
    : '';

  const combinedOptions = useMemo(() => {
    const severityColor = selectedSeverity
      ? AAFloodColors.chart[selectedSeverity].solid
      : '#888';
    const darkPill = selectedSeverity === 'bankfull';
    const gap =
      highlighted?.trigger == null
        ? null
        : highlighted.trigger - highlighted.avgProbability;
    const met = Boolean(highlighted?.exceeded);
    const pill = highlighted
      ? [
          met
            ? t('Met')
            : gap != null
              ? t('{{gap}} to go', { gap: gap.toFixed(1) })
              : '',
          t('Avg. {{percent}}%', {
            percent: highlighted.avgProbability.toFixed(1),
          }),
          highlighted.trigger == null
            ? ''
            : t('trigger {{percent}}%', {
                percent: highlighted.trigger.toFixed(1),
              }),
        ]
          .filter(Boolean)
          .join('   ')
      : '';
    const dailyExceedance: DailyExceedance | undefined =
      selectedSeverity && highlighted
        ? {
            values: dailyValues,
            dates: forecastSeries.map(point => dayMon(point.time)),
            beginIdx: selectedWindow.beginIdx,
            endIdx: selectedWindow.endIdx,
            color: severityColor,
            pill,
            pillFill: met ? severityColor : '#fff',
            pillText: met && !darkPill ? '#fff' : '#1a1a1a',
            pillDash: !met,
          }
        : undefined;

    return {
      ...hydrographOptions,
      legend: { display: false },
      layout: { padding: { bottom: 68, right: 18, left: 4 } },
      dailyExceedance,
      scales: {
        xAxes: [
          {
            display: true,
            offset: true,
            gridLines: { display: false },
            ticks: { display: false },
          },
        ],
        yAxes: [
          {
            display: true,
            ticks: { beginAtZero: true },
            scaleLabel: {
              display: true,
              labelString: t('Discharge (m³/s)'),
            },
          },
        ],
      },
    };
  }, [
    hydrographOptions,
    selectedWindow.beginIdx,
    selectedWindow.endIdx,
    selectedSeverity,
    highlighted,
    dailyValues,
    forecastSeries,
    t,
  ]);

  const probabilityOptions = useMemo(() => {
    if (!probs || probs.length === 0) {
      return hydrographOptions;
    }

    // Compute y-axis max rounded up to the next dizaine (multiple of 10)
    const triggerPcts = [
      stationSummary?.trigger_bankfull,
      stationSummary?.trigger_moderate,
      stationSummary?.trigger_severe,
      activeCombination?.trigger,
      ...(stationSummary?.combinations ?? []).flatMap(combo => [
        combo.trigger,
        combo.avgProbability,
      ]),
    ].filter((v): v is number => typeof v === 'number');
    const maxPct = Math.max(
      50,
      ...triggerPcts,
      ...probs.map(d =>
        Math.max(
          d.bankfullPercentage,
          d.moderatePercentage,
          d.severePercentage,
        ),
      ),
    );
    const maxTick = Math.ceil((maxPct + 10) / 10) * 10;

    const windowBeginLabel = labels[beginIdx];
    const windowEndLabel = labels[endIdx];
    const annotations = [
      ...(windowBeginLabel
        ? [
            {
              type: 'line',
              mode: 'vertical',
              scaleID: 'x-axis-0',
              value: windowBeginLabel,
              borderColor: AAFloodColors.annotation.forecastStart,
              borderDash: [4, 4],
              borderWidth: 1,
              label: {
                enabled: true,
                position: 'top',
                content: usesCombinationWindows
                  ? t('Day {{start}}–{{end}}', {
                      start: windowStartDay,
                      end: windowEndDay,
                    })
                  : t('{{day}}-day forecast', {
                      day: windowStartDay,
                    }),
                backgroundColor: 'rgba(0,0,0,0)',
                fontColor: AAFloodColors.annotation.forecastStart,
                xAdjust: usesCombinationWindows ? 28 : -50,
              },
            },
          ]
        : []),
      ...(windowEndLabel
        ? [
            {
              type: 'line',
              mode: 'vertical',
              scaleID: 'x-axis-0',
              value: windowEndLabel,
              borderColor: AAFloodColors.annotation.forecastEnd,
              borderDash: [4, 4],
              borderWidth: 1,
              label: {
                enabled: !usesCombinationWindows,
                position: 'top',
                content: t('{{day}}-day forecast', { day: windowEndDay }),
                backgroundColor: 'rgba(0,0,0,0)',
                fontColor: AAFloodColors.annotation.forecastEnd,
                xAdjust: -50,
              },
            },
          ]
        : []),
    ];

    return {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        display: false,
      },
      scales: {
        xAxes: [
          {
            gridLines: { display: false },
            scaleLabel: { display: false },
            ticks: { maxRotation: 0, autoSkip: true },
          },
        ],
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
              max: maxTick,
            },
            scaleLabel: {
              display: usesCombinationWindows,
              labelString: t('Probability (%)'),
            },
          },
        ],
      },
      annotation: {
        drawTime: 'beforeDatasetsDraw',
        annotations,
      },
    } as any;
  }, [
    probs,
    stationSummary,
    labels,
    beginIdx,
    endIdx,
    t,
    hydrographOptions,
    windowStartDay,
    windowEndDay,
    activeCombination,
    usesCombinationWindows,
    viewPhase,
  ]);

  const handleTabChange = (newValue: number) => {
    dispatch(setAAFloodStationDetailActiveTab(newValue));
    dispatch(setAAFloodStationDetailViewMode('chart'));
  };

  const toggleViewMode = () => {
    dispatch(
      setAAFloodStationDetailViewMode(viewMode === 'chart' ? 'table' : 'chart'),
    );
  };

  const openDownloadMenu = (event: ReactMouseEvent<HTMLElement>) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  const closeDownloadMenu = () => setDownloadMenuAnchor(null);

  const downloadChart = () => {
    const chartRef =
      usesCombinationWindows || activeTab === 1
        ? hydrographChartRef
        : probabilityChartRef;
    const chartName = usesCombinationWindows
      ? 'Forecast'
      : activeTab === 1
        ? 'Hydrograph'
        : 'Trigger Probability';
    const { chartInstance } = chartRef.current ?? ({} as any);

    if (chartInstance && chartInstance.ctx) {
      const base64Image = chartInstance.toBase64Image();
      const link = document.createElement('a');
      link.setAttribute('href', base64Image);
      link.setAttribute('download', `${station.station_name}_${chartName}.png`);
      link.click();
    } else {
      console.error('Chart instance not available for download');
    }
  };

  const combinedTableData = useMemo(() => {
    if (!usesCombinationWindows || !forecastSeries.length) {
      return null;
    }
    const cell = (value: number | null | undefined, digits = 2) =>
      value == null || Number.isNaN(Number(value))
        ? '-'
        : Number(value).toFixed(digits);
    const percent = (value: number | null | undefined) =>
      value == null || Number.isNaN(Number(value))
        ? '-'
        : `${Number(value).toFixed(1)}%`;
    const comboFor = (severity: AAFloodSeverityKey) =>
      phaseCombinations.find(combo => combo.severity === severity);
    const thresholdFor = (severity: AAFloodSeverityKey) => {
      const combo = comboFor(severity);
      if (combo?.dischargeThreshold != null) {
        return combo.dischargeThreshold;
      }
      const point = probs?.[0];
      if (!point) {
        return null;
      }
      return {
        bankfull: point.thresholdBankfull,
        moderate: point.thresholdModerate,
        severe: point.thresholdSevere,
      }[severity];
    };
    const columnNames = [
      t('Date'),
      t('Ensemble Mean'),
      t('Min'),
      t('Max'),
      ...SEVERITY_ORDER.map(severity =>
        t(`${SEVERITY_NAME[severity]} threshold`),
      ),
      ...SEVERITY_ORDER.map(severity => t(SEVERITY_NAME[severity])),
      ...SEVERITY_ORDER.map(severity =>
        t(`${SEVERITY_NAME[severity]} mean (window)`),
      ),
    ];
    const tableValues = forecastSeries.map(point => {
      const members = point.ensemble_members || [];
      const mean = members.length
        ? members.reduce((sum, value) => sum + value, 0) / members.length
        : null;
      const day = point.time.slice(0, 10);
      const probability = probabilityByDay.get(day);
      const daily = {
        bankfull: probability?.bankfullPercentage,
        moderate: probability?.moderatePercentage,
        severe: probability?.severePercentage,
      };
      return [
        dayMon(point.time),
        cell(mean),
        cell(members.length ? Math.min(...members) : null),
        cell(members.length ? Math.max(...members) : null),
        ...SEVERITY_ORDER.map(severity => cell(thresholdFor(severity))),
        ...SEVERITY_ORDER.map(severity => percent(daily[severity])),
        ...SEVERITY_ORDER.map(severity => {
          const combo = comboFor(severity);
          if (
            !combo ||
            !isForecastDateInWindow(
              point.time,
              combo.windowBegin,
              combo.windowEnd,
            )
          ) {
            return '-';
          }
          return percent(combo.avgProbability);
        }),
      ];
    });
    return { columnNames, tableValues };
  }, [
    usesCombinationWindows,
    forecastSeries,
    phaseCombinations,
    probabilityByDay,
    probs,
    t,
  ]);

  const downloadTable = () => {
    const tableName = usesCombinationWindows
      ? 'Forecast'
      : activeTab === 1
        ? 'Hydrograph'
        : 'Trigger_Probability';
    const tableData = usesCombinationWindows
      ? combinedTableData
      : activeTab === 1
        ? hydrographTableData
        : triggerProbabilityTableData;

    if (tableData) {
      const csvContent = [
        tableData.columnNames.join(','),
        ...tableData.tableValues.map(row =>
          row.map(cell => `"${cell}"`).join(','),
        ),
      ].join('\n');

      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${station.station_name}_${tableName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      console.error('Table data not available for download');
    }
  };

  const hydrographTableData = useMemo(() => {
    const fc = floodState.forecastData[stationKey] ?? [];
    const hd = hydrographData;

    if (!hd?.datasets?.length || !fc.length) {
      return null;
    }
    const ensembleMean = hd.datasets.find(
      dataset => dataset.label === t('Ensemble Mean'),
    );
    const thresholds = hd.datasets.filter(
      dataset => 'severity' in dataset && dataset.severity,
    );
    // get minimum and maximum ensemble member values
    const ensembleMin = fc.map(p =>
      p?.ensemble_members?.length
        ? Math.round(Math.min(...p.ensemble_members) * 100) / 100
        : null,
    );
    const ensembleMax = fc.map(p =>
      p?.ensemble_members?.length
        ? Math.round(Math.max(...p.ensemble_members) * 100) / 100
        : null,
    );
    // create hydrograph table
    const columns = [
      t('Day'),
      ensembleMean?.label || t('Ensemble Mean'),
      t('Min'),
      t('Max'),
      ...thresholds.map(dataset => dataset.label),
    ];

    const cell = (v: number | null | undefined) =>
      v === null || v === undefined || Number.isNaN(Number(v)) ? '-' : v;

    const rows = (hd.labels as string[]).map((label, i) => [
      label ?? '',
      cell(ensembleMean?.data?.[i]),
      cell(ensembleMin[i]),
      cell(ensembleMax[i]),
      ...thresholds.map(dataset => cell(dataset.data?.[i])),
    ]);

    return { columnNames: columns, tableValues: rows };
  }, [hydrographData, floodState.forecastData, stationKey, t]);

  const triggerProbabilityTableData = useMemo(() => {
    if (!triggerProbabilityData || !triggerProbabilityData.datasets) {
      return null;
    }

    // Filter out mean fill datasets from table view
    const tableDatasets = triggerProbabilityData.datasets.filter(
      dataset =>
        !dataset.excludeFromTable && !dataset.label?.includes('mean fill'),
    );

    const columnNames = [t('Date'), ...tableDatasets.map(d => d.label || '')];

    const tableValues = (triggerProbabilityData.labels as string[]).map(
      (rowLabel, rowIndex: number) => [
        rowLabel ?? '',
        ...tableDatasets.map(dataset => {
          const value = dataset.data?.[rowIndex];
          return value ? `${Number(value).toFixed(1)}%` : '-';
        }),
      ],
    );

    return {
      columnNames,
      tableValues,
    };
  }, [triggerProbabilityData, t]);

  const mount = (node: ReactElement) => createPortal(node, document.body);

  if (!floodState.probabilitiesData[stationKey]) {
    return mount(
      <div className={classes.container}>
        <Paper className={classes.paper}>
          <div className={classes.header}>
            <Typography className={classes.title}>
              {station.station_name}
            </Typography>
            {onClose && (
              <IconButton
                className={classes.closeButton}
                onClick={onClose}
                size="small"
              >
                <Close />
              </IconButton>
            )}
          </div>
          <div className={classes.tabPanel}>
            <Typography className={classes.noDataMessage}>
              {t('No historical data available for {{station}}', {
                station: station.station_name,
              })}
            </Typography>
          </div>
        </Paper>
      </div>,
    );
  }

  return mount(
    <div className={classes.container}>
      <Paper className={classes.paper}>
        <div className={classes.header}>
          <div className={classes.titleRow}>
            <Typography className={classes.title}>
              {station.station_name}
            </Typography>
            {parsedStatus.id && (
              <span
                className={classes.statusChip}
                style={{
                  backgroundColor: getFloodRiskColor(parsedStatus.severity),
                  color:
                    parsedStatus.severity === 'Bankfull' ||
                    parsedStatus.severity === 'Not exceeded'
                      ? '#1a1a1a'
                      : '#fff',
                }}
              >
                {parsedStatus.phase
                  ? `${t(
                      parsedStatus.phase === 'activation'
                        ? 'Activation'
                        : 'Readiness',
                    )} · ${t(parsedStatus.severity)}`
                  : t(parsedStatus.severity)}
              </span>
            )}
          </div>
          {onClose && (
            <IconButton
              className={classes.closeButton}
              onClick={onClose}
              size="small"
            >
              <Close />
            </IconButton>
          )}
        </div>

        {usesCombinationWindows && (
          <div
            className={classes.phaseToggle}
            role="group"
            aria-label={t('Phase')}
          >
            <Button
              type="button"
              className={`${classes.phaseButton} ${classes.phaseReadiness} ${
                viewPhase === 'readiness' ? classes.phaseSelected : ''
              }`}
              style={phaseButtonVars(stationSummary?.combinations, 'readiness')}
              aria-pressed={viewPhase === 'readiness'}
              onClick={() => selectPhase('readiness')}
            >
              {t('Readiness')}
            </Button>
            <Button
              type="button"
              className={`${classes.phaseButton} ${
                viewPhase === 'activation' ? classes.phaseSelected : ''
              }`}
              style={phaseButtonVars(
                stationSummary?.combinations,
                'activation',
              )}
              aria-pressed={viewPhase === 'activation'}
              onClick={() => selectPhase('activation')}
            >
              {t('Activation')}
            </Button>
          </div>
        )}

        {!usesCombinationWindows && (
          <div className={classes.tabs}>
            <Button
              disableRipple
              className={`${classes.tab} ${activeTab === 0 ? classes.selectedTab : ''}`}
              onClick={() => handleTabChange(0)}
            >
              {t('Trigger probability')}
            </Button>
            <Button
              disableRipple
              className={`${classes.tab} ${activeTab === 1 ? classes.selectedTab : ''}`}
              onClick={() => handleTabChange(1)}
            >
              {t('Hydrograph')}
            </Button>
          </div>
        )}

        <div
          className={classes.tabPanel}
          style={
            usesCombinationWindows
              ? { borderTop: '1px solid #D4D4D4' }
              : undefined
          }
        >
          {usesCombinationWindows && (
            <>
              {viewMode === 'chart' && (
                <>
                  <Typography className={classes.chartSentence}>
                    {chartSentence}
                  </Typography>
                  {chartWindowTitle && (
                    <Typography className={classes.chartWindow}>
                      {chartWindowTitle}
                    </Typography>
                  )}
                  <div className={classes.chartContainer}>
                    {hydrographData && (
                      <Line
                        ref={hydrographChartRef}
                        data={hydrographData}
                        options={combinedOptions as any}
                      />
                    )}
                  </div>
                  <div className={classes.chartLegend}>
                    <span className={classes.legendItem}>
                      <span
                        style={{
                          width: 14,
                          height: 10,
                          background: 'rgba(0,0,0,0.08)',
                          display: 'inline-block',
                        }}
                      />
                      {t('Window')}
                    </span>
                    <span className={classes.legendItem}>
                      <span
                        style={{
                          width: 16,
                          borderTop: `2px dashed ${
                            selectedSeverity
                              ? AAFloodColors.chart[selectedSeverity].solid
                              : '#888'
                          }`,
                          display: 'inline-block',
                        }}
                      />
                      {t('Threshold')}
                    </span>
                    <span className={classes.legendItem}>
                      <span
                        style={{
                          width: 16,
                          borderTop: '2px solid rgba(0,0,0,0.25)',
                          display: 'inline-block',
                        }}
                      />
                      {t('Members')}
                    </span>
                    <span className={classes.legendItem}>
                      <span
                        style={{
                          width: 16,
                          borderTop: '2px solid #212121',
                          display: 'inline-block',
                        }}
                      />
                      {t('Ensemble Mean')}
                    </span>
                    <span className={classes.legendItem}>
                      <span
                        style={{
                          width: 14,
                          height: 10,
                          background: '#fb6a4a',
                          display: 'inline-block',
                        }}
                      />
                      {t('% above threshold')}
                    </span>
                  </div>
                </>
              )}
              {viewMode === 'table' && (
                <TableContainer className={classes.tableContainer}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {combinedTableData?.columnNames.map(columnName => (
                          <TableCell
                            key={columnName}
                            className={`${classes.tableCell} ${classes.tableHeader}`}
                          >
                            {columnName}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {combinedTableData?.tableValues.map((row, rowIndex) => (
                        <TableRow key={`combined-row-${row[0] || rowIndex}`}>
                          {row.map((cellValue, cellIndex) => (
                            <TableCell
                              key={`combined-cell-${rowIndex}-${cellIndex}`}
                              className={classes.tableCell}
                            >
                              {cellValue}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
          {!usesCombinationWindows && activeTab === 1 && (
            <>
              <div
                className={classes.chartContainer}
                style={{ display: viewMode === 'chart' ? 'block' : 'none' }}
              >
                {hydrographData && (
                  <Line
                    ref={hydrographChartRef}
                    data={hydrographData}
                    options={hydrographOptions as any}
                  />
                )}
                {isDownloading && (
                  <div className={classes.loadingOverlay}>
                    <CircularProgress />
                    <Typography variant="body2">
                      {t('Preparing chart for download...')}
                    </Typography>
                  </div>
                )}
              </div>
              <TableContainer
                className={classes.tableContainer}
                key={`hydrograph-table-${station.station_name}`}
                style={{ display: viewMode === 'table' ? 'block' : 'none' }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {hydrographTableData?.columnNames.map(columnName => (
                        <TableCell
                          key={columnName}
                          className={`${classes.tableCell} ${classes.tableHeader}`}
                        >
                          {columnName}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hydrographTableData?.tableValues.map((row, rowIndex) => (
                      <TableRow key={`hydrograph-row-${row[0] || rowIndex}`}>
                        {row.map((cellValue, cellIndex) => (
                          <TableCell
                            key={`hydrograph-cell-${row[0] || rowIndex}-${cellIndex}`}
                            className={classes.tableCell}
                          >
                            {cellValue}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {!usesCombinationWindows && activeTab === 0 && (
            <>
              <div
                className={classes.chartContainer}
                style={{
                  display: viewMode === 'chart' ? 'block' : 'none',
                  height: usesCombinationWindows ? 280 : undefined,
                }}
              >
                {triggerProbabilityData && (
                  <Line
                    ref={probabilityChartRef}
                    data={triggerProbabilityData}
                    options={probabilityOptions as any}
                  />
                )}
                {isDownloading && (
                  <div className={classes.loadingOverlay}>
                    <CircularProgress />
                    <Typography variant="body2">
                      {t('Preparing chart for download...')}
                    </Typography>
                  </div>
                )}
              </div>
              <TableContainer
                className={classes.tableContainer}
                key={`trigger-probability-table-${station.station_name}`}
                style={{ display: viewMode === 'table' ? 'block' : 'none' }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {triggerProbabilityTableData?.columnNames.map(
                        columnName => (
                          <TableCell
                            key={columnName}
                            className={`${classes.tableCell} ${classes.tableHeader}`}
                          >
                            {columnName}
                          </TableCell>
                        ),
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody
                    key={`trigger-probability-table-body-${station.station_name}`}
                  >
                    {triggerProbabilityTableData?.tableValues.map(
                      (row, rowIndex) => (
                        <TableRow key={`probability-row-${row[0] || rowIndex}`}>
                          {row.map((cellValue, cellIndex) => (
                            <TableCell
                              key={`probability-cell-${row[0] || rowIndex}-${cellIndex}`}
                              className={classes.tableCell}
                            >
                              {cellValue}
                            </TableCell>
                          ))}
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
          {usesCombinationWindows &&
            viewMode === 'chart' &&
            (phaseCombinations.length === 0 ? (
              <Typography className={classes.noDataMessage}>
                {t('No combinations for this phase')}
              </Typography>
            ) : (
              <TableContainer className={classes.comboTable}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell className={classes.comboHeader}>
                        {t('Severity')}
                      </TableCell>
                      <TableCell className={classes.comboHeader}>
                        {t('Window')}
                      </TableCell>
                      <TableCell className={classes.comboHeader}>
                        {t('Trigger')}
                      </TableCell>
                      <TableCell className={classes.comboHeader}>
                        {t('Window avg')}
                      </TableCell>
                      <TableCell className={classes.comboHeader}>
                        {t('Gap to trigger')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {SEVERITY_ORDER.map(severity => {
                      const combo = phaseCombinations.find(
                        item => item.severity === severity,
                      );
                      if (!combo) {
                        return null;
                      }
                      const checked = visibleSeverities.includes(severity);
                      const official =
                        `${combo.phase}_${combo.severity}` === parsedStatus.id;
                      const gap =
                        combo.trigger == null
                          ? null
                          : combo.trigger - combo.avgProbability;
                      let gapText = '-';
                      if (official && combo.exceeded) {
                        gapText = t('active');
                      } else if (combo.exceeded || (gap != null && gap <= 0)) {
                        gapText = t('exceeded');
                      } else if (gap != null) {
                        gapText = t('{{gap}} to go', {
                          gap: gap.toFixed(1),
                        });
                      }
                      return (
                        <TableRow
                          key={`${combo.phase}-${severity}`}
                          style={{
                            backgroundColor: checked
                              ? AAFloodColors.chart[severity].fill
                              : undefined,
                          }}
                        >
                          <TableCell className={classes.comboCell}>
                            <Radio
                              size="small"
                              checked={checked}
                              onClick={() => selectSeverity(severity)}
                              style={{
                                color: AAFloodColors.chart[severity].solid,
                                padding: 4,
                              }}
                              inputProps={{
                                'aria-label': t(SEVERITY_NAME[severity]),
                              }}
                            />
                            {t(SEVERITY_NAME[severity])}
                          </TableCell>
                          <TableCell className={classes.comboCell}>
                            {combo.windowBegin && combo.windowEnd
                              ? `${dayMon(combo.windowBegin)} – ${dayMon(combo.windowEnd)}`
                              : '-'}
                          </TableCell>
                          <TableCell className={classes.comboCell}>
                            {combo.trigger == null
                              ? '-'
                              : `${combo.trigger.toFixed(1)}%`}
                          </TableCell>
                          <TableCell className={classes.comboCell}>
                            {`${combo.avgProbability.toFixed(1)}%`}
                          </TableCell>
                          <TableCell className={classes.comboCell}>
                            {gapText}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ))}
        </div>

        <div className={classes.actionButtons}>
          <Button
            className={classes.actionButton}
            type="button"
            startIcon={<TableChart />}
            onClick={toggleViewMode}
          >
            {viewMode === 'chart' ? t('View table') : t('View chart')}
          </Button>
          <Button
            className={classes.actionButton}
            type="button"
            startIcon={
              isDownloading ? <CircularProgress size={16} /> : <GetApp />
            }
            onClick={openDownloadMenu}
            disabled={isDownloading}
          >
            {isDownloading ? t('Downloading...') : t('Download')}
          </Button>
          <Menu
            anchorEl={downloadMenuAnchor}
            keepMounted
            open={Boolean(downloadMenuAnchor)}
            onClose={closeDownloadMenu}
          >
            <MenuItem
              onClick={async () => {
                if (isDownloading) {
                  return;
                }
                setIsDownloading(true);
                closeDownloadMenu();
                await downloadChart();
                setIsDownloading(false);
              }}
            >
              {t('Download PNG')}
            </MenuItem>
            <MenuItem
              onClick={async () => {
                if (isDownloading) {
                  return;
                }
                setIsDownloading(true);
                closeDownloadMenu();
                await downloadTable();
                setIsDownloading(false);
              }}
            >
              {t('Download CSV')}
            </MenuItem>
          </Menu>
        </div>
      </Paper>
    </div>,
  );
}

export default StationCharts;
