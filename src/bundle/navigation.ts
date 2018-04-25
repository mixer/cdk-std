require('./directionalnavigation.min.js');

import { RPC } from '../internal';

declare const window: any;

const enum Keys {
  Enter = 13,
  Escape = 27,
  GamepadA = 195,
  GamepadB = 196,
  Menu = 207,
  View = 208,
}

/**
 * The Navigation class provides utilities for dealing with user requests
 * to nevigate around or away from the interactive controls.
 */
export class Navigation {
  private escapeKeys = {
    menu: false,
    view: false,
  };

  private handlingExit = false;

  constructor(private readonly rpc: RPC) {
    window.addEventListener(
      'keydown',
      (ev: KeyboardEvent) => {
        this.handleKeydown(ev);
      },
      true,
    );

    window.addEventListener(
      'keyup',
      (ev: KeyboardEvent) => {
        this.handleKeyup(ev);
      },
      true,
    );

    rpc.expose('keyboardShowing', () => {
      window.TVJS.DirectionalNavigation.enabled = false;
    });

    rpc.expose('keyboardHiding', () => {
      window.TVJS.DirectionalNavigation.enabled = true;
    });

    rpc.expose('focusIn', () => {
      const firstFocus = document.querySelector('[tabindex="0"]') || document.body;
      (<HTMLElement>firstFocus).focus();
    });
  }

  /**
   * Should be called when the integration wants to intercept an event which
   * would otherwise cause the Interactive integration to close, such as
   * the "X" button on the user's controller when watching on their Xbox.
   * Calling this will cause the next press of "X" to have no effect.
   */
  public handleExit(): void {
    this.handlingExit = true;
  }

  /**
   * Handle exiting via escape and Game.
   * @private
   * @param {KeyboardEvent} ev
   */
  private handleKeydown(ev: KeyboardEvent) {
    if (this.handlingExit && ev.keyCode === Keys.GamepadB) {
      ev.preventDefault();
      ev.stopPropagation();
      setTimeout(() => {
        this.handlingExit = false;
      });
      return;
    }

    if (ev.keyCode === Keys.Menu || ev.keyCode === Keys.View) {
      ev.keyCode === Keys.Menu ? (this.escapeKeys.menu = true) : (this.escapeKeys.view = true);
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
   * Handle exiting via escape and Game.
   * @private
   * @param {KeyboardEvent} ev
   */
  private handleKeyup(ev: KeyboardEvent) {
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
