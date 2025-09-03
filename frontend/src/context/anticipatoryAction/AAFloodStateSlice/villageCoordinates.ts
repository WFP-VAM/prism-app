// Village coordinates for Mozambique flood stations
export const VILLAGE_COORDINATES: Record<
  string,
  { latitude: number; longitude: number }
> = {
  dombe: { latitude: -19.9758, longitude: 33.3981 },
  espungabera: { latitude: -20.4528, longitude: 32.7722 },
  franca: { latitude: -19.5, longitude: 33.0 }, // Approximate coordinates - needs verification
  goonda: { latitude: -18.0, longitude: 35.0 }, // Approximate coordinates - needs verification
  gurue: { latitude: -15.0375, longitude: 36.9789 },
  massangena: { latitude: -21.742, longitude: 32.6564 },
  messalo: { latitude: -12.4167, longitude: 39.25 },
  mocuba: { latitude: -16.909, longitude: 36.9667 },
  nairoto: { latitude: -17.0, longitude: 36.0 }, // Approximate coordinates - needs verification
  revue: { latitude: -19.8333, longitude: 34.0 },
};

// Helper function to get coordinates for a station name
export const getVillageCoordinates = (
  stationName: string,
): { latitude: number; longitude: number } | null => {
  const normalizedName = stationName.toLowerCase().trim();
  return VILLAGE_COORDINATES[normalizedName] || null;
};
