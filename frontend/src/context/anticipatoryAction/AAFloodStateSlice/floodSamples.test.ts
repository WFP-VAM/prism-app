/**
 * Runs the flood parser against aa-flood-v2-samples.
 * Papa options match loadAAFloodDateData (header + dynamicTyping).
 */
import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';

import { forecastLeadDay, parseFloodStatus } from './floodStatus';
import { floodStationKey, parseStationSummaryRows } from './utils';

const SAMPLES = path.resolve(__dirname, '../../../../../aa-flood-v2-samples');

type Row = Record<string, unknown>;

function readCsv(filePath: string): Row[] {
  const parsed = Papa.parse<Row>(fs.readFileSync(filePath, 'utf8'), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  expect(parsed.errors).toEqual([]);
  return parsed.data;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function loadDate(root: string, issueDate: string) {
  const dates = JSON.parse(
    fs.readFileSync(path.join(root, 'dates.json'), 'utf8'),
  ) as Record<
    string,
    {
      schema_version: number;
      trigger_status: string;
      probabilities_file: string;
      discharge_file: string;
      station_summary_file: string;
    }
  >;
  const entry = dates[issueDate];
  const summaryRows = readCsv(path.join(root, entry.station_summary_file));
  const probabilityRows = readCsv(path.join(root, entry.probabilities_file));
  const dischargeRows = readCsv(path.join(root, entry.discharge_file));
  const stations = parseStationSummaryRows(
    summaryRows,
    issueDate,
    entry.schema_version,
  );
  return { entry, summaryRows, probabilityRows, dischargeRows, stations };
}

function expectV2Date(root: string, issueDate: string) {
  const { entry, summaryRows, probabilityRows, dischargeRows, stations } =
    loadDate(root, issueDate);

  expect(entry.schema_version).toBe(2);

  const stationIds = new Set(
    summaryRows.map(row => floodStationKey(row.station_id, row.station_name)),
  );
  expect(stationIds.has('id:12')).toBe(false);

  let highest = parseFloodStatus('not_exceeded');
  Object.values(stations).forEach(station => {
    expect(station.station_id).toBeGreaterThan(0);
    expect(station.latitude).not.toBe(0);
    expect(station.longitude).not.toBe(0);
    const rows = summaryRows.filter(
      row =>
        floodStationKey(row.station_id, row.station_name) ===
        `id:${station.station_id}`,
    );
    const statuses = new Set(rows.map(row => String(row.status)));
    expect(statuses).toEqual(new Set([station.floodStatus]));

    const derived = rows.reduce((best, row) => {
      if (String(row.exceeded) !== 'true' && row.exceeded !== true) {
        return best;
      }
      const id = `${row.phase}_${row.severity}`;
      return parseFloodStatus(id).rank > parseFloodStatus(best).rank
        ? id
        : best;
    }, 'not_exceeded');
    expect(station.floodStatus).toBe(derived);

    rows.forEach(row => {
      const avg = Number(row.avg_probability);
      const trigger = Number(row.trigger);
      const exceeded = row.exceeded === true || String(row.exceeded) === 'true';
      expect(exceeded).toBe(avg >= trigger);
      expect(avg).toBeGreaterThanOrEqual(0);
      expect(avg).toBeLessThanOrEqual(1);
      expect(trigger).toBeGreaterThan(0);
      expect(trigger).toBeLessThanOrEqual(1);
    });

    const parsed = parseFloodStatus(station.floodStatus);
    if (parsed.rank > highest.rank) {
      highest = parsed;
    }

    const active = station.combinations?.find(
      combo => `${combo.phase}_${combo.severity}` === station.floodStatus,
    );
    const times = probabilityRows
      .filter(row => Number(row.station_id) === station.station_id)
      .map(row => String(row.valid_time));
    const uniqueTimes = [...new Set(times)].sort();
    expect(uniqueTimes).toHaveLength(8);
    expect(uniqueTimes[0]).toBe(addDays(issueDate, 1));
    expect(uniqueTimes[7]).toBe(addDays(issueDate, 8));

    if (active) {
      expect(
        forecastLeadDay(uniqueTimes, active.windowBegin),
      ).toBeGreaterThanOrEqual(1);
      expect(
        forecastLeadDay(uniqueTimes, active.windowEnd),
      ).toBeLessThanOrEqual(8);
      expect(
        uniqueTimes.some(
          time => time >= active.windowBegin && time <= active.windowEnd,
        ),
      ).toBe(true);
    }
  });

  expect(entry.trigger_status).toBe(highest.id);

  const summaryKeys = new Set(Object.keys(stations));
  const probabilityKeys = new Set(
    probabilityRows.map(row =>
      floodStationKey(row.station_id, row.station_name),
    ),
  );
  const dischargeKeys = new Set(
    dischargeRows.map(row => floodStationKey(row.station_id, row.station_name)),
  );
  expect(probabilityKeys).toEqual(summaryKeys);
  expect(dischargeKeys).toEqual(summaryKeys);

  probabilityRows.forEach(row => {
    ['bankfull_percentage', 'moderate_percentage', 'severe_percentage'].forEach(
      column => {
        const value = Number(row[column]);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      },
    );
  });
}

describe('aa-flood-v2-samples', () => {
  test('synthetic dates match the parser', () => {
    const root = path.join(SAMPLES, 'synthetic');
    expectV2Date(root, '2026-03-10');
    expectV2Date(root, '2026-03-11');

    const first = loadDate(root, '2026-03-10');
    expect(first.stations['id:84'].floodStatus).toBe('activation_severe');
    expect(first.stations['id:84'].station_name).toBe('Espungabera');
    expect(first.stations['id:246'].floodStatus).toBe('activation_bankfull');
    expect(first.stations['id:456'].floodStatus).toBe('activation_severe');
    expect(first.stations['id:456'].combinations).toHaveLength(4);
    const severe = first.stations['id:456'].combinations?.find(
      combo => combo.phase === 'activation' && combo.severity === 'severe',
    );
    expect(severe).toMatchObject({
      windowBegin: '2026-03-12',
      windowEnd: '2026-03-14',
      dischargeThreshold: 3687,
      trigger: 40,
      exceeded: true,
    });

    const second = loadDate(root, '2026-03-11');
    expect(second.stations['id:84'].floodStatus).toBe('not_exceeded');
    expect(second.stations['id:246'].floodStatus).toBe('activation_bankfull');
    expect(second.stations['id:456'].floodStatus).toBe('readiness_moderate');
    expect(second.stations['id:12']).toBeUndefined();
  });

  test('real Mozambique run is schema 2 and not exceeded', () => {
    const root = path.join(SAMPLES, 'real');
    expectV2Date(root, '2026-11-04');
    const { stations } = loadDate(root, '2026-11-04');
    expect(Object.keys(stations).length).toBeGreaterThan(0);
    Object.values(stations).forEach(station => {
      expect(station.floodStatus).toBe('not_exceeded');
    });
    const goonda = stations['id:456'];
    const readinessSevere = goonda.combinations?.find(
      combo => combo.phase === 'readiness' && combo.severity === 'severe',
    );
    expect(readinessSevere?.windowBegin).toBe('2026-11-10');
    expect(readinessSevere?.windowEnd).toBe('2026-11-12');
    expect(readinessSevere?.trigger).toBeCloseTo(28, 6);
    expect(readinessSevere?.exceeded).toBe(false);
  });
});
