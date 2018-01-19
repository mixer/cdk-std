import { EventEmitter } from 'eventemitter3';
require('./directionalnavigation.min.js');

import { RPC } from '../internal';

interface IDirection {
  name: string;
  data?: any;
}

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

    rpc.expose('navigate', (navigate: IDirection) => {
      if (navigate.name === 'move') {
        this.move(navigate.data);
      }

      if (navigate.name === 'submit') {
        this.handleSubmit();
      }
    });

    rpc.expose('focusIn', () => {
      const firstFocus = document.querySelector('[tabindex="0"]') || document.body;
      (<HTMLElement>firstFocus).focus();
    })
  }

  /**
   * Handle exiting via escape and Game
   */
  public handleKeydown(ev: KeyboardEvent) {
    if (ev.keyCode === Keys.Escape || ev.keyCode === Keys.GamepadB) {
      this.rpc.call('focusOut', {}, false);
    }

    if (ev.keyCode === Keys.Enter || ev.keyCode === Keys.GamepadA) {
      this.handleSubmit();
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

  private move(direction: any) {
    const focusRoot = <HTMLElement>document.querySelector('#app') || <HTMLElement>document.body;

    (<any>window).TVJS.DirectionalNavigation.focusRoot = focusRoot;

    const el = (<any>window).TVJS.DirectionalNavigation.findNextFocusElement(direction, {
      focusRoot: focusRoot,
    });

    if (el !== null) {
      el.focus();
    }
  }
}
