import { EventEmitter } from 'eventemitter3';
import * as winjs from 'winjs';

import { RPC } from '../internal';

interface IDirection {
  name: string,
  data?: any,
}

/**
 * Receive navigational input.
 */
export class Navigation extends EventEmitter {

  constructor(public readonly rpc: RPC) {
    super();

    rpc.expose('navigate', (navigate: IDirection) => {
      console.log('navigating', navigate);

      if (navigate.name === 'move') {
        this.move(navigate.data);
      }

      if (navigate.name === 'submit') {
        const clickEvent = document.createEvent('MouseEvents');
        clickEvent.initEvent('mousedown', true, true);
        const currentEl = document.querySelector('.arc--selected');
        if (currentEl) {
          currentEl.dispatchEvent(clickEvent);
        }
      }
    });
  }

  private move(direction: any) {
    console.log('moving', direction);
    const currentEl = document.querySelector('.arc--selected');
    const el = winjs.UI.XYFocus.findNextFocusElement(direction);

    if (currentEl) {
      currentEl.classList.remove('arc--selected');
    }

    if (el) {
        el.classList.add('arc--selected');
    }
  }
}
