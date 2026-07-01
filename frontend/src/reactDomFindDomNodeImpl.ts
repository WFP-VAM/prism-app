/**
 * findDOMNode replacement for React 19 (removed API). Used by @mui/material v4
 * and react-transition-group via our react-dom shim default export.
 *
 * Fiber walk: non-enumerable __reactFiber* keys, BFS child/sibling/alternate.
 *
 * Long-term: migrate off MUI v4 / legacy transition patterns.
 */
export function findDOMNodeImpl(instance: unknown): Element | Text | null {
  if (instance == null) {
    return null;
  }
  if (
    typeof instance === 'object' &&
    instance !== null &&
    'nodeType' in instance
  ) {
    const nodeType = (instance as { nodeType: number }).nodeType;
    if (nodeType === 1 || nodeType === 3 || nodeType === 8) {
      return instance as Element | Text;
    }
  }
  if (typeof instance !== 'object' || instance === null) {
    return null;
  }
  const inst = instance as Record<string, unknown> & {
    _reactInternals?: { stateNode?: unknown; child?: unknown };
  };

  if ('current' in inst && inst.current != null) {
    return findDOMNodeImpl(inst.current);
  }

  const fiber = findFiber(instance);
  if (fiber == null || typeof fiber !== 'object') {
    return null;
  }
  const f = fiber as { stateNode?: unknown; child?: unknown };
  if (f.stateNode === instance) {
    const fromChild = findHostDomFromFiberBfs(f.child);
    if (fromChild != null) {
      return fromChild;
    }
  }
  return findHostDomFromFiberBfs(fiber);
}

function findFiber(instance: object): unknown {
  const inst = instance as Record<PropertyKey, unknown>;
  if (inst._reactInternals != null) {
    return inst._reactInternals;
  }
  for (const key of Reflect.ownKeys(inst)) {
    if (typeof key !== 'string') {
      continue;
    }
    if (
      key.startsWith('__reactFiber') ||
      key.startsWith('__reactInternalInstance')
    ) {
      const v = inst[key];
      if (v != null) {
        return v;
      }
    }
  }
  return null;
}

function findHostDomFromFiberBfs(start: unknown): Element | Text | null {
  if (start == null || typeof start !== 'object') {
    return null;
  }
  const q: unknown[] = [start];
  const seen = new Set<object>();
  while (q.length > 0) {
    const fiber = q.shift();
    if (fiber == null || typeof fiber !== 'object') {
      continue;
    }
    if (seen.has(fiber)) {
      continue;
    }
    seen.add(fiber);
    const f = fiber as {
      stateNode?: unknown;
      child?: unknown;
      sibling?: unknown;
      alternate?: unknown;
    };
    const sn = f.stateNode;
    if (sn != null && typeof sn === 'object' && 'nodeType' in (sn as object)) {
      const nt = (sn as { nodeType: number }).nodeType;
      if (nt === 1 || nt === 3 || nt === 8) {
        return sn as Element | Text;
      }
    }
    if (f.child != null) {
      q.push(f.child);
    }
    if (f.sibling != null) {
      q.push(f.sibling);
    }
    if (f.alternate != null) {
      q.push(f.alternate);
    }
  }
  return null;
}
