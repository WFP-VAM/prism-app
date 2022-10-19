import { parseName } from '../utils';

// classes that extend this base Layer class
// should implement the following functions
// getLayerId, getLayerData, getLayerName,
// getLayerDescription, and getLayerDates

export class Layer {
  public capabilities: Promise<string>;
  public id: string; // e.g., namespace:feature_type
  public namespace: string | undefined;
  public name: string;

  public fetch: any;

  constructor({
    capabilities,
    id,
    fetch: customFetch,
  }: {
    capabilities: Promise<string>;
    id: string;
    fetch?: any;
  }) {
    this.capabilities = capabilities;
    this.id = id;

    this.fetch = customFetch || fetch;

    const { namespace, short } = parseName(id);
    this.namespace = namespace;
    this.name = short;
  }
}
