/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

/**
 * @material-ui/core v4 uses ReactDOM.findDOMNode (removed in React 19).
 * setupFiles runs before the test framework so react-dom is patched once.
 */
const ReactDOM = require('react-dom');
if (typeof ReactDOM.findDOMNode !== 'function') {
  ReactDOM.findDOMNode = function findDOMNode(instance) {
    if (instance == null) return null;
    if (
      typeof instance === 'object' &&
      instance !== null &&
      'nodeType' in instance
    ) {
      const nodeType = instance.nodeType;
      if (nodeType === 1 || nodeType === 3 || nodeType === 8) {
        return instance;
      }
    }
    return null;
  };
}
