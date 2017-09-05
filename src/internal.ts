export * from './rpc';
export * from './typings';
export * from './decoration';
export * from './package';

import { join } from 'path';

/**
 * Returns the path to the minified bundle for the standard library.
 */
export function getBundlePath() {
  return join(__dirname, 'bundle.min.js');
}
