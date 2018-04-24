import { EventEmitter } from 'eventemitter3';
import { Observable } from 'rxjs/Observable';

import { RPC } from '../rpc';
import { IVideoPositionList } from '../typings';
import { MemorizingSubject } from '../reactive';
import { ISettings, IVideoPositionOptions } from '../typings';
/**
 * Display modified the display of interactive controls.
 */
export class Display extends EventEmitter {
  private settingsSubj = new MemorizingSubject<ISettings>();
  private videoPositionSubj = new MemorizingSubject<IVideoPositionList>();

  constructor(private readonly rpc: RPC) {
    super();

    rpc.expose('updateVideoPosition', (pos: IVideoPositionList) => {
      this.videoPositionSubj.next(pos);
    });

    rpc.expose('updateSettings', (settings: ISettings) => {
      this.settingsSubj.next(settings);
      this.emit('settings', settings);
    });
  }
  /**
   * Hides the controls and displays a loading spinner, optionally
   * with a custom message. This is useful for transitioning. If called
   * while the controls are already minimized, it will update the message.
   * @param {string} [message]
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
   * @param {IVideoPositionOptions} options
   */
  public moveVideo(options: IVideoPositionOptions): void {
    this.rpc.call('moveVideo', options, false);
  }

  /**
   * Returns an observable of the video's current position, relative to
   * the frame's screen. For example, you can use it to set the position
   * of an overlaid div:
   *
   * ```
   * mixer.display.position().subscribe(position => {
   *   videoOverlay.style.top = `${position.top}px`;
   *   videoOverlay.style.left = `${position.left}px`;
   *   videoOverlay.style.height = `${position.height}px`;
   *   videoOverlay.style.width = `${position.width}px`;
   * });
   * ```
   * @return {Observable.<IVideoPositionList>}
   */
  public position(): Observable<IVideoPositionList> {
    return this.videoPositionSubj;
  }

  /**
   * Returns an observable of the current project settings.
   * @return {Observable.<ISettings>}
   */
  public settings(): Observable<ISettings> {
    return this.settingsSubj;
  }

  /**
   * Returns the video position at this moment in time. Returns undefined if
   * the video position hasn't been sent yet. If undefined, you should retry,
   * or listen to the `display.position()` observable to be notified when
   * it comes in.
   * @return {IVideoPositionList | undefined}
   */
  public getPosition(): IVideoPositionList | undefined {
    return this.videoPositionSubj.hasValue() ? this.videoPositionSubj.getValue() : undefined;
  }

  /**
   * Returns the current display settings at this instant in time. It will
   * be `undefined` if the settings have not been sent yet. If undefined,
   * you should retry, or listen to the `display.settings()` observable to
   * be notified when it comes in.
   * @return {ISettings | undefined}
   */
  public getSettings(): ISettings | undefined {
    return this.settingsSubj.hasValue() ? this.settingsSubj.getValue() : undefined;
  }

  /**
   * @deprecated use `settings` instead.
   */
  public on(event: 'settings', handler: (ev: ISettings) => void): this;
  public on(event: string, handler: (...args: any[]) => void): this {
    super.on(event, handler);
    return this;
  }
}
