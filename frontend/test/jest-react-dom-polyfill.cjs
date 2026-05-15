/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

/**
 * Match src/reactDomFindDomNodePolyfill.ts for Jest (React 19 + MUI v4).
 */

function findFiber(instance) {
  if (instance._reactInternals != null) {
    return instance._reactInternals;
  }
  const keys = Reflect.ownKeys(instance);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (
      typeof key === 'string' &&
      (key.startsWith('__reactFiber') ||
        key.startsWith('__reactInternalInstance'))
    ) {
      const v = instance[key];
      if (v != null) {
        return v;
      }
    }
  }
  return null;
}

function findHostDomFromFiberBfs(start) {
  if (start == null || typeof start !== 'object') {
    return null;
  }
  const q = [start];
  const seen = new Set();
  while (q.length > 0) {
    const fiber = q.shift();
    if (fiber == null || typeof fiber !== 'object') {
      continue;
    }
    if (seen.has(fiber)) {
      continue;
    }
    seen.add(fiber);
    const sn = fiber.stateNode;
    if (sn != null && typeof sn === 'object' && 'nodeType' in sn) {
      const nt = sn.nodeType;
      if (nt === 1 || nt === 3 || nt === 8) {
        return sn;
      }
    }
    if (fiber.child != null) {
      q.push(fiber.child);
    }
    if (fiber.sibling != null) {
      q.push(fiber.sibling);
    }
    if (fiber.alternate != null) {
      q.push(fiber.alternate);
    }
  }
  return null;
}

function findDOMNodePolyfill(instance) {
  if (instance == null) {
    return null;
  }
  if (
    typeof instance === 'object' &&
    instance !== null &&
    'nodeType' in instance
  ) {
    const nt = instance.nodeType;
    if (nt === 1 || nt === 3 || nt === 8) {
      return instance;
    }
  }
  if (typeof instance !== 'object' || instance === null) {
    return null;
  }
  if ('current' in instance && instance.current != null) {
    return findDOMNodePolyfill(instance.current);
  }
  const fiber = findFiber(instance);
  if (fiber == null || typeof fiber !== 'object') {
    return null;
  }
  if (fiber.stateNode === instance) {
    const fromChild = findHostDomFromFiberBfs(fiber.child);
    if (fromChild != null) {
      return fromChild;
    }
  }
  return findHostDomFromFiberBfs(fiber);
}

const ReactDOM = require('react-dom');
if (ReactDOM.findDOMNode !== findDOMNodePolyfill) {
  ReactDOM.findDOMNode = findDOMNodePolyfill;
}
