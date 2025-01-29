import fs from 'fs';
import path from 'path';

/**
 * Encodes an image to Base64.
 * @param imagePath Relative path of the image from the `public` folder.
 * @returns Base64-encoded string of the image.
 */
export const encodeImageToBase64 = (imagePath: string): string => {
  return fs.readFileSync(path.join(__dirname, '../../public', imagePath), 'base64');
};
