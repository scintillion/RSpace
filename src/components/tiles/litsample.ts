import {LitElement, css, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators';

@customElement('aw-article')
export class Artcicle extends LitElement {
    static styles = css `{...}`;

    @property() title:string ='';
    
    
    @property()  aNumber: number = 5;
  /* ... */
}

declare global {
  interface HTMLElementTagNameMap {
    "my-element": MyElement;
  }
}