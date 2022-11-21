import type { MakeOptional } from "../../types";
import { Layer } from "../../layer";
import {
  createGetCoverageUrl,
  fetchCoverageDescriptionFromCapabilities,
  findAndParseExtent,
  parseDates,
} from "../utils";

type GetImageOptions = MakeOptional<
  Parameters<typeof createGetCoverageUrl>[2],
  "bbox"
>;

export default class WCSLayer extends Layer {
  description: Promise<string>; // CoverageDescription from DescribeCoverage

  constructor(options: ConstructorParameters<typeof Layer>[0]) {
    super(options);

    this.description = this.capabilities.then((caps) =>
      fetchCoverageDescriptionFromCapabilities(caps, this.id, {
        fetch: this.fetch,
      })
    );
  }

  async getExtent() {
    return findAndParseExtent(await this.description)!;
  }

  async getImageUrl(options: GetImageOptions): Promise<string> {
    return createGetCoverageUrl(await this.capabilities, this.id, {
      ...options,
      // use coverage extent if no bbox provided
      bbox: options.bbox || (await this.getExtent()),
    });
  }

  async getImage(options: GetImageOptions): Promise<ArrayBuffer> {
    const url = await this.getImageUrl(options);
    const response = await this.fetch(url);
    return response.arrayBuffer();
  }

  async getLayerDates(): Promise<string[]> {
    return parseDates(await this.description);
  }
}
