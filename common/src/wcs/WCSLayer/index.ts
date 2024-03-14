/* eslint-disable fp/no-mutation */
import type { MakeOptional } from "../../types";
import { Layer } from "../../layer";
import {
  createGetCoverageUrl,
  fetchCoverageDescriptionFromCapabilities,
  findAndParseExtent,
  findAndParseCoverage,
  parseDates,
  parseLayerDays,
} from "../utils";

type GetImageOptions = MakeOptional<
  Omit<
    Parameters<typeof createGetCoverageUrl>[0],
    "capabilities" | "layerId" | "url"
  >,
  "bbox"
>;

type WCSLayerOptions = ConstructorParameters<typeof Layer>[0] & {
  wait?: number;
};

export default class WCSLayer extends Layer {
  description: Promise<string>; // CoverageDescription from DescribeCoverage

  constructor(options: WCSLayerOptions) {
    super(options);

    this.description = this.capabilities.then((caps) =>
      fetchCoverageDescriptionFromCapabilities(caps, this.id, {
        debug: options.debug,
        fetch: this.fetch,
        wait: options.wait,
      })
    );
  }

  // get extent as a [west, south, east, north]
  async getExtent(): Promise<Readonly<[number, number, number, number]>> {
    // sometimes DescribeCoverage will take a long time,
    // so use GetCapabilities if it is resolves more quickly
    return new Promise((resolve, reject) => {
      let count = 0;
      let resolved = false;
      this.capabilities.then((caps) => {
        if (!resolved) {
          count += 1;
          const bbox = findAndParseCoverage(caps, this.id)?.wgs84bbox;
          if (bbox) {
            resolved = true;
            resolve(bbox);
          } else if (count === 2) {
            reject(Error("unable to get extent"));
          }
        }
      });
      this.description.then((description) => {
        if (!resolved) {
          count += 1;
          const bbox = findAndParseExtent(description);
          if (bbox) {
            resolved = true;
            resolve(bbox);
          } else if (count === 2) {
            reject(Error("unable to get extent"));
          }
        }
      });
    });
  }

  async getImageUrl(options: GetImageOptions): Promise<string> {
    return createGetCoverageUrl({
      capabilities: await this.capabilities,
      layerId: this.id,
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

  async getLayerDayRanges(): Promise<number[]> {
    return parseLayerDays(await this.description);
  }
}
