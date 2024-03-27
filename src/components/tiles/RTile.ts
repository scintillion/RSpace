import {LitElement, html} from 'lit';
import {customElement} from 'lit/decorators.js';

@customElement('r-tile')
export class RTile extends LitElement {
  color = "cyan";

  render(){
    return html`<h2 style=color:green >Hello from RTile!</h2>`;
  }
}