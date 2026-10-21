/* eslint-disable react-refresh/only-export-components */
import {
  Checkbox,
  CheckboxProps,
  FormControlLabel,
  FormControlLabelProps,
  Radio,
  RadioProps,
  useRadioGroup,
  withStyles,
} from '@material-ui/core';
import {
  LIGHT_BLUE_HEX,
  LIGHT_GREEN_HEX,
} from 'components/MapView/DateSelector/TimelineItems/utils';
import { AAWindowKeys } from 'config/utils';
import {
  AAcategory,
  AACategoryType,
  AAPhaseType,
  AnticipatoryActionDataRow,
  AnticipatoryActionState,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { useSafeTranslation } from 'i18n';
import { black, borderGray, lightGrey } from 'muiTheme';
import type { ReactElement } from 'react';

import AAIcon from '../AAIcon';
import {
  AADroughtColorOverrides,
  AADroughtPalette,
  AAPhaseColor,
  getAADisplayLabel,
  getAADroughtCountryConfig,
} from './utils/countryConfig';

// Default colors for AA Drought. Countries can override any of these via
// `colors` in their country config (see utils/countryConfig.ts).
export const DEFAULT_AA_DROUGHT_COLORS: AADroughtPalette = {
  na: { background: '#F1F1F1', text: 'black' },
  ny: { background: '#F1F1F1', text: 'black' },
  severe: {
    set: { background: '#831F00', text: 'white' },
    ready: { background: '#E63701', text: 'white' },
  },
  moderate: {
    set: { background: '#FF8934', text: 'black' },
    ready: { background: '#FFD52D', text: 'black' },
  },
  mild: {
    set: { background: '#FFF503', text: 'black' },
    ready: { background: '#FFFCB3', text: 'black' },
  },
  normal: {
    set: { background: '#FFF503', text: 'black' },
    ready: { background: '#FFFCB3', text: 'black' },
  },
};

const mergePhaseColor = (
  base: AAPhaseColor,
  override?: Partial<AAPhaseColor>,
): AAPhaseColor => ({ ...base, ...override });

export const mergeAADroughtColors = (
  overrides: AADroughtColorOverrides = {},
): AADroughtPalette => {
  const mergeCategory = (key: 'severe' | 'moderate' | 'mild' | 'normal') => ({
    set: mergePhaseColor(
      DEFAULT_AA_DROUGHT_COLORS[key].set,
      overrides[key]?.set,
    ),
    ready: mergePhaseColor(
      DEFAULT_AA_DROUGHT_COLORS[key].ready,
      overrides[key]?.ready,
    ),
  });
  return {
    na: mergePhaseColor(DEFAULT_AA_DROUGHT_COLORS.na, overrides.na),
    ny: mergePhaseColor(DEFAULT_AA_DROUGHT_COLORS.ny, overrides.ny),
    severe: mergeCategory('severe'),
    moderate: mergeCategory('moderate'),
    mild: mergeCategory('mild'),
    normal: mergeCategory('normal'),
  };
};

const StyledRadio = withStyles({
  root: {
    '&$checked': {
      color: black,
    },
    padding: '0.25rem',
  },
})((props: RadioProps) => <Radio color="default" {...props} />);

export const StyledRadioLabel = withStyles({
  root: {
    border: `1px solid ${borderGray}`,
    borderRadius: '32px',
    height: '1.75rem',
    marginLeft: 0,
    marginRight: '0.5rem',
  },
})(({ label, ...props }: Omit<FormControlLabelProps, 'control'>) => {
  const { t } = useSafeTranslation();
  const radioGroup = useRadioGroup();
  const checked = radioGroup?.value === props.value;

  const colorTags: { [key: string]: string } = {
    'Window 1': LIGHT_BLUE_HEX,
    'Window 2': LIGHT_GREEN_HEX,
  };

  const color = colorTags[label as string] || undefined;

  return (
    <FormControlLabel
      style={{ background: checked ? lightGrey : undefined }}
      label={
        <span style={{ marginRight: '1rem' }}>
          {color ? (
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                backgroundColor: color,
                marginRight: '0.5rem',
              }}
            />
          ) : null}
          {typeof label === 'string' ? t(label) : label}
        </span>
      }
      control={<StyledRadio />}
      {...props}
    />
  );
});

const StyledCheckbox = withStyles({
  root: {
    '&$checked': {
      color: black,
    },
    padding: '0.2rem',
  },
})((props: CheckboxProps) => <Checkbox color="default" {...props} />);

export const StyledCheckboxLabel = withStyles({
  root: {
    border: `1px solid ${borderGray}`,
    borderRadius: '2px',
    height: '1.75rem',
    marginLeft: 0,
  },
})(
  ({
    label,
    checkBoxProps,
    ...props
  }: Omit<FormControlLabelProps, 'control'> & {
    checkBoxProps: CheckboxProps;
  }) => (
    <FormControlLabel
      style={{ background: checkBoxProps.checked ? lightGrey : undefined }}
      label={<span style={{ marginRight: '0.5rem' }}>{label}</span>}
      control={<StyledCheckbox {...checkBoxProps} />}
      {...props}
    />
  ),
);

const buildAACategoryPhaseMap = (
  colors: AADroughtPalette,
): { [key: string]: any } => ({
  na: {
    color: colors.na.background,
    iconProps: {
      topText: 'na',
      bottomText: '-',
      color: colors.na.text,
    },
  },
  ny: {
    color: colors.ny.background, // Note: Special handling required for 'ny' in getAAColor for non-layer usage
    iconProps: {
      topText: 'ny',
      bottomText: '-',
      color: colors.ny.text,
    },
  },
  Severe: {
    Set: {
      color: colors.severe.set.background,
      iconProps: {
        topText: 'S',
        bottomText: 'SEV',
        color: colors.severe.set.text,
      },
    },
    Ready: {
      color: colors.severe.ready.background,
      iconProps: {
        topText: 'R',
        bottomText: 'SEV',
        color: colors.severe.ready.text,
      },
    },
    na: {
      color: colors.na.background,
      iconProps: {
        topText: 'na',
        bottomText: 'SEV',
        color: colors.na.text,
      },
    },
  },
  Moderate: {
    Set: {
      color: colors.moderate.set.background,
      iconProps: {
        topText: 'S',
        bottomText: 'MOD',
        color: colors.moderate.set.text,
      },
    },
    Ready: {
      color: colors.moderate.ready.background,
      iconProps: {
        topText: 'R',
        bottomText: 'MOD',
        color: colors.moderate.ready.text,
      },
    },
    na: {
      color: colors.na.background,
      iconProps: {
        topText: 'na',
        bottomText: 'MOD',
        color: colors.na.text,
      },
    },
  },
  Mild: {
    Set: {
      color: colors.mild.set.background,
      iconProps: {
        topText: 'S',
        bottomText: 'MIL',
        color: colors.mild.set.text,
      },
    },
    Ready: {
      color: colors.mild.ready.background,
      iconProps: {
        topText: 'R',
        bottomText: 'MIL',
        color: colors.mild.ready.text,
      },
    },
    na: {
      color: colors.na.background,
      iconProps: {
        topText: 'na',
        bottomText: 'MIL',
        color: colors.na.text,
      },
    },
  },
  Normal: {
    Set: {
      color: colors.normal.set.background,
      iconProps: {
        topText: 'S',
        bottomText: 'BNO',
        color: colors.normal.set.text,
      },
    },
    Ready: {
      color: colors.normal.ready.background,
      iconProps: {
        topText: 'R',
        bottomText: 'BNO',
        color: colors.normal.ready.text,
      },
    },
    na: {
      color: colors.na.background,
      iconProps: {
        topText: 'na',
        bottomText: 'BNO',
        color: colors.na.text,
      },
    },
  },
});

const AACategoryPhaseMap = buildAACategoryPhaseMap(
  mergeAADroughtColors(getAADroughtCountryConfig().colors),
);

export function getAAColor(
  category: AACategoryType,
  phase: AAPhaseType,
  forLayer: boolean = false,
) {
  const categoryData = AACategoryPhaseMap[category];
  if (category === 'ny' && !forLayer) {
    return `repeating-linear-gradient(
      -45deg,
      ${DEFAULT_AA_DROUGHT_COLORS.na.background},
      ${DEFAULT_AA_DROUGHT_COLORS.na.background} 10px,
      white 10px,
      white 20px
    )`;
  }
  if (categoryData.color) {
    return categoryData.color;
  }
  const phaseData = categoryData[phase];
  if (!phaseData) {
    throw new Error(`Icon not implemented: ${category}, ${phase}`);
  }
  return phaseData.color;
}

export function getAAIcon(
  category: AACategoryType,
  phase: AAPhaseType,
  forLayer?: boolean,
) {
  const background = getAAColor(category, phase, forLayer);

  const categoryData = AACategoryPhaseMap[category];
  if (categoryData.iconProps) {
    const iconProps = forLayer
      ? { ...categoryData.iconProps, bottomText: undefined }
      : categoryData.iconProps;
    return (
      <AAIcon
        background={background}
        fillBackground={!forLayer}
        {...iconProps}
      />
    );
  }
  const phaseData = categoryData[phase];
  if (!phaseData) {
    throw new Error(`Icon not implemented: ${category}, ${phase}`);
  }
  return (
    <AAIcon
      background={background}
      fillBackground={!forLayer}
      {...phaseData.iconProps}
    />
  );
}

export function AADataSeverityOrder(
  category: AnticipatoryActionDataRow['category'],
  phase: AnticipatoryActionDataRow['phase'],
  bonus: number = 100,
) {
  const catIndex = AAcategory.findIndex(x => x === category);
  const phaseBonus = phase === 'Set' ? bonus : 0;

  return catIndex * 10 + phaseBonus;
}

// Legend entries for the country; categories unticked in the filters are left out
export const getLegendPhases = (
  categories?: Partial<Record<AACategoryType, boolean>>,
) => {
  const config = getAADroughtCountryConfig();

  return config.legendPhases
    .filter(phase => {
      const category = config.categories.find(
        cat => cat.label === phase.severity,
      )?.id;
      return !category || categories?.[category] !== false;
    })
    .map(phase => {
      let icon: ReactElement;

      const category = config.categories.find(
        cat => cat.label === phase.severity,
      )?.id;

      if (category) {
        icon = getAAIcon(category, phase.phase as 'Ready' | 'Set', true);
      } else if (phase.phase === 'No Action') {
        icon = getAAIcon('na', 'na', true);
      } else {
        icon = getAAIcon('ny', 'ny', true);
      }

      return { ...phase, icon };
    });
};

type AAWindowKey = (typeof AAWindowKeys)[number];

export interface AASummaryRow {
  category: AACategoryType;
  phase: AAPhaseType;
  windows: {
    window: AAWindowKey;
    districts: { name: string; isNew: boolean }[];
  }[];
}

interface GetAASummaryRowsParams {
  rowCategories: { category: AACategoryType; phase: AAPhaseType }[];
  categories: AnticipatoryActionState['filters']['categories'];
  selectedWindow: AnticipatoryActionState['filters']['selectedWindow'];
  renderedDistricts: AnticipatoryActionState['renderedDistricts'];
}

// Home table content, shared by the panel and the Summary CSV download
export function getAASummaryRows({
  rowCategories,
  categories,
  selectedWindow,
  renderedDistricts,
}: GetAASummaryRowsParams): AASummaryRow[] {
  const windows = selectedWindow === 'All' ? AAWindowKeys : [selectedWindow];
  return rowCategories
    .filter(x => categories[x.category])
    .map(({ category, phase }) => ({
      category,
      phase,
      windows: windows.map(window => {
        // a district may have several entries (one per index), last one wins
        const districts = new Map<string, boolean>();
        Object.entries(renderedDistricts[window]).forEach(([name, distData]) =>
          distData
            .filter(d => d.category === category && d.phase === phase)
            .forEach(d => districts.set(name, d.isNew)),
        );
        return {
          window,
          districts: [...districts].map(([name, isNew]) => ({ name, isNew })),
        };
      }),
    }));
}

// One CSV line per district/window
export function buildAASummaryCsv(
  rows: AASummaryRow[],
  t: (key: string) => string,
): string {
  const escape = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = rows.flatMap(({ category, phase, windows }) =>
    windows.flatMap(({ window, districts }) =>
      districts.map(({ name, isNew }) =>
        [
          t(window),
          t(getAADisplayLabel(category)),
          t(getAADisplayLabel(phase)),
          t(name),
          isNew ? t('Yes') : '',
        ]
          .map(escape)
          .join(','),
      ),
    ),
  );
  const header = ['Window', 'Category', 'Phase', 'District', 'New']
    .map(h => escape(t(h)))
    .join(',');
  return [header, ...lines].join('\n');
}
