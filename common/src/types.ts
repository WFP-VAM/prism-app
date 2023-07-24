export type BBOX = Readonly<[number, number, number, number]>;

export type LAYER = {
  id: Readonly<string>;
  name: Readonly<string>;
  description: Readonly<string>;
  tags: Readonly<string[]>;
  bbox: Readonly<[number, number, number, number]>;
};

export type MakeOptional<Type, Key extends keyof Type> = Omit<Type, Key> &
  Partial<Pick<Type, Key>>;

export type WCS_FORMAT =
  | "jpeg"
  | "gif"
  | "png"
  | "tif"
  | "bmp"
  | "geotiff"
  | "ArcGrid"
  | "ArcGrid-GZIP";
