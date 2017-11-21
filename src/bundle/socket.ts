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
 * Attaches a handler function that will be triggered when the call comes in.
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
   * Sets the handler to use when the editor requests a dump of the current
   * controls state.
   */
  public dumpHandler(fn: () => IStateDump) {
    this.rpc.expose('dumpState', fn);
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
