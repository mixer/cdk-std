import { Clock } from './bundle/clock';
import { Display } from './bundle/display';
import { Navigation } from './bundle/navigation';
import { Socket } from './bundle/socket';
import { IPackageConfig } from './package';
import { RPC } from './rpc';

// tslint:disable-next-line
import './doc';

export * from './rpc';
export * from './typings';
export * from './decoration';
export * from './package';

const rpc = new RPC(window.top, '1.0', '*', document.location.href.indexOf('app=1') > -1);

/**
 * Returns the fully qualified URL to a static project asset.
 * You can pass multiple path segments to join them together.
 * @param {...string} path
 * @returns {string}
 */
export function asset(...path: string[]): string {
  // For now this is fairly stub-ish, it serves as an injection point if we
  // decide to change how assets are delivered in the future.
  return `./${path.map(segment => segment.replace(/^\/+|\/+$/, '')).join('/')}`;
}

let isReady = false;

/**
 * resendReady is called by the host when it detects the iframe loads. It seems
 * that loading can be fired "slowly" in some cases causing the isLoaded event
 * to fire off before the host sets up listeners, so that host will call this
 * method when it first boots to make sure that it didn't miss anything!
 */
rpc.expose('resendReady', () => {
  if (isReady) {
    rpc.call('controlsReady', {}, false);
  }
});

/**
 * This signals to Mixer that the controls have been bound and are ready to
 * start taking Interactive calls. You need to call this to allow your
 * controls to be displayed.
 *
 * In the Preact starter, this is called automatically by the MState class.
 */
export function isLoaded() {
  isReady = true;
  rpc.call('controlsReady', {}, false);
}

window.addEventListener('beforeunload', () => {
  rpc.call('unloading', {}, false);
});

/**
 * Logs an exception to Mixer, called by the exported `log` object.
 * @param {string} level
 * @param {any[]} params
 */
function captureLogMessage(level: string, params: any[]) {
  rpc.call(
    'log',
    {
      level,
      params: params.map(param => {
        if (param instanceof Error) {
          return {
            message: param.message,
            stack: param.stack,
            metadata: typeof (<any>param).cause === 'function' ? (<any>param).cause() : null,
          };
        }

        return param;
      }),
    },
    false,
  );
}

/**
 * `log` has methods to capture messages from your controls. These'll be
 * exposed in the miix UI, and we will continue to build further telemetry
 * around them.
 */
export const log = {
  debug(...params: any[]) {
    captureLogMessage('debug', params);
  },
  info(...params: any[]) {
    captureLogMessage('info', params);
  },
  warn(...params: any[]) {
    captureLogMessage('warn', params);
  },
  error(...params: any[]) {
    captureLogMessage('error', params);
  },
};

window.onerror = (_message, _source, _lineno, _colno, error) => {
  log.error('An uncaught exception occurred.', error);
};

/**
 * Since your interactive controls can be run by any client, it's sometimes
 * useful (particularly if you do fancier service integration) to be able to
 * verify that the player is who they say they are. This method provides a
 * means for you to do that. This is what happens:
 *
 *  1. You create a cryptographically secure challenge for the user. This MUST
 *     be done on your service; the challenge is used so that adversaries
 *     cannot impersonate users (for instance, by gathering challenge
 *     responses for their own integrations then injecting
 *     those into your controls).
 *
 *  2. Mixer servers will create a token based on the challenge and a
 *     secret, and return that in the response to this method.
 *
 *  3. You may transmit the token and challenge to your services and call
 *     /api/v1/interactive/identity/verify to get the user ID that corresponds
 *     to the token. The API will return a 400 if the challenge is invalid.
 *
 * Visualized, that's something like this:
 *
 * ```
 *
 * ┌──────────┐    challenge  ┌──────────┐                ┌───────┐
 * │          ├───────────────▶          │                │       │
 * │          │               │          │─ ─ ─ ─ ─ ─ ─ ─ ▶       │
 * │   Your   │               │          │                │       │
 * │ Service  │               │ Controls │                │       │
 * │          │               │          │                │       │
 * │          │      token    │          │                │       │
 * │          │◀──────────────│          ◀ ─ ─ ─ ─ ─ ─ ─ ─│ Mixer │
 * └─────┬────┘               └──────────┘                │       │
 *       │                                                │       │
 *       │                                                │       │
 *       │    POST /interactive/identity/verify           │       │
 *       └────────────────────────────────────────────────▶       │
 *             { "challenge":"...","token:"..." }         │       │
 *                                                        └───────┘
 * ```
 *
 * @param {string} challenge
 * @returns {Promise.<string>}
 */
export function getIdentityVerification(challenge: string): Promise<string> {
  return rpc.call('verificationChallenge', { challenge }, true);
}

/**
 * Your project's package configuration.
 * @type {IPackageConfig}
 */
export const packageConfig: IPackageConfig = (<any>window).mixerPackageConfig;

/**
 * The list of available locales. This is populated when the build is run
 * with the cdk-webpack-plugin and contains the files in the configured locale
 * folder. For example, this might be set to `['en', 'es']` if you have English
 * and Spanish translation files.
 * @type {Array.<string>}
 */
export const locales: string[] = (<any>window).mixerLocales;

/**
 * Singleton {@link Socket} instance.
 * @type {Socket}
 */
export const socket = new Socket(rpc);

/**
 * Singleton {@link Display} instance.
 * @type {Display}
 */
export const display = new Display(rpc);

/**
 * Singleton {@link Navigation} instance.
 * @type {Navigation}
 */
export const navigation = new Navigation(rpc);

/**
 * Singleton {@link Clock} instance.
 * @type {Clock}
 */
export const clock = new Clock(socket);
