import { getCapabilities, getCapabilitiesUrl } from './utils';

import { hasLayerId } from '../utils';

const NOT_IMPLEMENTED = 'not implemented';
const LAYER_DOES_NOT_EXIST = (layerId: string) =>
  `layer "${layerId}" does not exist`;

export class Base {
  capabilities: Promise<string>;
  _fetch?: any;
  _loading: boolean;
  _getCapabilitiesUrl?: string;
  _service?: string;
  _version?: string;

  constructor(
    url: string,
    {
      debug = false,
      fetch: _fetch,
      version = '2.0.0',
    }: {
      debug?: boolean;
      fetch?: any;
      version?: '2.0.0';
    } = { debug: false, fetch: undefined, version: '2.0.0' },
  ) {
    this._fetch = _fetch;
    this._version = version;
    this._getCapabilitiesUrl = getCapabilitiesUrl(url, {
      debug,
      service: this._service,
      version,
    });

    this._loading = true;
    if (!this._getCapabilitiesUrl) {
      throw new Error('no get capabilities url');
    }
    this.capabilities = getCapabilities(this._getCapabilitiesUrl, {
      fetch: this._fetch,
      service: this._service,
    });
    this.capabilities.then(() => (this._loading = false));
  }

  async getLayerIds(): Promise<string[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getLayerNames(): Promise<string[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async hasLayerId(
    layerId: string,
    options?: Parameters<typeof hasLayerId>[2],
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
