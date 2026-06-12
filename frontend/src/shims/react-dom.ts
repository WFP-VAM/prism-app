/**
 * React 19's `react-dom` ESM namespace is non-extensible in production bundles,
 * so runtime assignment of `findDOMNode` throws. MUI v4 / react-transition-group
 * still call it on the *default* export object.
 *
 * Vite alias: `react-dom` → this file; `react-dom-vendor` → real package.
 * Do not import `react-dom` here — use `react-dom-vendor` only.
 *
 * Named exports assigned explicitly — `export * from` breaks CJS interop in Vite.
 */
import * as ReactDOMVendor from 'react-dom-vendor';
import ReactDOMDefault from 'react-dom-vendor';

import { findDOMNodeImpl } from '../reactDomFindDomNodeImpl';

export const createPortal = ReactDOMVendor.createPortal;
export const flushSync = ReactDOMVendor.flushSync;
export const preconnect = ReactDOMVendor.preconnect;
export const prefetchDNS = ReactDOMVendor.prefetchDNS;
export const preinit = ReactDOMVendor.preinit;
export const preinitModule = ReactDOMVendor.preinitModule;
export const preload = ReactDOMVendor.preload;
export const preloadModule = ReactDOMVendor.preloadModule;
export const requestFormReset = ReactDOMVendor.requestFormReset;
export const unstable_batchedUpdates = ReactDOMVendor.unstable_batchedUpdates;
export const useFormState = ReactDOMVendor.useFormState;
export const useFormStatus = ReactDOMVendor.useFormStatus;
export const version = ReactDOMVendor.version;

/** Present on react-dom@19 main entry; omitted from public @types/react-dom. */
export const __DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = (
  ReactDOMVendor as unknown as {
    __DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: unknown;
  }
).__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

export const findDOMNode = findDOMNodeImpl;

const patchedDefault =
  ReactDOMDefault != null && typeof ReactDOMDefault === 'object'
    ? Object.assign({}, ReactDOMDefault as object, {
        findDOMNode: findDOMNodeImpl,
      })
    : ReactDOMDefault;

export default patchedDefault;
