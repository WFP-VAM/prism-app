# AA Drought Configuration Guide

## Overview

The AA (Anticipatory Action) Drought configuration has been ultra-simplified to only require fields that differ from sensible defaults. This makes adding new countries extremely easy.

## What's Configurable

### 1. **Categories** (Drought Severity Levels) - **REQUIRED**
- Define which drought categories are available for the country
- Examples: `Severe`, `Moderate`, `Mild`, `Below Normal`
- Controls checkboxes in the UI and data filtering

### 2. **Window Labels** (Monitoring Periods) - **OPTIONAL**
- Only specify if they differ from "Window 1", "Window 2"
- Examples: `NDJ` (November-December-January), `JFM` (January-February-March)
- Displayed in the left panel and timeline

### 3. **Season Start Month** - **OPTIONAL**
- Only specify if it's not May (month 4)
- Used for season calculation (e.g., May = 4 for 0-indexed months)
- **Timeline automatically starts one month before the season**

### 4. **Content and Display** - **OPTIONAL**
- Only specify if content differs from auto-generated content
- Forecast source (e.g., "ECMWF") - only if not "default"

## Quick Start: Adding a New Country

### Method 1: Ultra-Simple (Recommended)

```typescript
// In countryConfig.ts, add to AADROUGHT_COUNTRY_CONFIGS:
newCountry: createCountryConfig({
  categories: [
    { label: 'Moderate', id: 'Moderate' },
    { label: 'Below Normal', id: 'Normal' },
  ],
  seasonStartMonth: 4, // May (only if not default)
  forecastSource: 'ECMWF', // only if not default
}),
```

### Method 2: Minimal Configuration

```typescript
// Just specify the categories - everything else uses defaults
minimalCountry: createCountryConfig({
  categories: [{ label: 'Below Normal', id: 'Normal' }],
}),
```

### Method 3: Manual Configuration (Only if needed)

```typescript
newCountry: {
  categories: [
    { label: 'Moderate', id: 'Moderate' },
    { label: 'Below Normal', id: 'Normal' },
  ],
  seasonStartMonth: 4, // May
  howToReadContent: [
    { title: 'OND', text: 'Early rainfall season.' },
    { title: 'JFM', text: 'Peak rainfall season.' },
    { title: 'Moderate category', text: 'Drought events that typically occur once every 5 years.' },
    { title: 'Below normal category', text: 'Drought events that typically occur once every 3 years.' },
    { title: 'Ready, Set and Go phases', text: 'The "Ready, Set & Go!" system uses seasonal forecasts from ECMWF...' },
  ],
  descriptionText: 'uses seasonal forecasts from ECMWF with longer lead time...',
  forecastSource: 'ECMWF',
},
```

## Country Examples

### Malawi Configuration
```typescript
malawi: {
  categories: [{ label: 'Below Normal', id: 'Normal' }],
  seasonStartMonth: 4, // May (timeline starts in April)
  forecastSource: 'ECMWF',
  // ... other config
}
```

### Zimbabwe Configuration
```typescript
zimbabwe: {
  categories: [
    { label: 'Moderate', id: 'Moderate' },
    { label: 'Below Normal', id: 'Normal' },
  ],
  // Uses default window labels, season start, and forecast source
  // ... other config
}
```

## Default Values

If you don't specify a field, these defaults are used:

- **seasonStartMonth**: `4` (May)
- **howToReadContent**: Auto-generated based on categories
- **descriptionText**: Generic AA description
- **forecastSource**: `"default"`

## Utility Functions

The configuration system provides several utility functions:

- `getTimelineOffset()` - Get timeline start month (seasonStartMonth - 1)
- `calculateSeason(date)` - Calculate season based on country config
- `getForecastSource()` - Get forecast source for descriptions
- `getRowCategories()` - Auto-generated category/phase combinations
- `getLegendPhases(getAAIcon)` - Auto-generated legend items

## Configuration Architecture

The system uses a country-aware configuration approach where:

### Timeline offset
- Calculated dynamically as `seasonStartMonth - 1` using `getTimelineOffset()`
- Previously hardcoded values are now country-specific

### Season calculation
- Uses `calculateSeason(date)` from the configuration system
- Previously hardcoded `month >= 4` logic is now configurable per country

### Component season calculations
- All AA components use `calculateSeason(date)`:
  - `Timeline/utils.ts`
  - `DistrictView/utils.ts` 
  - `Forecast/utils.ts`

### Forecast source references
- Uses `getForecastSource()` for dynamic forecast source descriptions
- Previously hardcoded "ECMWF" references are now configurable

## Benefits

1. **Ultra-Simple Setup**: New countries can be added with minimal configuration
2. **Smart Defaults**: Everything has sensible defaults
3. **Auto-Generation**: Row categories and legend phases are generated automatically
4. **Consistent**: All country-specific settings are in one place
5. **Flexible**: Supports different season starts and window labels
6. **Maintainable**: Changes to one country don't affect others
7. **Documented**: Clear examples and helper functions
8. **Country-Aware**: All season calculations and timeline offsets are country-specific

## Implementation Details

The AA Drought system uses dynamic, country-specific configuration throughout:

### Core Configuration Files:
- `frontend/src/components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionDroughtPanel/utils/countryConfig.ts` - Main configuration system
- `frontend/src/context/anticipatoryAction/AADroughtStateSlice/utils.ts` - Updated season calculation
- `frontend/src/components/MapView/DateSelector/index.tsx` - Uses `getTimelineOffset(country)`
