import nodeFetch from 'node-fetch';
import { getCapabilities } from "../ows/capabilities";

import { hasLayerId, parseService } from "../utils";

const LAYER_DOES_NOT_EXIST = (layerId: string) =>
  `layer "${layerId}" does not exist`;

export class Base {
  capabilities: { [url: string]: Promise<string> } = {};
  debug?: boolean | undefined;
  fetch?: any;
  service?: string;
  url?: string;
  version?: string; // default version

  constructor(
    url: string,
    {
      debug,
      fetch: customFetch,
      service,
      version,
    }: {
      debug?: boolean | undefined;
      fetch?: any;
      service?: string;
      version?: string;
    } = { fetch: undefined }
  ) {
    this.debug = debug;
    this.fetch = customFetch || nodeFetch;

    if (service) {
      this.service = service;
    } else if (!this.service) {
      this.service = parseService(url, { case: "upper" });
    }

    this.url = url;
    this.version =
      version || new URL(url).searchParams.get("version") || undefined;
  }

  async getCapabilities(options?: {
    debug?: boolean;
    version?: string;
  }): Promise<string> {
    if (!this.service) {
      throw new Error("service not set");
    }

    const key = options?.version || this.version || "default";
    if (!this.capabilities[key]) {
      this.capabilities[key] = getCapabilities(this.url!, {
        debug: options?.debug,
        fetch: this.fetch,
        service: this.service,
        version: options?.version || this.version || undefined,
      });
    }
    return this.capabilities[key];
  }

  async getLayerIds(): Promise<string[]> {
    throw new Error(`${this.constructor.name} does not implement getLayerIds`);
  }

  async getLayerNames(): Promise<string[]> {
    throw new Error(
      `${this.constructor.name} does not implement getLayerNames`
    );
  }

  async hasLayerId(
    layerId: string,
    options?: Parameters<typeof hasLayerId>[2]
  ): Promise<boolean> {
    return hasLayerId(await this.getLayerIds(), layerId, options);
  }

  async hasLayerName(layerName: string) {
    return (await this.getLayerNames()).includes(layerName);
  }

  // to-do: check if multiple namespaces share the same layer id
  // in which case, have to be more specific
  async checkLayer(layerId: string) {
    if (!(await this.hasLayerId(layerId, { strict: false }))) {
      throw new Error(LAYER_DOES_NOT_EXIST(layerId));
    }
  }
}
