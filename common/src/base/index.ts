import { getCapabilities, getCapabilitiesUrl } from "./utils";

import { hasLayerId } from "../utils";

const LAYER_DOES_NOT_EXIST = (layerId: string) =>
  `layer "${layerId}" does not exist`;

export class Base {
  capabilities: Promise<string>;
  fetch?: any;
  loading: boolean;
  getCapabilitiesUrl?: string;
  service?: string;
  version?: string;

  constructor(
    url: string,
    {
      fetch: customFetch,
      version = "2.0.0",
    }: {
      fetch?: any;
      version?: "2.0.0";
    } = { fetch: undefined, version: "2.0.0" }
  ) {
    this.fetch = customFetch;
    this.version = version;
    this.getCapabilitiesUrl = getCapabilitiesUrl(url, {
      service: this.service,
      version,
    });

    this.loading = true;
    if (!this.getCapabilitiesUrl) {
      throw new Error("no get capabilities url");
    }
    this.capabilities = getCapabilities(this.getCapabilitiesUrl, {
      fetch: this.fetch,
      service: this.service,
    });
    this.capabilities.then(() => {
      this.loading = false;
    });
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
