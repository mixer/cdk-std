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

const enum ExitHandler {
  Disabled,
  Enabled,
  EnableOnce,
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

  private handlingExit = ExitHandler.Disabled;

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
   * Should be called when the integration wants to intercept a single event
   * which would otherwise cause the Interactive integration to close, such as
   * the "B" button on the user's controller when watching on their Xbox.
   * Calling this will cause the next press of "B" to have no effect.
   */
  public handleExit(): void {
    this.handlingExit = ExitHandler.EnableOnce;
  }

  /**
   * Should be called when the integration wants to intercept all events which
   * would otherwise cause the Interactive integration to close, such as
   * the "B" button on the user's controller when watching on their Xbox.
   * Calling this will prevent every press of "B" from closing the integration.
   */
  public preventExit(): void {
    this.handlingExit = ExitHandler.Enabled;
  }

  /**
   * Should be called when the integration wants to re-enable event which
   * would cause the Interactive integration to close, such as
   * the "B" button on the user's controller when watching on their Xbox.
   * Calling this will allow subsequent presses of "B" to close the integration.
   */
  public allowExit(): void {
    this.handlingExit = ExitHandler.Disabled;
  }

  /**
   * Handle exiting via escape and Game.
   * @private
   * @param {KeyboardEvent} ev
   */
  private handleKeydown(ev: KeyboardEvent) {
    if (this.handlingExit !== ExitHandler.Disabled && ev.keyCode === Keys.GamepadB) {
      ev.preventDefault();
      ev.stopPropagation();

      if (this.handlingExit === ExitHandler.EnableOnce) {
        setTimeout(() => {
          this.handlingExit = ExitHandler.Disabled;
        });
      }
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

    if (this.handlingExit === ExitHandler.Disabled) {
      this.rpc.call('navigate', {}, false);
    }
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
