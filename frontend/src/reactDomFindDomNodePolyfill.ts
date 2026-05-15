import * as ReactDOMNamespace from 'react-dom';
import ReactDOMDefault from 'react-dom';

/**
 * @material-ui/core v4 calls ReactDOM.findDOMNode in useIsFocusVisible.
 * React 19 removed it from react-dom exports.
 *
 * Vite prebundles MUI with `__toESM(require('react-dom'))` — that uses the
 * **default** CJS export object. Patching only `import * as ReactDOM` is not
 * enough; patch every distinct object we get from this package.
 */
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
  return null;
};

function patchReactDomInstance(target: unknown) {
  if (
    target === null ||
    typeof target !== 'object' ||
    typeof (target as { findDOMNode?: unknown }).findDOMNode === 'function'
  ) {
    return;
  }
  (target as { findDOMNode: typeof findDOMNodeImpl }).findDOMNode =
    findDOMNodeImpl;
}

patchReactDomInstance(ReactDOMNamespace);
patchReactDomInstance(ReactDOMDefault);
if (
  typeof (ReactDOMNamespace as { default?: unknown }).default === 'object' &&
  (ReactDOMNamespace as { default?: unknown }).default !== ReactDOMDefault
) {
  patchReactDomInstance((ReactDOMNamespace as { default: unknown }).default);
}
