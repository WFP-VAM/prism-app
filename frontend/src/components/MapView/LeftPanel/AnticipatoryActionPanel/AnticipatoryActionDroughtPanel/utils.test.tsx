import { DEFAULT_AA_DROUGHT_COLORS, mergeAADroughtColors } from './utils';

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
});
