import { EventEmitter } from 'eventemitter3';
require('./directionalnavigation.min.js');

import { RPC } from '../internal';

export enum Keys {
  Enter = 13,
  Escape = 27,
  GamepadA = 195,
  GamepadB = 196,
  Menu = 207,
  View = 208,
}

/**
 * Receive navigational input.
 */
export class Navigation extends EventEmitter {
  private escapeKeys = {
    menu: false,
    view: false,
  };

  constructor(private readonly rpc: RPC) {
    super();

    window.addEventListener(
      'keydown',
      ev => {
        this.handleKeydown(ev);
      },
      true,
    );

    window.addEventListener(
      'keyup',
      ev => {
        this.handleKeyup(ev);
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
    if (ev.keyCode === Keys.Menu || ev.keyCode === Keys.View) {
      ev.keyCode === Keys.Menu ? this.escapeKeys.menu = true : this.escapeKeys.view = true;
    } else {
      this.escapeKeys.menu = false;
      this.escapeKeys.view = false;
    }

    if (
      ev.keyCode === Keys.Escape ||
      ev.keyCode === Keys.GamepadB ||
      (this.escapeKeys.menu && this.escapeKeys.view)
    ) {
      ev.preventDefault();
      ev.stopPropagation();
      this.escapeKeys.menu = false;
      this.escapeKeys.view = false;
      this.rpc.call('focusOut', {}, false);
      return;
    }

    if (ev.keyCode === Keys.Enter || ev.keyCode === Keys.GamepadA) {
      this.handleSubmit();
      return;
    }

    this.rpc.call('navigate', {}, false);
  }

  /**
   * Handle exiting via escape and Game
   */
  public handleKeyup(ev: KeyboardEvent) {
    if (ev.keyCode === Keys.Menu) {
      this.escapeKeys.menu = false;
    }

    if (ev.keyCode === Keys.View) {
      this.escapeKeys.view = false;
    }
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
