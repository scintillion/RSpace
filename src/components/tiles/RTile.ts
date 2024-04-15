import {LitElement, html} from 'lit';
import {customElement,property} from 'lit/decorators.js';

@customElement('r-tile')
export class RTile extends LitElement {
  color = 'cyan';

  render(){
    return html`<div><h2 style='color:${this.color}' >Hello from RTile!</h2></div>`;
  }
}

