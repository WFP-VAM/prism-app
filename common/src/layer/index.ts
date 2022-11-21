import { parseName } from "../utils";

// classes that extend this base Layer class
// should implement the following functions
// getLayerId, getLayerData, getLayerName,
// getLayerDescription, and getLayerDates

export class Layer {
  public capabilities: Promise<string>;
  public id: string; // e.g., namespace:feature_type
  public layer: Promise<string> | undefined;
  public namespace: string | undefined;
  public name: string;

  public fetch: any;

  constructor({
    capabilities,
    id,
    layer,
    fetch: customFetch,
  }: {
    capabilities: string | Promise<string>;
    id: string;
    layer?: string;
    fetch?: any;
  }) {
    this.capabilities = Promise.resolve(capabilities);
    this.id = id;

    if (layer) {
      this.layer = Promise.resolve(layer);
    }

    this.fetch = customFetch || fetch;

    const { namespace, short } = parseName(id);
    this.namespace = namespace;
    this.name = short;
  }
}
