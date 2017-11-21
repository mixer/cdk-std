import { EventEmitter } from 'eventemitter3';

export type RPCMessage<T> = IRPCMethod<T> | IRPCReply<T>;

export type RPCMessageWithCounter<T> = RPCMessage<T> & { counter: number };

export interface IRPCMethod<T> {
  type: 'method';
  serviceID: string;
  id: number;
  method: string;
  discard?: boolean;
  params: T;
}

export interface IRPCReply<T> {
  type: 'reply';
  serviceID: string;
  id: number;
  result: T;
  error?: {
    code: number;
    message: string;
    path?: string[];
  };
}

/**
 * Checks whether the message duck-types into an Interactive message.
 * This is needed to distinguish between postmessages that we get,
 * and postmessages from other sources.
 */
function isRPCMessage(data: any): data is RPCMessageWithCounter<any> {
  return (data.type === 'method' || data.type === 'reply') && typeof data.counter === 'number';
}

/**
 * An RPCError can be thrown in socket.call() if bad input is
 * passed to the service. See the Interactive protocol doc for an enumaration
 * of codes and messages: https://dev.mixer.com/reference/interactive/protocol/protocol.pdf
 */
export class RPCError extends Error {
  constructor(
    public readonly code: number,
    public readonly message: string,
    public readonly path?: string[],
  ) {
    super(`Error #${code}: ${message}`);
  }
}

export function objToError(obj: { code: number; message: string; path?: string[] }) {
  return new RPCError(obj.code, obj.message, obj.path);
}

/**
 * IPostable is an interface that describes something that can receive a
 * browser postMessage. It's implemented by the `window`, and is mocked
 * in tests.
 */
export interface IPostable {
  postMessage(data: any, targetOrigin: string): void;
}

/**
 * Primitive postMessage based RPC for the controls to interact with the
 * parent frame.
 */
export class RPC extends EventEmitter {
  /**
   * Service ID for this module. This is used to prevent
   * multiple postMessage-based APIs for clobbering each other.
   */
  public static serviceID = '8f5b3a83-dd7b-4b8a-84ad-146948bc8d27';

  private idCounter = 0;
  private calls: {
    [id: number]: (err: null | RPCError, result: any) => void;
  } = Object.create(null);

  private callCounter = 0;
  private remoteCallQueue: RPCMessageWithCounter<any>[] = [];
  private lastSequentialCall = -1;
  private remoteProtocolVersion: string | undefined;

  constructor(
    private readonly target: IPostable,
    protocolVersion: string,
    private readonly origin: string = '*',
  ) {
    super();
    window.addEventListener('message', this.listener);
    this.call('ready', { protocolVersion }, false);
  }

  /**
   * Attaches a method callable by the other window, to this one.
   */
  public expose<T>(method: string, handler: (params: T) => Promise<any> | any) {
    this.on(method, (data: IRPCMethod<T>) => {
      if (data.discard) {
        handler(data.params);
        return;
      }

      // tslint:disable-next-line
      Promise.resolve(handler(data.params)).then(result => {
        this.post({
          type: 'reply',
          serviceID: RPC.serviceID,
          id: data.id,
          result,
        });
      });
    });
  }

  /**
   * Makes an RPC call out to the target window.
   */
  public call<T>(method: string, params: object, waitForReply?: true): Promise<T>;
  public call(method: string, params: object, waitForReply: false): void;
  public call<T>(method: string, params: object, waitForReply: boolean = true): Promise<T> | void {
    const id = this.idCounter++;
    this.post({
      type: 'method',
      serviceID: RPC.serviceID,
      id,
      params,
      method,
      discard: !waitForReply,
    });

    if (!waitForReply) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.calls[id] = (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      };
    });
  }

  /**
   * Tears down resources associated with the RPC client.
   */
  public destroy() {
    window.removeEventListener('message', this.listener);
  }

  /**
   * Returns the protocol version that the remote client implements. This
   * will return `undefined` until we get a `ready` event.
   */
  public remoteVersion(): string | undefined {
    return this.remoteProtocolVersion;
  }

  private handleReply(packet: IRPCReply<any>) {
    const handler = this.calls[packet.id];
    if (!handler) {
      return;
    }

    if (packet.error) {
      handler(objToError(packet.error), null);
    } else {
      handler(null, packet.result);
    }

    delete this.calls[packet.id];
  }

  private post<T>(message: RPCMessage<T>) {
    (<RPCMessageWithCounter<T>>message).counter = this.callCounter++;
    this.target.postMessage(message, this.origin);
  }

  private replayQueue() {
    while (this.remoteCallQueue.length) {
      const next = this.remoteCallQueue[0];
      if (next.counter > this.lastSequentialCall + 1) {
        return;
      }

      this.dispatchIncoming(this.remoteCallQueue.shift()!);
    }
  }

  private listener = (ev: MessageEvent) => {
    const packet: RPCMessageWithCounter<any> = ev.data;
    if (!isRPCMessage(packet) || packet.serviceID !== RPC.serviceID) {
      return;
    }

    // postMessage does not guarantee message order, reorder messages as needed.
    // Reset the call counter when we get a "ready" so that the other end sees
    // calls starting from 0.

    if (packet.type === 'method' && packet.method === 'ready') {
      this.lastSequentialCall = packet.counter - 1;
      this.remoteProtocolVersion = packet.params.protocolVersion;
      this.callCounter = 0;
    }

    if (packet.counter <= this.lastSequentialCall + 1) {
      this.dispatchIncoming(packet);
      this.replayQueue();
      return;
    }

    for (let i = 0; i < this.remoteCallQueue.length; i++) {
      if (this.remoteCallQueue[i].counter > packet.counter) {
        this.remoteCallQueue.splice(i, 0, packet);
        return;
      }
    }

    this.remoteCallQueue.push(packet);
  };

  private dispatchIncoming(packet: RPCMessageWithCounter<any>) {
    this.lastSequentialCall = packet.counter;

    switch (packet.type) {
      case 'method':
        if (this.listeners(packet.method).length > 0) {
          this.emit(packet.method, packet);
          return;
        }

        this.post({
          type: 'reply',
          serviceID: RPC.serviceID,
          id: packet.id,
          error: { code: 4003, message: 'Unknown method name' },
          result: null,
        });
        break;
      case 'reply':
        this.handleReply(packet);
        break;
      default:
      // Ignore
    }
  }
}
