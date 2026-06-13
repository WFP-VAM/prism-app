#!/usr/bin/env node
/**
 * Normalize country layer legends:
 * - Inline array matching a shared legends.json entry → use string ref
 * - If ref matches shared/layers.json default for that layer → drop override
 * - Otherwise add a new shared legends.json entry, then use string ref
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configRoot = path.join(__dirname, '../src/config');
const legendsPath = path.join(configRoot, 'shared/legends.json');
const sharedLayersPath = path.join(configRoot, 'shared/layers.json');

const DEDUP_COUNTRIES = [
  'cambodia',
  'cameroon',
  'cuba',
  'ecuador',
  'haiti',
  'indonesia',
  'kyrgyzstan',
  'myanmar',
  'namibia',
  'nepal',
  'nigeria',
  'rbd',
  'sierraleone',
  'southsudan',
  'srilanka',
  'tajikistan',
  'tanzania',
  'ukraine',
  'zimbabwe',
];

const sharedLayers = JSON.parse(fs.readFileSync(sharedLayersPath, 'utf8'));
const sharedLegends = JSON.parse(fs.readFileSync(legendsPath, 'utf8'));
const originalLegendKeys = Object.keys(sharedLegends);

const stats = {
  convertedToExistingRef: 0,
  removedRedundantWithSharedLayer: 0,
  createdSharedEntries: 0,
  convertedToNewRef: 0,
};

function stableStringify(value) {
  return JSON.stringify(value);
}

function findLegendKey(legendArray) {
  for (const [key, value] of Object.entries(sharedLegends)) {
    if (stableStringify(value) === stableStringify(legendArray)) {
      return key;
    }
  }
  return null;
}

function proposeLegendKey(layerId, layer) {
  const style = layer.additional_query_params?.styles;
  const candidates = [];

  if (style && !(style in sharedLegends)) {
    candidates.push(style);
  }
  candidates.push(layerId, `${layerId}_legend`);

  for (const candidate of candidates) {
    if (!(candidate in sharedLegends)) {
      return candidate;
    }
  }

  let version = 2;
  while (`${layerId}_legend_v${version}` in sharedLegends) {
    version += 1;
  }
  return `${layerId}_legend_v${version}`;
}

function normalizeLayerLegend(layerId, layer) {
  if (!Array.isArray(layer.legend)) {
    return layer;
  }

  const inlineLegend = layer.legend;
  const sharedLayerLegendKey =
    typeof sharedLayers[layerId]?.legend === 'string'
      ? sharedLayers[layerId].legend
      : null;

  let legendKey = findLegendKey(inlineLegend);

  if (!legendKey) {
    legendKey = proposeLegendKey(layerId, layer);
    sharedLegends[legendKey] = inlineLegend;
    stats.createdSharedEntries += 1;
    stats.convertedToNewRef += 1;
  } else {
    stats.convertedToExistingRef += 1;
  }

  if (legendKey === sharedLayerLegendKey) {
    const { legend: _removed, ...rest } = layer;
    stats.removedRedundantWithSharedLayer += 1;
    return rest;
  }

  return {
    ...layer,
    legend: legendKey,
  };
}

for (const country of DEDUP_COUNTRIES) {
  const layersPath = path.join(configRoot, country, 'layers.json');
  const layers = JSON.parse(fs.readFileSync(layersPath, 'utf8'));

  for (const [layerId, layer] of Object.entries(layers)) {
    if (!Array.isArray(layer?.legend)) continue;
    layers[layerId] = normalizeLayerLegend(layerId, layer);
  }

  fs.writeFileSync(layersPath, `${JSON.stringify(layers, null, 2)}\n`);
}

const sortedLegendEntries = [
  ...originalLegendKeys.map(key => [key, sharedLegends[key]]),
  ...Object.keys(sharedLegends)
    .filter(key => !originalLegendKeys.includes(key))
    .sort()
    .map(key => [key, sharedLegends[key]]),
].reduce((acc, [key, value]) => {
  acc[key] = value;
  return acc;
}, {});

fs.writeFileSync(legendsPath, `${JSON.stringify(sortedLegendEntries, null, 2)}\n`);

console.log('Legend normalization complete');
console.log(stats);
