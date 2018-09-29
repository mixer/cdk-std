import { EventEmitter } from 'eventemitter3';
import { stringify } from 'querystring';

import { IPostable, RPC, RPCError } from './rpc';
import { ErrorCode, ILogEntry, ISettings, IStateDump, IVideoPositionOptions } from './typings';

/**
 * This is file contains a websocket implementation to coordinate messaging
 * between the Interactive iframe and the Interactive service.
 */

const enum State {
  Loading,
  Ready,
  Closing,
  Closed,
}

/**
 * IConnectionOptions is passed into Participant.connect()
 */
export interface IConnectionOptions {
  socketAddress: string;
  contentAddress: string;
  ugcAddress: string;
  key?: string;
  xAuthUser?: {
    ID?: number;
    Username?: string;
    XP?: string;
  };
}

export interface IInteractiveFrame {
  src: string;
  contentWindow: IPostable;
  isApp?: boolean;
  addEventListener(event: string, listener: (ev: any) => void): void;
  removeEventListener(event: string, listener: (ev: any) => void): void;
  setOnMessage?(listener: (ev: any) => void): void;
  removeOnMessage?(listener: (ev: any) => void): void;
}

/**
 * ICloseData is fired in a `close` event.
 */
export interface ICloseData {
  /**
   * HTTP *or* websocket error code that caused the connection to fail.
   * -1 if we couldn't find an appropriate code.
   */
  code: number;

  /**
   * Associated developer-readable message.
   */
  message?: string;

  /**
   * Whether the socket was closed from a manual call to destroy())
   */
  expected: boolean;

  /**
   * Event that caused this error to happen. May be a websocket CloseEvent
   * if it was closed as a result of a websocket frame, but it can be a plain
   * Event if an error happened prior to us getting a socket connect going.
   */
  ev: CloseEvent | Event;
}

/**
 * Stringifies and appends the given query string to the URL.
 */
function appendQueryString(url: string, qs: object) {
  const delimiter = url.indexOf('?') > -1 ? '&' : '?';
  return `${url}${delimiter}${stringify(qs)}`;
}

/**
 * Represents raw data received from the interactive server.
 */
interface IIncomingPacket {
  type: string;
  method: string;
  params: any;
}

interface IScene {
  sceneID: string;
  controls: IControl[] | null;
}

interface IControl {
  controlID: string;
  kind: string;
}

interface IGroup {
  groupID: string;
  sceneID: string;
}

/**
 * Internally retains data required to acquire a control's kind.
 * @private
 */
class ControlsState extends EventEmitter {
  private scenes: { [sceneID: string]: { [controlID: string]: string } } = {};
  private groups: { [groupID: string]: string } = {};
  private currentGroup = 'default';

  /**
   * Handles a packet sent from the client.
   */
  public handleIncomingPacket({ type, method, params }: IIncomingPacket) {
    if (type !== 'method') {
      return;
    }

    if (method === 'onControlCreate' || method === 'onControlUpdate') {
      this.cacheScene(params, true);
    }

    if (method === 'onSceneCreate') {
      params.scenes.forEach((scene: IScene) => {
        this.cacheScene(scene);
      });
    }

    if (method === 'onSceneDelete') {
      delete this.scenes[params.sceneID];
    }

    if (method === 'onGroupCreate' || method === 'onGroupUpdate') {
      params.groups.forEach((group: IGroup) => {
        this.cacheGroup(group);
      });
    }

    if (method === 'onGroupDelete') {
      delete this.groups[params.groupID];
    }

    if (method === 'onParticipantJoin' || method === 'onParticipantUpdate') {
      this.currentGroup = params.participants[0].groupID;
    }
  }

  /**
   * Gets a control's kind by its control ID.
   */
  public getControlKind(controlID: string) {
    return this.scenes[this.groups[this.currentGroup]][controlID];
  }

  /**
   * Caches the control kind for a scene.
   */
  private cacheScene(scene: IScene, isPartial = false) {
    if (!this.scenes[scene.sceneID] || !isPartial) {
      this.scenes[scene.sceneID] = {};
    }

    if (!scene.controls) {
      return;
    }

    scene.controls.forEach(control => {
      this.scenes[scene.sceneID][control.controlID] = control.kind;
    });
  }

  /**
   * Caches a group.
   */
  private cacheGroup(group: IGroup) {
    this.groups[group.groupID] = group.sceneID;
  }
}

/**
 * Participant is a bridge between the Interactive service and an iframe that
 * shows custom controls. It proxies calls between them and emits events
 * when states change.
 * @private (at least to most consumers!)
 */
export class Participant extends EventEmitter {
  /**
   * Interactive protocol version this participant implements.
   */
  public static readonly protocolVersion = '2.0';

  /**
   * Websocket connecte
   */
  private websocket?: WebSocket;

  /**
   * RPC wrapper around the controls.
   */
  private rpc?: RPC;

  /**
   * Buffer of packets from to replay once the controls load.
   * As soon as we connect to interactive it'll send the initial state
   * messages, but there's a good chance we won't have loaded the controls
   * by that time, so buffer 'em until the controls say they're ready.
   */
  private replayBuffer: ((rpc: RPC) => void)[] = [];

  /**
   * Controls state.
   */
  private state = State.Loading;

  /**
   * Holds a map of control IDs and their kinds outside of the iframe to be
   * used for analytics.
   */
  private controls = new ControlsState();

  /**
   * Holds the list of exposed methods via RPC
   */
  private rpcExposedMethods: string[] = [];

  constructor(private readonly frame: IInteractiveFrame, settings: ISettings) {
    super();
    this.runOnRpc(rpc => {
      rpc.call('updateSettings', settings, false);
      const windowsAPI = (<any>window).Windows;
      if (windowsAPI) {
        const viewPane = windowsAPI.UI.ViewManagement.InputPane.getForCurrentView();
        viewPane.onshowing = () => {
          rpc.call('keyboardShowing', {}, false);
        };
        viewPane.onhiding = () => {
          rpc.call('keyboardHiding', {}, false);
        };
      }
    });
  }

  /**
   * Creates a connection to the given Interactive address.
   */
  public connect(options: IConnectionOptions): this {
    const qs = {
      // cache bust the iframe to ensure that it reloads
      // whenever we get a new connection.
      bustCache: Date.now(),
      key: options.key,
      'x-protocol-version': Participant.protocolVersion,
      'x-auth-user': options.xAuthUser ? JSON.stringify(options.xAuthUser) : undefined,
    };

    const ws = (this.websocket = new WebSocket(appendQueryString(options.socketAddress, qs)));
    this.frame.src = options.contentAddress;
    this.frame.addEventListener('load', this.onFrameLoad);

    ws.addEventListener('message', data => {
      this.sendInteractive(data.data);
    });

    ws.addEventListener('close', ev => {
      this.emit('close', {
        code: ev.code,
        message: ev.reason,
        expected: this.state === State.Closing,
        ev,
      });

      this.state = State.Closed;
      this.destroy();
    });

    ws.addEventListener('error', ev => {
      this.handleWebsocketError(ev);
    });

    return this;
  }

  /**
   * add exposes a callable function to the controls.
   */
  public add(
    method: 'verificationChallenge',
    fn: (params: { challenge: string }) => Promise<string>,
  ): this;
  public add(method: string, fn: (params: any) => any): this {
    this.runOnRpc(rpc => {
      rpc.expose(method, fn);
    });
    return this;
  }

  /**
   * Updates the controls' settings.
   */
  public updateSettings(settings: ISettings) {
    this.runOnRpc(rpc => {
      rpc.call('updateSettings', settings, false);
    });
  }

  /**
   * Triggers a dump of state from the nested controls. Returns undefined if
   * the controls do not expose a dumpState method.
   */
  public dumpState(): Promise<IStateDump | undefined> {
    if (!this.rpc) {
      return Promise.resolve(undefined);
    }

    return this.rpc.call<IStateDump>('dumpState', {}, true).catch(err => {
      if (err instanceof RPCError && err.code === ErrorCode.AppBadMethod) {
        return undefined; // controls don't expose dumpState, sad but we'll hide our sadness
      }

      throw new err();
    });
  }

  /**
   * Closes the participant connection and frees resources.
   */
  public destroy() {
    if (this.state < State.Closing) {
      this.state = State.Closing;
    }

    if (this.rpc) {
      this.rpc.destroy();
    }

    try {
      if (this.websocket) {
        this.websocket.close();
      }
    } catch (_e) {
      // Ignored. Sockets can be fussy if they're closed at
      // the wrong time but it doesn't cause issues.
    }
  }

  /**
   * A close event is emitted, with the error code, if we fail to connect
   * to Interactive or the connection is lost.
   */
  public on(event: 'close', handler: (reason: ICloseData) => void): this;

  /**
   * Transmit is fired whenever we proxy an event from the Interactive
   * socket to the controls.
   */
  public on(event: 'transmit', handler: (data: object) => void): this;

  /**
   * Called when the control asks to be maximized or minimized.
   */
  public on(event: 'maximize', handler: (isMaximized: boolean, message?: string) => void): this;

  /**
   * Called when the control asks to move the video position.
   */
  public on(event: 'moveVideo', handler: (options: IVideoPositionOptions) => void): this;

  /**
   * The unload event is fired when the user navigates away from the page.
   */
  public on(event: 'unload', handler: () => void): this;

  /**
   * Loaded is fired when the contained iframe loads and controls signal that
   * they're ready.
   */
  public on(event: 'loaded', handler: () => void): this;

  /**
   * Log is fired when the controls intentionally log some data.
   */
  public on(event: 'log', handler: (entry: ILogEntry) => void): this;

  /**
   * Focusout is fired when we hit escape or gamepad B
   */
  public on(event: 'focusOut', handler: () => void): this;

  /**
   * HandleExit is sent if we want to disable exiting with gamepadB for a single input
   */
  public on(event: 'handleExit', handler: () => void): this;

  /**
   * PreventExit is sent if we want to disable exiting with gamepadB
   */
  public on(event: 'preventExit', handler: () => void): this;

  /**
   * AllowExit is sent if we want to enable exiting with gamepadB
   */
  public on(event: 'allowExit', handler: () => void): this;

  /**
   * Navigate is fired when using keyboard nav
   */
  public on(event: 'navigate', handler: () => void): this;

  /**
   * Input is fired when the client sends an input to the server.
   */
  public on(
    event: 'input',
    handler: (input: { controlID: string; kind: string; event: string }) => void,
  ): this;

  public on(event: string, handler: (...args: any[]) => void): this;
  public on(event: string, handler: (...args: any[]) => void): this {
    this.exposeRPC(event, (...params: any[]) => {
      params.splice(0, 0, event);
      this.emit.apply(this, params);
    });
    super.on(event, handler);
    return this;
  }

  /**
   * Calls the function with the RPC instance once it's ready and attached.
   */
  public runOnRpc(fn: (rpc: RPC) => void) {
    if (this.state !== State.Ready) {
      this.replayBuffer.push(fn);
    } else {
      fn(this.rpc!);
    }
  }

  /**
   * sendInteractive broadcasts the interactive payload down to the controls,
   * and emits a `transmit` event.
   */
  private sendInteractive(data: string) {
    let parsed: IIncomingPacket | IIncomingPacket[] = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    this.runOnRpc(rpc => {
      (<IIncomingPacket[]>parsed).forEach(p => {
        rpc.call('recieveInteractivePacket', p, false);
        this.emit('transmit', p);
        this.controls.handleIncomingPacket(p);
      });
    });
  }

  /**
   * attachListeners is called once the frame contents load to boot up
   * the RPC system.
   */
  private attachListeners() {
    this.rpc = new RPC(
      this.frame.contentWindow,
      '1.0',
      '*',
      this.frame.isApp,
      this.frame.setOnMessage,
      this.frame.removeOnMessage,
    );

    this.exposeRPC<{ method: string; params: any }>('sendInteractivePacket', data => {
      this.websocket!.send(
        JSON.stringify({
          ...data,
          type: 'method',
          discard: true,
        }),
      );

      if (data.method !== 'giveInput') {
        return;
      }

      const kind = this.controls.getControlKind(data.params.controlID);
      if (!kind) {
        return;
      }

      this.emit('input', {
        ...data.params,
        kind,
      });
    });

    this.exposeRPC('controlsReady', () => {
      if (this.state !== State.Loading) {
        return;
      }

      this.state = State.Ready;
      this.replayBuffer.forEach(p => {
        p(this.rpc!);
      });
      this.replayBuffer = [];
      this.emit('loaded');
    });

    this.exposeRPC('maximize', (params: { maximized: boolean; message?: string }) => {
      this.emit('maximize', params.maximized, params.message);
    });

    this.exposeRPC('moveVideo', (options: IVideoPositionOptions) => {
      this.emit('moveVideo', options);
    });

    this.exposeRPC('unloading', () => {
      this.emit('unload');
    });

    this.exposeRPC('log', params => {
      this.emit('log', params);
    });

    this.exposeRPC('focusOut', () => {
      this.emit('focusOut');
    });

    this.exposeRPC('handleExit', () => {
      this.emit('handleExit');
    });

    this.exposeRPC('navigate', () => {
      this.emit('navigate');
    });

    this.rpc.call('resendReady', {}, false);
  }

  /**
   * Exposes an RPC event handler. If the RPC object is not yet created the
   * method will be queued and added later.
   * @param event The event to expose a handler for
   * @param handler The event handler
   */
  private exposeRPC<T>(event: string, handler: (arg: T) => void): void;
  private exposeRPC(event: string, handler: (...args: any[]) => void): void {
    const register = (rpc: RPC) => {
      if (this.rpcExposedMethods.indexOf(event) === -1) {
        rpc.expose(event, handler);
      }
    };

    if (this.rpc) {
      register(this.rpc);
    } else {
      this.runOnRpc(register);
    }
  }

  /**
   * handleWebsocketError is called when the websocket emits an `error`. This
   * is generally called when the connection is terminated before a socket
   * connection is established.
   */
  private handleWebsocketError(ev: Event) {
    this.emit('close', {
      code: -1,
      message: 'No websocket or websocket url',
      expected: this.state === State.Closing,
      ev,
    });
    this.state = State.Closed;
    this.destroy();
  }

  /**
   * onFrameLoad is called once the iframe loads.
   * @private
   */
  private onFrameLoad = () => {
    if (this.state === State.Loading) {
      this.attachListeners();
    }

    this.frame.removeEventListener('load', this.onFrameLoad);
  };
}
