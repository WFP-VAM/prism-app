/**
 * Utility to fetch country bounding boxes from the country-bounding-boxes repository
 * Source: https://github.com/sandstrom/country-bounding-boxes/blob/master/bounding-boxes.json
 */

interface CountryBoundingBox {
  [countryCode: string]: [string, [number, number, number, number]];
}

let cachedBoundingBoxes: CountryBoundingBox | null = null;

/**
 * Fetch country bounding boxes from the GitHub repository
 */
async function fetchCountryBoundingBoxes(): Promise<CountryBoundingBox> {
  if (cachedBoundingBoxes) {
    return cachedBoundingBoxes;
  }

  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/sandstrom/country-bounding-boxes/master/bounding-boxes.json',
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch bounding boxes: ${response.status}`);
    }

    cachedBoundingBoxes = await response.json();
    return cachedBoundingBoxes as CountryBoundingBox;
  } catch (error) {
    console.warn('Failed to fetch country bounding boxes:', error);
    console.warn(
      'Falling back to empty result - user will need to enter coordinates manually',
    );
    return {};
  }
}

/**
 * Find the closest country match based on country name
 */
export async function findClosestCountry(
  countryName: string,
): Promise<[string, [number, number, number, number]] | null> {
  const boundingBoxes = await fetchCountryBoundingBoxes();
  const normalizedInput = countryName.toLowerCase().trim();

  // First try exact match
  const exactMatch = Object.entries(boundingBoxes).find(
    ([, [name]]) => name.toLowerCase() === normalizedInput,
  );

  if (exactMatch) {
    const [, [name, bbox]] = exactMatch;
    return [name, bbox];
  }

  // Then try partial matches
  const partialMatch = Object.entries(boundingBoxes).find(
    ([, [name]]) =>
      name.toLowerCase().includes(normalizedInput) ||
      normalizedInput.includes(name.toLowerCase()),
  );

  if (partialMatch) {
    const [, [name, bbox]] = partialMatch;
    return [name, bbox];
  }

  // Try word-by-word matching
  const inputWords = normalizedInput.split(/\s+/);
  const wordMatch = Object.entries(boundingBoxes).find(([, [name]]) => {
    const nameWords = name.toLowerCase().split(/\s+/);
    return inputWords.some(word =>
      nameWords.some(
        nameWord => nameWord.includes(word) || word.includes(nameWord),
      ),
    );
  });

  if (wordMatch) {
    const [, [name, bbox]] = wordMatch;
    return [name, bbox];
  }

  return null;
}
