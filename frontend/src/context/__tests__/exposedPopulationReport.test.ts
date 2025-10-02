import { mockExposedPopulationData } from '../__mocks__/exposedPopulationMockData';
import { ExposedPopulationResult } from 'utils/analysis-utils';

describe('Exposed Population Report', () => {
  let mockData: ExposedPopulationResult;

  beforeEach(() => {
    mockData = mockExposedPopulationData;
  });

  test('should have correct structure', () => {
    expect(mockData).toBeInstanceOf(ExposedPopulationResult);
    expect(mockData.tableData).toBeDefined();
    expect(mockData.featureCollection).toBeDefined();
    expect(mockData.legend).toBeDefined();
    expect(mockData.legendText).toBeDefined();
    expect(mockData.statistic).toBeDefined();
    expect(mockData.groupBy).toBeDefined();
    expect(mockData.key).toBeDefined();
    expect(mockData.analysisDate).toBeDefined();
    expect(mockData.tableColumns).toBeDefined();
  });

  test('should have valid table data with required fields', () => {
    expect(mockData.tableData).toHaveLength(7);
    
    mockData.tableData.forEach(row => {
      expect(row).toHaveProperty('key');
      expect(row).toHaveProperty('localName');
      expect(row).toHaveProperty('name');
      expect(row).toHaveProperty('baselineValue');
      expect(row).toHaveProperty('Population exposed');
      expect(row).toHaveProperty('Percentage exposed');
      expect(row).toHaveProperty('Area (km²)');
      
      expect(typeof row.key).toBe('string');
      expect(typeof row.localName).toBe('string');
      expect(typeof row.name).toBe('string');
      expect(typeof row.baselineValue).toBe('number');
      expect(typeof row['Population exposed']).toBe('number');
      expect(typeof row['Percentage exposed']).toBe('number');
      expect(typeof row['Area (km²)']).toBe('number');
    });
  });

  test('should have valid GeoJSON feature collection', () => {
    expect(mockData.featureCollection.type).toBe('FeatureCollection');
    expect(mockData.featureCollection.features).toHaveLength(7);
    
    mockData.featureCollection.features.forEach(feature => {
      expect(feature.type).toBe('Feature');
      expect(feature.geometry).toBeDefined();
      expect(feature.properties).toBeDefined();
      expect(feature.geometry.type).toBe('Polygon');
      expect(Array.isArray(feature.geometry.coordinates)).toBe(true);
    });
  });

  test('should have Mozambique coordinates within valid range', () => {
    const mozambiqueBounds = {
      minLon: 30.2,
      maxLon: 40.8,
      minLat: -26.9,
      maxLat: -10.5
    };

    mockData.featureCollection.features.forEach(feature => {
      const coordinates = feature.geometry.coordinates[0];
      coordinates.forEach(([lon, lat]) => {
        expect(lon).toBeGreaterThanOrEqual(mozambiqueBounds.minLon);
        expect(lon).toBeLessThanOrEqual(mozambiqueBounds.maxLon);
        expect(lat).toBeGreaterThanOrEqual(mozambiqueBounds.minLat);
        expect(lat).toBeLessThanOrEqual(mozambiqueBounds.maxLat);
      });
    });
  });

  test('should have valid legend configuration', () => {
    expect(mockData.legend).toHaveLength(6);
    
    mockData.legend.forEach(legendItem => {
      expect(legendItem).toHaveProperty('value');
      expect(legendItem).toHaveProperty('color');
      expect(typeof legendItem.value).toBe('number');
      expect(typeof legendItem.color).toBe('string');
      expect(legendItem.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    // Check that legend values are in ascending order
    const values = mockData.legend.map(item => item.value);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });

  test('should have valid table columns', () => {
    expect(mockData.tableColumns).toHaveLength(4);
    
    const expectedColumns = [
      { id: 'name', label: 'Administrative Area' },
      { id: 'Population exposed', label: 'Population Exposed' },
      { id: 'Percentage exposed', label: 'Percentage Exposed (%)' },
      { id: 'Area (km²)', label: 'Area (km²)' }
    ];

    expectedColumns.forEach(expectedCol => {
      const foundCol = mockData.tableColumns.find(col => col.id === expectedCol.id);
      expect(foundCol).toBeDefined();
      expect(foundCol?.label).toBe(expectedCol.label);
    });
  });

  test('should have realistic population data', () => {
    mockData.tableData.forEach(row => {
      const population = row['Population exposed'];
      const percentage = row['Percentage exposed'];
      const area = row['Area (km²)'];
      
      expect(population).toBeGreaterThan(0);
      expect(percentage).toBeGreaterThan(0);
      expect(percentage).toBeLessThanOrEqual(100);
      expect(area).toBeGreaterThan(0);
      
      // Check that percentage and population are consistent
      const calculatedPercentage = (population / row.baselineValue) * 100;
      expect(Math.abs(calculatedPercentage - percentage)).toBeLessThan(0.1);
    });
  });

  test('should have consistent data between table and GeoJSON features', () => {
    const tableDataMap = new Map(
      mockData.tableData.map(row => [row.name, row])
    );

    mockData.featureCollection.features.forEach(feature => {
      const featureName = feature.properties.name;
      const tableRow = tableDataMap.get(featureName);
      
      expect(tableRow).toBeDefined();
      expect(feature.properties['Population exposed']).toBe(tableRow!['Population exposed']);
      expect(feature.properties['Percentage exposed']).toBe(tableRow!['Percentage exposed']);
      expect(feature.properties['Area (km²)']).toBe(tableRow!['Area (km²)']);
    });
  });

  test('should have valid metadata', () => {
    expect(mockData.statistic).toBe('Sum');
    expect(mockData.groupBy).toBe('admin1');
    expect(mockData.key).toBe('pop_proj_2025');
    expect(mockData.legendText).toBe('Population exposed to flood risk in selected areas');
    expect(typeof mockData.analysisDate).toBe('number');
    expect(mockData.analysisDate).toBeGreaterThan(0);
  });

  test('should have unique keys for table rows', () => {
    const keys = mockData.tableData.map(row => row.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  test('should have valid polygon coordinates structure', () => {
    mockData.featureCollection.features.forEach(feature => {
      const coordinates = feature.geometry.coordinates;
      expect(Array.isArray(coordinates)).toBe(true);
      expect(coordinates).toHaveLength(1); // Single ring polygon
      
      const ring = coordinates[0];
      expect(Array.isArray(ring)).toBe(true);
      expect(ring.length).toBeGreaterThanOrEqual(4); // At least 4 points for a polygon
      
      // Check that first and last coordinates are the same (closed polygon)
      const first = ring[0];
      const last = ring[ring.length - 1];
      expect(first[0]).toBe(last[0]);
      expect(first[1]).toBe(last[1]);
    });
  });
});
