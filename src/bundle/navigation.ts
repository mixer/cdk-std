import { EventEmitter } from 'eventemitter3';
// import * as winjs from 'winjs';
require('../directionalnavigation-1.0.0.0.js');

import { RPC } from '../internal';

interface IDirection {
  name: string,
  data?: any,
}

export const enum keys {
  Escape = 27,
  GamepadB = 196,
}

/**
 * Receive navigational input.
 */
export class Navigation extends EventEmitter {

  constructor(private readonly rpc: RPC) {
    super();

    window.addEventListener('keydown', (ev: KeyboardEvent) => { this.handleKeydown(ev) }, true);

    rpc.expose('navigate', (navigate: IDirection) => {
      if (navigate.name === 'move') {
        this.move(navigate.data);
      }

      if (navigate.name === 'submit') {
        const clickEvent = document.createEvent('MouseEvents');
        clickEvent.initEvent('mousedown', true, true);
        const currentEl = document.querySelector('.active');
        if (currentEl) {
          currentEl.dispatchEvent(clickEvent);
        }
      }
    });
  }

  /**
   * Handle exiting via escape and Game
   */
  public handleKeydown(ev: KeyboardEvent) {
    if (ev.keyCode === keys.Escape || ev.keyCode === keys.GamepadB) {
      this.rpc.call('focusOut', {}, false);
    }
  }

  private move(direction: any) {
    const currentEl = <HTMLElement>document.querySelector('.active') || <HTMLElement>document.body;
    const focusRoot = <HTMLElement>document.querySelector('.alchemy-grid-layout') || <HTMLElement>document.body;

    (<any>window).TVJS.DirectionalNavigation.focusRoot = focusRoot;

    const el = (<any>window).TVJS.DirectionalNavigation.findNextFocusElement(direction, {
      focusRoot: focusRoot,
    });

    // don't change focus if no next element in this direction
    if (typeof currentEl !== null && typeof el !== null) {
      currentEl.classList.remove('active');
      return;
    }

    if (typeof el !== null) {
        el.classList.add('active');
        el.focus();
    }
  }
}
