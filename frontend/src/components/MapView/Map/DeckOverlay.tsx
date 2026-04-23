import type { Layer } from '@deck.gl/core';
import { useDeckOverlay } from './useDeckOverlay';

export default function DeckOverlay({ layers = [] }: { layers?: Layer[] }) {
  useDeckOverlay(layers);
  return null;
}
