import { expect } from 'chai';

import { RPC, RPCMessage } from './rpc';

describe('RPC', () => {
  let rpc: RPC;
  let messages: RPCMessage<any>[];
  beforeEach(() => {
    messages = [];
    rpc = new RPC({ postMessage: (data: any) => messages.push(data) }, '1.0');
  });

  afterEach(() => {
    rpc.destroy();
  });

  const readyUp = async () => {
    const promise = new Promise(resolve => {
      rpc.expose('ready', (params: { protocolVersion: string }) => {
        expect(params.protocolVersion).to.equal('1.1');
        resolve();
      });
    });

    window.postMessage(
      {
        type: 'method',
        method: 'ready',
        serviceID: RPC.serviceID,
        counter: 0,
        params: {
          protocolVersion: '1.1',
        },
      },
      '*',
    );

    await promise;

    expect(rpc.remoteVersion()).to.equal('1.1');
  };

  it('should announce itself to the remote when created', () => {
    expect(messages).to.deep.equal([
      {
        type: 'method',
        serviceID: RPC.serviceID,
        id: 0,
        method: 'ready',
        discard: true,
        counter: 0,
        params: { protocolVersion: '1.0' },
      },
    ]);
  });

  it('should receive ready messages', async () => readyUp());

  it('should reject messages recieved from other services', async () => {
    await readyUp();

    const promise = new Promise(resolve => {
      rpc.expose('foo', (params: { isInvalid: boolean }) => {
        expect(params.isInvalid).to.equal(false, 'expected to have rejected wrong service ID');
        resolve();
      });
    });

    window.postMessage(
      {
        type: 'method',
        method: 'foo',
        serviceID: 'invalid service ID',
        counter: 1,
        params: { isInvalid: true },
      },
      '*',
    );

    window.postMessage(
      {
        type: 'method',
        method: 'foo',
        serviceID: RPC.serviceID,
        counter: 1,
        params: { isInvalid: false },
      },
      '*',
    );

    await promise;
  });

  it('should reorder messages', async () => {
    await readyUp();

    const sequence = [4, 2, 1, 3];
    const promise = new Promise(resolve => {
      let seen = 0;
      rpc.expose('foo', (params: { counter: number }) => {
        seen++;
        expect(params.counter).to.equal(seen);
        if (seen === sequence.length) {
          resolve();
        }
      });
    });

    sequence.forEach(counter => {
      window.postMessage(
        {
          type: 'method',
          method: 'foo',
          serviceID: RPC.serviceID,
          counter,
          params: { counter },
        },
        '*',
      );
    });

    await promise;
  });
});
