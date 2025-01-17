import {
  AAStormTimeSeriesFeature,
  TimeSerieFeatureProperty,
} from 'context/anticipatoryAction/AAStormStateSlice/rawStormDataTypes';
import {
  isSameDay,
  parseJSON,
  format,
  addHours,
  differenceInHours,
} from 'date-fns';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { TZDate } from '@date-fns/tz';

export function getDateInUTC(
  time: string | undefined,
  hasHours: boolean = true,
) {
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

  return formatInLocalTime(parsedDate, 'yyy-MM-dd Kaaa O');
}

export function formatInUTC(dateInUTC: Date, fmt: string) {
  const localTimeZone = new Date().getTimezoneOffset(); // tz in minutes positive or negative
  const hoursToAddOrRemove = Math.round(localTimeZone / 60);
  const shiftedDate = addHours(dateInUTC, hoursToAddOrRemove);

  return format(shiftedDate, fmt);
}

/*
 * Format a date to local time
 * note: So far, the storm Anticipatory Action module is only used by countries using the mozambic time (namely Mozambic and Zimbabwe).
 * When addtional countries will need to acces this module, this function will have to be revisited
 */

function formatInLocalTime(date: Date, fmt: string): string {
  const dateInLocalTime = new TZDate(date, 'Africa/Blantyre');

  return format(dateInLocalTime, fmt);
}

export function formatLandfallDate(dateRange: string[]) {
  const date = dateRange[0];
  const parsedDate = getDateInUTC(date, true);
  if (!parsedDate) {
    return '';
  }

  return formatInLocalTime(parsedDate, 'yyy-MM-dd HH:mm O');
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

export function formatWindPointDate(time: string) {
  const dateInUTC = getDateInUTC(time);

  if (!dateInUTC) {
    return '';
  }

  return formatInUTC(dateInUTC, 'dd - Kaaa');
}

export function parseGeoJsonFeature(
  mapGeoJSONFeature?: MapGeoJSONFeature,
): AAStormTimeSeriesFeature | null {
  if (!mapGeoJSONFeature) {
    return null;
  }
  if (mapGeoJSONFeature.geometry.type !== 'Point') {
    return null;
  }
  const { properties } = mapGeoJSONFeature;

  if (
    !('time' in properties) &&
    !('data_type' in properties) &&
    !('development' in properties)
  ) {
    return null;
  }

  return {
    geometry: mapGeoJSONFeature.geometry,
    type: 'Feature',
    properties: properties as TimeSerieFeatureProperty,
  };
}
