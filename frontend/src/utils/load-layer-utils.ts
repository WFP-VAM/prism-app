export const loadLayerContent = async (path: string): Promise<string> => {
  const resp = await fetch(path);
  return resp.text();
};
