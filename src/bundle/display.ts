import { EventEmitter } from 'eventemitter3';

import { RPC } from '../internal';
import { ISettings, IVideoPositionOptions } from '../typings';

/**
 * Display modified the display of interactive controls.
 */
export class Display extends EventEmitter {
  private lastSettings: ISettings;

  constructor(private readonly rpc: RPC) {
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
    this.rpc.call('maximize', { maximized: false, message }, false);
  }

  /**
   * Restores previously minimize()'d controls.
   */
  public maximize(): void {
    this.rpc.call('maximize', { maximized: true }, false);
  }

  /**
   * Moves the position of the video on the screen.
   */
  public moveVideo(options: IVideoPositionOptions): void {
    this.rpc.call('moveVideo', options, false);
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
