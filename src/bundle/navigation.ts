import { EventEmitter } from 'eventemitter3';
require('./directionalnavigation.min.js');

import { RPC } from '../internal';

export enum Keys {
  Enter = 13,
  Escape = 27,
  GamepadA = 195,
  GamepadB = 196,
}

/**
 * Receive navigational input.
 */
export class Navigation extends EventEmitter {
  constructor(private readonly rpc: RPC) {
    super();

    window.addEventListener(
      'keydown',
      ev => {
        this.handleKeydown(ev);
      },
      true,
    );

    rpc.expose('focusIn', () => {
      const firstFocus = document.querySelector('[tabindex="0"]') || document.body;
      (<HTMLElement>firstFocus).focus();
    });
  }

  /**
   * Handle exiting via escape and Game
   */
  public handleKeydown(ev: KeyboardEvent) {
    if (ev.keyCode === Keys.Escape || ev.keyCode === Keys.GamepadB) {
      ev.preventDefault();
      ev.stopPropagation();
      this.rpc.call('focusOut', {}, false);
      return;
    }

    if (ev.keyCode === Keys.Enter || ev.keyCode === Keys.GamepadA) {
      this.handleSubmit();
      return;
    }

    this.rpc.call('navigate', {}, false);
  }

  private handleSubmit() {
    const clickEvent = document.createEvent('MouseEvents');
    clickEvent.initEvent('mousedown', true, true);
    const currentEl = document.activeElement;

    if (currentEl) {
      currentEl.dispatchEvent(clickEvent);
    }
  }
}
