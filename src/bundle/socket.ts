import { EventEmitter } from 'eventemitter3';

import { IRPCMethod, RPC } from '../internal';
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
} from '../typings';

// these are the same right now, but may diverge:
interface IInteractiveRPCMethod<T> extends IRPCMethod<T> {} // tslint:disable-line
// interface IInteractiveRPCReply<T> extends IRPCReply<T> {} // tslint:disable-line

/**
 * The socket wraps the RPC instance and provides an event emitter than
 * fires when various Interactive events come in. These events correspond
 * with the `onSomething...` methods as documented in the [protocol
 * specification](https://dev.mixer.com/reference/interactive/protocol/protocol.pdf).
 * The payload of the event corresponds with the `params` from the events
 * that the Interactive service sends. For example:
 *
 * ```js
 * mixer.socket.on('onReady', data => {
 *  console.log('Are the controls ready?', data.isReady);
 * });
 * mixer.socket.on('onSceneCreate', scene => {
 *   // do something with the newly created scene...
 * });
 * ```
 */
export class Socket extends EventEmitter {
  constructor(private readonly rpc: RPC) {
    super();
    rpc.expose('recieveInteractivePacket', (data: IInteractiveRPCMethod<any>) => {
      this.emit('interactivePacket', data);
      this.emit(data.method, data.params);
    });
  }

  /**
   * Sets the handler to use when the CDK requests a dump of the current
   * controls state. It should return metadata about the scenes. This will
   * help in your debugging, but you do not have to implement it.
   * @param {function(): IStateDump} fn
   */
  public dumpHandler(fn: () => IStateDump) {
    this.rpc.expose('dumpState', fn);
  }

  public on(event: 'onWorldCreate', handler: (ev: any) => void): this;
  public on(event: 'onWorldUpdate', handler: (ev: any) => void): this;
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
  public on(event: string, handler: (ev: any) => void): this;
  public on(event: string, handler: (...args: any[]) => void): this {
    super.on(event, handler);
    return this;
  }

  public call(method: 'giveInput', params: IInput): Promise<object>;
  public call(method: 'getTime', params: {}): Promise<{ time: number }>;
  public call(method: string, params: object): Promise<object>;
  public call(method: string, params: object, waitForReply: true): Promise<object>;
  public call(method: string, params: object, waitForReply: false): void;

  /**
   * Makes a call to the Interactive service. This is just like sending a call
   * over the [Interactive protocol](https://dev.mixer.com/reference/interactive/protocol/protocol.pdf),
   * however the only available methods are `giveInput` and `getTime`.
   *
   * For example:
   *
   * ```js
   * // All giveInput calls must contain at minimum the event and control ID.
   * // Everything else is passed through to the game client verbatim.
   * mixer.socket.call('giveInput', {
   *   event: 'click',
   *   controlID: 'my_button',
   *   moreCustomData: true,
   * });
   * ```
   *
   * @param {string} method
   * @param {*} params
   * @param {boolean} [waitForReply=true]
   * @return {Promise.<object> | undefined} If waitForReply is true, a
   * promise is returned that resolves once the server responds.
   */
  public call(
    method: string,
    params: object,
    waitForReply: boolean = true,
  ): Promise<object> | void {
    const reply = this.rpc.call(
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
