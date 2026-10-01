import type { ClipPolygon } from 'utils/clipPmtilesVectorTile';
import { clipMvtTileToPolygon } from 'utils/clipPmtilesVectorTile';

import {
  initPmtilesProtocol,
  registerPmtilesClipPolygon,
} from './pmtiles-utils';

type Loader = (
  params: { url: string },
  abortController: AbortController,
) => Promise<{ data: Uint8Array }>;

let loader: Loader | undefined;

jest.mock('maplibre-gl', () => ({
  addProtocol: (_name: string, fn: Loader) => {
    loader = fn;
  },
  removeProtocol: jest.fn(),
}));

jest.mock('pmtiles', () => ({
  PMTiles: jest.fn(),
  Protocol: jest.fn().mockImplementation(() => ({
    tile: () => Promise.resolve({ data: new Uint8Array([1, 2, 3]) }),
    add: jest.fn(),
  })),
}));

jest.mock('utils/clipPmtilesVectorTile', () => ({
  clipMvtTileToPolygon: jest.fn(() => new Uint8Array()),
}));

const URL = 'https://example.com/fields.pmtiles';
const polygon = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'Polygon', coordinates: [] },
} as unknown as ClipPolygon;

const fetchTile = () =>
  loader!({ url: `pmtiles://${URL}/11/1/2` }, new AbortController());

describe('registerPmtilesClipPolygon', () => {
  let releaseProtocol: () => void;

  beforeAll(() => {
    releaseProtocol = initPmtilesProtocol();
  });

  afterAll(() => releaseProtocol());

  beforeEach(() => {
    (clipMvtTileToPolygon as jest.Mock).mockClear();
  });

  test('keeps clipping until the last consumer releases', async () => {
    const releaseMain = registerPmtilesClipPolygon(URL, polygon);
    const releaseExport = registerPmtilesClipPolygon(URL, polygon);

    releaseExport();
    await fetchTile();
    expect(clipMvtTileToPolygon).toHaveBeenCalledTimes(1);

    // Releasing twice must not drop another consumer's registration.
    releaseExport();
    await fetchTile();
    expect(clipMvtTileToPolygon).toHaveBeenCalledTimes(2);

    releaseMain();
    await fetchTile();
    expect(clipMvtTileToPolygon).toHaveBeenCalledTimes(2);
  });
});
