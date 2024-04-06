import {LitElement, html} from 'lit';
import {customElement,property} from 'lit/decorators.js';
import type {RS1} from '../../lib/RS';

@customElement('r-tile')
export class RTile extends LitElement {
  color = 'cyan';
  Lists : Array<RS1.vList> = [];

  List (Name : string) {
    


  }

  setColor (clr = 'pink') {
    this.color = clr;
  }

  render(){
    return html`<div><h2 style='color:${this.color}' >Hello from RTile!</h2></div>`;
  }
}

