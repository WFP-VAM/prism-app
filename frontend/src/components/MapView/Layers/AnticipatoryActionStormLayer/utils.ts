import {
  isSameDay,
  parseJSON,
  format,
  addHours,
  differenceInHours,
} from 'date-fns';
import { Map as MaplibreMap } from 'maplibre-gl';

export function getDateInUTC(time: string, hasHours: boolean = true) {
  try {
    return parseJSON(time + (!hasHours ? ' 00:00:00' : ''));
  } catch {
    return null;
  }
}

export function isDateSameAsCurrentDate(date: string, currentDate: string) {
  const parsedDate = getDateInUTC(date, true);
  if (!parsedDate) {
    return false;
  }

  const parsedCurrentDate = getDateInUTC(currentDate, false);
  if (!parsedCurrentDate) {
    return false;
  }

  return isSameDay(parsedDate, parsedCurrentDate);
}

export function formatReportDate(date: string) {
  const parsedDate = getDateInUTC(date, true);
  if (!parsedDate) {
    return '';
  }

  return formatInUTC(parsedDate, 'yyy-MM-dd Kaaa');
}

export function formatInUTC(dateInUTC: Date, fmt: string) {
  const localTimeZone = new Date().getTimezoneOffset(); // tz in minutes positive or negative
  const hoursToAddOrRemove = Math.round(localTimeZone / 60);
  const shiftedDate = addHours(dateInUTC, hoursToAddOrRemove);

  return format(shiftedDate, fmt);
}

export function formatLandfallDate(dateRange: string[]) {
  const date = dateRange[0];
  const parsedDate = getDateInUTC(date, true);
  if (!parsedDate) {
    return '';
  }

  return formatInUTC(parsedDate, 'yyy-MM-dd HH:mm');
}

export function formatLandfallTimeRange(dateRange: string[]) {
  const fromDate = dateRange[0];
  const toDate = dateRange[1];

  const parsedFormDate = getDateInUTC(fromDate, true);
  const parsedToDate = getDateInUTC(toDate, true);
  if (!parsedFormDate || !parsedToDate) {
    return '';
  }

  return `+= ${differenceInHours(parsedToDate, parsedFormDate)} hours`;
}

export function formatLandfallEstimatedLeadtime(
  rawLandfallEstimatedTime: string[],
  timelineDate: string,
) {
  const parsedFromLandfallDate = getDateInUTC(
    rawLandfallEstimatedTime[0],
    true,
  );
  const parsedToLandfallDate = getDateInUTC(rawLandfallEstimatedTime[1], true);
  const parsedTimelineDate = getDateInUTC(timelineDate, false);

  if (!parsedFromLandfallDate || !parsedToLandfallDate || !parsedTimelineDate) {
    return '';
  }

  const minHour = differenceInHours(parsedFromLandfallDate, parsedTimelineDate);
  const maxHour = differenceInHours(parsedToLandfallDate, parsedTimelineDate);

  if (minHour < 0 || maxHour < 0) {
    return '-';
  }

  return `${minHour} - ${maxHour} hrs`;
}

export const sendMailWithImage = async (map: MaplibreMap | undefined) => {
  if (!map) {
    return;
  }

  const layersToCheck = [
    'layer-admin_boundaries',
    'storm-districts-fill',
    'storm-districts-border',
    'aa-storm-wind-points-layer',
    'storm-risk-map',
    'exposed-area-48kt',
    'exposed-area-64kt',
    'aa-storm-wind-points-line-past',
    'aa-storm-wind-points-line-future',
    'aa-storm-wind-points-layer',
  ];

  const allLayersLoaded = layersToCheck.every(layerId => map.getLayer(layerId));
  if (allLayersLoaded) {
    const originalZoom = map.getZoom();
    const originalCenter: [number, number] = [
      map.getCenter().lng,
      map.getCenter().lat,
    ];

    const zoomLevel = 12;
    const regionCenter: [number, number] = [-73.935242, 40.73061];

    map.setCenter(regionCenter);
    map.setZoom(zoomLevel);

    const canvas = map.getCanvas();
    const image = canvas.toDataURL('image/png');

    // TODO: send mail with image
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.body.innerHTML = `<img src="${image}" alt="Screenshot" style="max-width: 100%;">`;
      newWindow.document.title = 'Carte Screenshot';
    }

    map.setCenter(originalCenter);
    map.setZoom(originalZoom);
  }
};
