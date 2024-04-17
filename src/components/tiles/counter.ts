/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {LitElement, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('count-element')
export class CounterElement extends LitElement {
  static properties = {
    mode : { type:String},
    data: {attribute: false}
  }
  
  count = 0;
  render() {
    return html`<p>Count: ${this.count} Mode:${this.data}</p>`;
  }
}