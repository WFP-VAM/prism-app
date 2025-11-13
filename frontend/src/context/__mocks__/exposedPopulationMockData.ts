import { ExposedPopulationResult } from 'utils/analysis-utils';
import { AggregationOperations } from 'config/types';

// Mock data for exposed population analysis with Mozambique coordinates
export const mockExposedPopulationData = new ExposedPopulationResult(
  [
    {
      key: 'maputo-city',
      localName: 'Maputo City',
      name: 'Maputo City',
      baselineValue: 125000,
      'Population exposed': 125000,
      'Percentage exposed': 15.2,
      'Area (km²)': 347.0,
    },
    {
      key: 'beira',
      localName: 'Beira',
      name: 'Beira',
      baselineValue: 89000,
      'Population exposed': 89000,
      'Percentage exposed': 22.1,
      'Area (km²)': 633.0,
    },
    {
      key: 'nampula',
      localName: 'Nampula',
      name: 'Nampula',
      baselineValue: 67000,
      'Population exposed': 67000,
      'Percentage exposed': 18.5,
      'Area (km²)': 425.0,
    },
    {
      key: 'tete',
      localName: 'Tete',
      name: 'Tete',
      baselineValue: 45000,
      'Population exposed': 45000,
      'Percentage exposed': 12.8,
      'Area (km²)': 149.0,
    },
    {
      key: 'quelimane',
      localName: 'Quelimane',
      name: 'Quelimane',
      baselineValue: 32000,
      'Population exposed': 32000,
      'Percentage exposed': 9.3,
      'Area (km²)': 117.0,
    },
    {
      key: 'chimoio',
      localName: 'Chimoio',
      name: 'Chimoio',
      baselineValue: 28000,
      'Population exposed': 28000,
      'Percentage exposed': 8.7,
      'Area (km²)': 174.0,
    },
    {
      key: 'xai-xai',
      localName: 'Xai-Xai',
      name: 'Xai-Xai',
      baselineValue: 15000,
      'Population exposed': 15000,
      'Percentage exposed': 6.2,
      'Area (km²)': 242.0,
    },
  ],
  {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: 'Maputo City',
          'Population exposed': 125000,
          'Percentage exposed': 15.2,
          'Area (km²)': 347.0,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [32.5, -25.9],
              [32.7, -25.9],
              [32.7, -25.7],
              [32.5, -25.7],
              [32.5, -25.9],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          name: 'Beira',
          'Population exposed': 89000,
          'Percentage exposed': 22.1,
          'Area (km²)': 633.0,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [34.8, -19.8],
              [35.0, -19.8],
              [35.0, -19.6],
              [34.8, -19.6],
              [34.8, -19.8],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          name: 'Nampula',
          'Population exposed': 67000,
          'Percentage exposed': 18.5,
          'Area (km²)': 425.0,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [39.2, -15.1],
              [39.4, -15.1],
              [39.4, -14.9],
              [39.2, -14.9],
              [39.2, -15.1],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          name: 'Tete',
          'Population exposed': 45000,
          'Percentage exposed': 12.8,
          'Area (km²)': 149.0,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [33.6, -16.1],
              [33.8, -16.1],
              [33.8, -15.9],
              [33.6, -15.9],
              [33.6, -16.1],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          name: 'Quelimane',
          'Population exposed': 32000,
          'Percentage exposed': 9.3,
          'Area (km²)': 117.0,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [36.8, -17.8],
              [37.0, -17.8],
              [37.0, -17.6],
              [36.8, -17.6],
              [36.8, -17.8],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          name: 'Chimoio',
          'Population exposed': 28000,
          'Percentage exposed': 8.7,
          'Area (km²)': 174.0,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [33.4, -19.1],
              [33.6, -19.1],
              [33.6, -18.9],
              [33.4, -18.9],
              [33.4, -19.1],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          name: 'Xai-Xai',
          'Population exposed': 15000,
          'Percentage exposed': 6.2,
          'Area (km²)': 242.0,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [33.4, -25.0],
              [33.6, -25.0],
              [33.6, -24.8],
              [33.4, -24.8],
              [33.4, -25.0],
            ],
          ],
        },
      },
    ],
  },
  AggregationOperations.Sum,
  [
    { value: 0, color: '#ffffff' },
    { value: 25000, color: '#ffffcc' },
    { value: 50000, color: '#c7e9b4' },
    { value: 75000, color: '#7fcdbb' },
    { value: 100000, color: '#41b6c4' },
    { value: 125000, color: '#2c7fb8' },
  ],
  'Population exposed to flood risk in selected areas',
  'admin1',
  'pop_proj_2025',
  Date.now(),
  [
    { id: 'name', label: 'Administrative Area' },
    { id: 'Population exposed', label: 'Population Exposed' },
    { id: 'Percentage exposed', label: 'Percentage Exposed (%)' },
    { id: 'Area (km²)', label: 'Area (km²)' },
  ],
);
