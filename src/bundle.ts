import { Clock } from './bundle/clock';
import { Display } from './bundle/display';
import { Socket } from './bundle/socket';
import { IPackageConfig } from './package';
import { RPC } from './rpc';

export * from './rpc';
export * from './typings';
export * from './decoration';
export * from './package';

const rpc = new RPC(window.top, '1.0');

/**
 * Returns the fully qualified URL to a static project asset, from the
 * `src/static` folder.
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
 * Called by the MState automatically when all hooks are set up. This signals
 * to Mixer that the controls have been bound and are ready to start taking
 * Interactive calls.
 */
export function isLoaded() {
  isReady = true;
  rpc.call('controlsReady', {}, false);
}

window.addEventListener('beforeunload', () => {
  rpc.call('unloading', {}, false);
});

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
 */
export function getIdentityVerification(challenge: string): Promise<string> {
  return rpc.call('verificationChallenge', { challenge }, true);
}

// These are overridden by the MixerPlugin:
export const packageConfig: IPackageConfig = (<any>window).mixerPackageConfig;
export const locales: string[] = (<any>window).mixerLocales;

export const socket = new Socket(rpc);
export const display = new Display(rpc);
export const clock = new Clock(socket);
