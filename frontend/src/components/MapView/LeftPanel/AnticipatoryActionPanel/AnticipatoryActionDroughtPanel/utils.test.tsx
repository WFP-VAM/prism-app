import {
  buildAASummaryCsv,
  DEFAULT_AA_DROUGHT_COLORS,
  getAASummaryRows,
  mergeAADroughtColors,
} from './utils';

type CsvParams = Parameters<typeof getAASummaryRows>[0] & {
  t: (key: string) => string;
};

describe('getAASummaryRows + buildAASummaryCsv', () => {
  const identity = (s: string) => s;
  const allCategories = {
    Severe: true,
    Moderate: true,
    Mild: true,
    Normal: true,
    na: true,
    ny: true,
  };
  const rowCategories = [
    { category: 'Moderate', phase: 'Ready' },
    { category: 'Normal', phase: 'Set' },
    { category: 'na', phase: 'na' },
    { category: 'ny', phase: 'ny' },
  ] as CsvParams['rowCategories'];
  const renderedDistricts = {
    'Window 1': {
      Alpha: [{ category: 'Moderate', phase: 'Ready', isNew: true }],
      Beta: [{ category: 'Normal', phase: 'Set', isNew: false }],
    },
    'Window 2': {
      Gamma: [{ category: 'na', phase: 'na', isNew: false }],
      Delta: [{ category: 'ny', phase: 'ny', isNew: false }],
    },
  } as CsvParams['renderedDistricts'];
  const build = (overrides: Partial<CsvParams> = {}) => {
    const { t, ...params }: CsvParams = {
      rowCategories,
      categories: allCategories,
      selectedWindow: 'All',
      renderedDistricts,
      t: identity,
      ...overrides,
    };
    return buildAASummaryCsv(getAASummaryRows(params), t);
  };

  it('includes all windows with display labels', () => {
    expect(build().split('\n')).toEqual([
      'Window,Category,Phase,District,New',
      'Window 1,Moderate,Ready,Alpha,Yes',
      // test country has no Normal category, so no config label
      'Window 1,Normal,Set,Beta,',
      'Window 2,No Action,No Action,Gamma,',
      'Window 2,Not Yet Monitored,Not Yet Monitored,Delta,',
    ]);
  });

  it('filters by selected window', () => {
    const rows = build({ selectedWindow: 'Window 2' }).split('\n');
    expect(rows).toHaveLength(3);
    expect(rows.slice(1).every(r => r.startsWith('Window 2,'))).toBe(true);
  });

  it('filters out disabled categories', () => {
    const csv = build({ categories: { ...allCategories, Moderate: false } });
    expect(csv).not.toContain('Alpha');
    expect(csv.split('\n')).toHaveLength(4);
  });

  it('translates header and values', () => {
    const rows = build({ t: s => `T(${s})` }).split('\n');
    expect(rows[0]).toBe('T(Window),T(Category),T(Phase),T(District),T(New)');
    expect(rows[1]).toBe('T(Window 1),T(Moderate),T(Ready),T(Alpha),T(Yes)');
  });

  it('escapes commas, quotes and newlines', () => {
    const csv = build({
      selectedWindow: 'Window 1',
      renderedDistricts: {
        'Window 1': {
          'A, "B"': [{ category: 'Moderate', phase: 'Ready', isNew: false }],
          'C\nD': [{ category: 'Moderate', phase: 'Ready', isNew: false }],
        },
        'Window 2': {},
      } as CsvParams['renderedDistricts'],
    });
    expect(csv).toContain('Window 1,Moderate,Ready,"A, ""B""",');
    expect(csv).toContain('Window 1,Moderate,Ready,"C\nD",');
  });

  it('uses the last matching entry for the NEW flag', () => {
    const dup = (first: boolean, last: boolean) =>
      build({
        selectedWindow: 'Window 1',
        renderedDistricts: {
          'Window 1': {
            Alpha: [
              { category: 'Moderate', phase: 'Ready', isNew: first },
              { category: 'Moderate', phase: 'Ready', isNew: last },
            ],
          },
          'Window 2': {},
        } as CsvParams['renderedDistricts'],
      }).split('\n');
    expect(dup(true, false)).toEqual([
      'Window,Category,Phase,District,New',
      'Window 1,Moderate,Ready,Alpha,',
    ]);
    expect(dup(false, true)[1]).toBe('Window 1,Moderate,Ready,Alpha,Yes');
  });
});

describe('mergeAADroughtColors', () => {
  it('returns the defaults when there are no overrides', () => {
    expect(mergeAADroughtColors()).toEqual(DEFAULT_AA_DROUGHT_COLORS);
  });

  it('only replaces the fields that are overridden', () => {
    const colors = mergeAADroughtColors({
      severe: { set: { background: '#800026' } },
      na: { text: 'white' },
    });

    expect(colors.severe.set).toEqual({ background: '#800026', text: 'white' });
    expect(colors.severe.ready).toEqual(DEFAULT_AA_DROUGHT_COLORS.severe.ready);
    expect(colors.na).toEqual({ background: '#F1F1F1', text: 'white' });
    expect(colors.moderate).toEqual(DEFAULT_AA_DROUGHT_COLORS.moderate);
  });
});

describe('getAAColor', () => {
  const loadForCountry = (country: string) => {
    let utils: typeof import('./utils') | undefined;
    jest.isolateModules(() => {
      jest.doMock('config', () => ({
        ...jest.requireActual('config'),
        safeCountry: country,
      }));
      utils = require('./utils');
    });
    return utils!;
  };

  afterEach(() => {
    jest.dontMock('config');
  });

  it('uses country color overrides for malawi', () => {
    const { getAAColor } = loadForCountry('malawi');
    expect(getAAColor('Mild', 'Set')).toBe('#FEA245');
    expect(getAAColor('Normal', 'Ready')).toBe('#FFFFCC');
  });

  it('uses the default colors for countries without overrides', () => {
    const { getAAColor } = loadForCountry('mozambique');
    expect(getAAColor('Mild', 'Set')).toBe(
      DEFAULT_AA_DROUGHT_COLORS.mild.set.background,
    );
    expect(getAAColor('Severe', 'Set')).toBe('#831F00');
  });

  it('uses country category labels in the summary CSV', () => {
    const { buildAASummaryCsv: build, getAASummaryRows: getRows } =
      loadForCountry('malawi');
    const csv = build(
      getRows({
        rowCategories: [{ category: 'Normal', phase: 'Set' }],
        categories: { Normal: true } as any,
        selectedWindow: 'Window 1',
        renderedDistricts: {
          'Window 1': {
            Beta: [{ category: 'Normal', phase: 'Set', isNew: false }],
          },
          'Window 2': {},
        },
      }),
      s => s,
    );
    expect(csv.split('\n')[1]).toBe('Window 1,Below Normal,Set,Beta,');
  });
});
