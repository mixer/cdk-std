import { EventEmitter } from 'eventemitter3';

import { IPackageConfig } from './package';
import { IRPCMethod, RPC } from './rpc';
import { ISettings } from './typings';
import {
  IControlChange,
  IGroupCreate,
  IGroupDelete,
  IGroupUpdate,
  IInput,
  IParticipantUpdate,
  IReady,
  ISceneCreate,
  ISceneDelete,
  ISceneUpdate,
  IStateDump,
  IVideoPositionOptions,
} from './typings';

export * from './rpc';
export * from './typings';
export * from './decoration';
export * from './package';

// these are the same right now, but may diverge:
interface IInteractiveRPCMethod<T> extends IRPCMethod<T> {} // tslint:disable-line
// interface IInteractiveRPCReply<T> extends IRPCReply<T> {} // tslint:disable-line

const rpc = new RPC(window.top);

/**
 * Attaches a handler function that will be triggered when the call comes in.
 */
export class Socket extends EventEmitter {
  constructor() {
    super();
    rpc.expose('recieveInteractivePacket', (data: IInteractiveRPCMethod<any>) => {
      this.emit(data.method, data.params);
    });
  }

  /**
   * Sets the handler to use when the editor requests a dump of the current
   * controls state.
   */
  public dumpHandler(fn: () => IStateDump) {
    rpc.expose('dumpState', fn);
  }

  public on(event: 'onParticipantJoin', handler: (ev: IParticipantUpdate) => void): this;
  public on(event: 'onParticipantUpdate', handler: (ev: IParticipantUpdate) => void): this;
  public on(event: 'onGroupCreate', handler: (ev: IGroupCreate) => void): this;
  public on(event: 'onGroupDelete', handler: (ev: IGroupDelete) => void): this;
  public on(event: 'onGroupUpdate', handler: (ev: IGroupUpdate) => void): this;
  public on(event: 'onSceneCreate', handler: (ev: ISceneCreate) => void): this;
  public on(event: 'onSceneDelete', handler: (ev: ISceneDelete) => void): this;
  public on(event: 'onSceneUpdate', handler: (ev: ISceneUpdate) => void): this;
  public on(event: 'onControlCreate', handler: (ev: IControlChange) => void): this;
  public on(event: 'onControlDelete', handler: (ev: IControlChange) => void): this;
  public on(event: 'onControlUpdate', handler: (ev: IControlChange) => void): this;
  public on(event: 'onReady', handler: (ev: IReady) => void): this;
  public on(event: string, handler: (...args: any[]) => void): this {
    super.on(event, handler);
    return this;
  }

  public call(method: 'giveInput', params: IInput): Promise<object>;
  public call(method: string, params: object): Promise<object>;
  public call(method: string, params: object, waitForReply: true): Promise<object>;
  public call(method: string, params: object, waitForReply: false): void;
  public call(
    method: string,
    params: object,
    waitForReply: boolean = true,
  ): Promise<object> | void {
    const reply = rpc.call(
      'sendInteractivePacket',
      {
        method,
        params,
      },
      <any>waitForReply,
    );
    if (!waitForReply) {
      return;
    }

    return reply;
  }
}

/**
 * Display modified the display of interactive controls.
 */
export class Display extends EventEmitter {
  private lastSettings: ISettings;

  constructor() {
    super();
    rpc.expose('updateSettings', (settings: ISettings) => {
      this.lastSettings = settings;
      this.emit('settings', settings);
    });
  }
  /**
   * Hides the controls and displays a loading spinner, optionally
   * with a custom message. This is useful for transitioning. If called
   * while the controls are already minimized, it will update the message.
   */
  public minimize(message?: string): void {
    rpc.call('maximize', { maximized: false, message }, false);
  }

  /**
   * Restores previously minimize()'d controls.
   */
  public maximize(): void {
    rpc.call('maximize', { maximized: true }, false);
  }

  /**
   * Moves the position of the video on the screen.
   */
  public moveVideo(options: IVideoPositionOptions): void {
    rpc.call('moveVideo', options, false);
  }

  /**
   * Returns the current display settings.
   */
  public getSettings(): ISettings | undefined {
    return this.lastSettings;
  }

  public on(event: 'settings', handler: (ev: ISettings) => void): this;
  public on(event: string, handler: (...args: any[]) => void): this {
    super.on(event, handler);
    return this;
  }
}

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
 */
export function getIdentityVerification(challenge: string): Promise<string> {
  return rpc.call('verificationChallenge', { challenge }, true);
}

// These are overridden by the MixerPlugin:
export const packageConfig: IPackageConfig = (<any>window).mixerPackageConfig;
export const locales: string[] = (<any>window).mixerLocales;

export const socket = new Socket();
export const display = new Display();