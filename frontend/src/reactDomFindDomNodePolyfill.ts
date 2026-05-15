import * as ReactDOMNamespace from 'react-dom';
import ReactDOMDefault from 'react-dom';

/**
 * @material-ui/core v4 and react-transition-group still call ReactDOM.findDOMNode.
 * React 19 removed it. We shim enough for:
 * - DOM nodes / refs (MUI useIsFocusVisible)
 * - composite instances (Transition class → Collapse root div)
 *
 * Uses React fiber fields (_reactInternals / __reactFiber*). React 19 may store
 * fibers on non-enumerable keys — use Reflect.ownKeys. Also walks `alternate`
 * (concurrent tree) and BFS across child/sibling so Transition rarely gets null.
 *
 * Long-term: migrate off MUI v4 / legacy transition patterns.
 */
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

const findDOMNodeImpl = (instance: unknown): Element | Text | null => {
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
};

function patchReactDomInstance(target: unknown) {
  if (target === null || typeof target !== 'object') {
    return;
  }
  const t = target as { findDOMNode?: unknown };
  /* React may ship a no-op stub; always replace unless already this shim. */
  if (t.findDOMNode === findDOMNodeImpl) {
    return;
  }
  t.findDOMNode = findDOMNodeImpl;
}

patchReactDomInstance(ReactDOMNamespace);
patchReactDomInstance(ReactDOMDefault);
const ns = ReactDOMNamespace as unknown as { default?: unknown };
if (
  typeof ns.default === 'object' &&
  ns.default != null &&
  ns.default !== ReactDOMDefault
) {
  patchReactDomInstance(ns.default);
}
