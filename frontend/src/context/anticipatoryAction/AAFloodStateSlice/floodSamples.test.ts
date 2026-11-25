/**
 * Parser contract for the long v2 station summary.
 * Rows are a trimmed stand-in for the old sample files.
 */
import Papa from 'papaparse';

import { parseFloodStatus } from './floodStatus';
import { floodStationKey, parseStationSummaryRows } from './utils';

const SUMMARY_HEADER =
  'station_id,station_name,river_name,latitude,longitude,forecast_issue_date,phase,severity,threshold,trigger,window_begin,window_end,avg_probability,exceeded,status';

const ISSUE_2026_03_10 = `
84,espungabera,Buzi,-20.475,32.825,2026-03-10,activation,severe,467,0.5,2026-03-12,2026-03-14,0.8666666666666667,true,activation_severe
84,espungabera,Buzi,-20.475,32.825,2026-03-10,readiness,severe,467,0.25,2026-03-14,2026-03-18,0.876,true,activation_severe
246,dombe,Lucite,-19.975,33.425,2026-03-10,activation,bankfull,374,0.6,2026-03-12,2026-03-14,0.8466666666666667,true,activation_bankfull
246,dombe,Lucite,-19.975,33.425,2026-03-10,readiness,bankfull,374,0.4,2026-03-14,2026-03-18,0.832,true,activation_bankfull
456,goonda,Buzi,-19.875,33.875,2026-03-10,activation,severe,3687,0.4,2026-03-12,2026-03-14,0.86,true,activation_severe
456,goonda,Buzi,-19.875,33.875,2026-03-10,activation,moderate,2620,0.5,2026-03-12,2026-03-14,1,true,activation_severe
456,goonda,Buzi,-19.875,33.875,2026-03-10,readiness,severe,3687,0.2,2026-03-14,2026-03-18,0.836,true,activation_severe
456,goonda,Buzi,-19.875,33.875,2026-03-10,readiness,moderate,2620,0.3,2026-03-14,2026-03-18,0.992,true,activation_severe
`;

const ISSUE_2026_03_11 = `
84,espungabera,Buzi,-20.475,32.825,2026-03-11,activation,severe,467,0.5,2026-03-13,2026-03-15,0,false,not_exceeded
84,espungabera,Buzi,-20.475,32.825,2026-03-11,readiness,severe,467,0.25,2026-03-15,2026-03-19,0,false,not_exceeded
246,dombe,Lucite,-19.975,33.425,2026-03-11,activation,bankfull,374,0.6,2026-03-13,2026-03-15,1,true,activation_bankfull
246,dombe,Lucite,-19.975,33.425,2026-03-11,readiness,bankfull,374,0.4,2026-03-15,2026-03-19,0.924,true,activation_bankfull
456,goonda,Buzi,-19.875,33.875,2026-03-11,activation,severe,3687,0.4,2026-03-13,2026-03-15,0.013333333333333334,false,readiness_moderate
456,goonda,Buzi,-19.875,33.875,2026-03-11,activation,moderate,2620,0.5,2026-03-13,2026-03-15,0.4666666666666666,false,readiness_moderate
456,goonda,Buzi,-19.875,33.875,2026-03-11,readiness,severe,3687,0.2,2026-03-15,2026-03-19,0.112,false,readiness_moderate
456,goonda,Buzi,-19.875,33.875,2026-03-11,readiness,moderate,2620,0.3,2026-03-15,2026-03-19,0.816,true,readiness_moderate
`;

function parseSummary(body: string, issueDate: string) {
  const parsed = Papa.parse<Record<string, unknown>>(
    `${SUMMARY_HEADER}\n${body.trim()}\n`,
    { header: true, dynamicTyping: true, skipEmptyLines: true },
  );
  expect(parsed.errors).toEqual([]);
  const stations = parseStationSummaryRows(parsed.data, issueDate, 2);
  let highest = parseFloodStatus('not_exceeded');
  Object.values(stations).forEach(station => {
    expect(station.station_id).toBeGreaterThan(0);
    expect(station.latitude).not.toBe(0);
    expect(station.longitude).not.toBe(0);
    const rows = parsed.data.filter(
      row =>
        floodStationKey(row.station_id, row.station_name) ===
        `id:${station.station_id}`,
    );
    expect(new Set(rows.map(row => String(row.status)))).toEqual(
      new Set([station.floodStatus]),
    );
    rows.forEach(row => {
      const avg = Number(row.avg_probability);
      const trigger = Number(row.trigger);
      const exceeded = row.exceeded === true || String(row.exceeded) === 'true';
      expect(exceeded).toBe(avg >= trigger);
    });
    const parsedStatus = parseFloodStatus(station.floodStatus);
    if (parsedStatus.rank > highest.rank) {
      highest = parsedStatus;
    }
  });
  return { stations, highest };
}

describe('flood v2 summary fixture', () => {
  test('10 Mar ranks activation severe above bankfull', () => {
    const { stations, highest } = parseSummary(ISSUE_2026_03_10, '2026-03-10');
    expect(highest.id).toBe('activation_severe');
    expect(stations['id:84'].floodStatus).toBe('activation_severe');
    expect(stations['id:84'].station_name).toBe('Espungabera');
    expect(stations['id:246'].floodStatus).toBe('activation_bankfull');
    expect(stations['id:456'].floodStatus).toBe('activation_severe');
    expect(stations['id:456'].combinations).toHaveLength(4);
    const severe = stations['id:456'].combinations?.find(
      combo => combo.phase === 'activation' && combo.severity === 'severe',
    );
    expect(severe).toMatchObject({
      windowBegin: '2026-03-12',
      windowEnd: '2026-03-14',
      dischargeThreshold: 3687,
      trigger: 40,
      exceeded: true,
    });
  });

  test('11 Mar keeps bankfull and readiness without a missing station', () => {
    const { stations, highest } = parseSummary(ISSUE_2026_03_11, '2026-03-11');
    expect(highest.id).toBe('activation_bankfull');
    expect(stations['id:84'].floodStatus).toBe('not_exceeded');
    expect(stations['id:246'].floodStatus).toBe('activation_bankfull');
    expect(stations['id:456'].floodStatus).toBe('readiness_moderate');
    expect(stations['id:12']).toBeUndefined();
  });
});
