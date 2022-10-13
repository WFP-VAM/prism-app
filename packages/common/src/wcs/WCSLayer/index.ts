import type { MakeOptional } from '../../types';
import { Layer } from '../../layer';
import {
  createGetCoverageUrl,
  fetchCoverageDescriptionFromCapabilities,
  findAndParseExtent,
  parseDates,
} from '../utils';

export default class WCSLayer extends Layer {
  _description: Promise<string>; // CoverageDescription from DescribeCoverage

  constructor(options: ConstructorParameters<typeof Layer>[0]) {
    super(options);

    this._description = this.capabilities.then(caps =>
      fetchCoverageDescriptionFromCapabilities(caps, this.id, {
        fetch: this._fetch,
      }),
    );
  }

  async getExtent() {
    return findAndParseExtent(await this._description)!;
  }

  async getImageUrl(
    options: MakeOptional<Parameters<typeof createGetCoverageUrl>[2], 'bbox'>,
  ): Promise<string> {
    return createGetCoverageUrl(await this.capabilities, this.id, {
      ...options,
      // use coverage extent if no bbox provided
      bbox: options.bbox || (await this.getExtent()),
    });
  }

  async getImage(
    options: Parameters<typeof this.getImageUrl>[0],
  ): Promise<ArrayBuffer> {
    const url = await this.getImageUrl(options);
    const response = await this._fetch(url);
    return response.arrayBuffer();
  }

  async getLayerDates(): Promise<string[]> {
    return parseDates(await this._description);
  }
}
