import fs from 'fs';
import path from 'path';

export const getIcon = (iconPath: string, base64: boolean): string => {
  const absolutePath = path.resolve(__dirname, '../images', iconPath);
  if (base64) {
    const iconBuffer = fs.readFileSync(absolutePath);
    return `data:image/png;base64,${iconBuffer.toString('base64')}`;
  }
  return `/images/${iconPath}`;
};

export const mapIcon = (base64: boolean) => getIcon('mapIcon.png', base64);
export const arrowForwardIcon = (base64: boolean) => getIcon('arrowForwardIcon.png', base64);
