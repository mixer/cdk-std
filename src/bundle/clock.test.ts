import { expect } from 'chai';
import * as sinon from 'sinon';

import { Clock } from './clock';

describe('Clock', () => {
  let clock: Clock;
  let timer: sinon.SinonFakeTimers;

  beforeEach(() => {
    const socket: any = {
      once(ev: string, fn: () => void) {
        expect(ev).to.equal('interactivePacket');
        fn();
      },
      call(method: string) {
        expect(method).to.equal('getTime');
        // Simulate 20ms RTT with a clock 100ms ahead of the local.
        timer.tick(10);
        const result = Promise.resolve({ time: Date.now() + 100 });
        timer.tick(10);
        return result;
      },
    };

    timer = sinon.useFakeTimers();
    clock = new Clock(socket);
  });

  afterEach(() => {
    timer.restore();
  });

  it('syncs time forwards', async () => {
    expect(await clock.localToRemote(0)).to.equal(100);
  });

  it('syncs time backwards', async () => {
    expect(await clock.remoteToLocal(0)).to.equal(-100);
  });
});
