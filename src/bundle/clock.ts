import { Socket } from './socket';

/**
 * Clock handles synchronizing the local time against the server, adjusting
 * for any client-size clock skew.
 */
export class Clock {
  private delta: number = 0;
  private awaiting: Promise<void>;

  constructor(private readonly socket: Socket) {
    this.awaiting = new Promise<void>(resolve => {
      socket.once('interactivePacket', () => {
        resolve(this.sync());
      });
    });
  }

  /**
   * Adjusts a timestamp given by the remote server to the local timestamp.
   */
  public remoteToLocal(timestamp: number): Promise<number> {
    return this.awaiting.then(() => timestamp - this.delta);
  }

  /**
   * Adjusts a timestamp created locally to the one on the remote server.
   */
  public localToRemote(timestamp: number): Promise<number> {
    return this.awaiting.then(() => timestamp + this.delta);
  }

  /**
   * sync runs a quick clock synchronization against the server. Recursive
   * calls itself, with the remaining samples to take as well as samples
   * of the drift between the local and server clock.
   */
  private sync(remaining: number = 3, deltaSamples: number[] = []): Promise<void> {
    const start = Date.now();

    return (
      this.socket
        .call('getTime', {})
        .then(({ time }) => {
          const now = Date.now();

          // To get the clock delta, add the latency to the time the server
          // said it had back then, and compare it with the current time.
          deltaSamples.push(time + (now - start) / 2 - now);

          if (remaining > 0) {
            return this.sync(remaining - 1, deltaSamples);
          }

          this.delta = deltaSamples.sort()[Math.floor(deltaSamples.length / 2)];
          return undefined;
        })
        // ignore any errors, will only happen when Interactive is closed,
        // which we don't care about.
        .catch(() => undefined)
    );
  }
}
