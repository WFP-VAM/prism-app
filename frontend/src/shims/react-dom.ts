/**
 * React 19's `react-dom` ESM namespace is non-extensible in production bundles,
 * so runtime assignment of `findDOMNode` throws. MUI v4 / react-transition-group
 * still call it on the *default* export object.
 *
 * Vite alias: `react-dom` → this file; `react-dom-vendor` → real package.
 * Do not import `react-dom` here — use `react-dom-vendor` only.
 */
export * from 'react-dom-vendor';
export { findDOMNodeImpl as findDOMNode } from '../reactDomFindDomNodeImpl';
import ReactDOMDefault from 'react-dom-vendor';
import { findDOMNodeImpl } from '../reactDomFindDomNodeImpl';

const patchedDefault =
  ReactDOMDefault != null && typeof ReactDOMDefault === 'object'
    ? Object.assign({}, ReactDOMDefault as object, {
        findDOMNode: findDOMNodeImpl,
      })
    : ReactDOMDefault;

export default patchedDefault;
