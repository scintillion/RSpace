import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('r-tile')
export class RTile extends LitElement {
  color = 'cyan';
  @property() attrStr: string = '';
  @property() styleStr: string = '';

  render() {
    const div = document.createElement('div');

    console.log ('attrStr=' + this.attrStr);
    console.log ('styleStr=' + this.styleStr);

    parseAttrString(this.attrStr).forEach(([key, value]) => {
      div.setAttribute(key, value);
    });
    div.setAttribute('style', this.styleStr);
    const content = document.createElement('h2');
    content.setAttribute('style', 'color: ' + this.color);
    content.textContent = 'QQQ Hello from RTile!';
    div.appendChild(content);

    return html`${div}`;
  }
}

function parseAttrString(attrStr: string) {
  console.log ('Parse=' + attrStr);

  if (!attrStr) {
    return [];
  }

  return attrStr.split(' ').map(pair => {
    const parts = pair.split('=');
    if (parts.length === 2) {
      const [key, value] = parts;
      if (key) {
        return [key, value.replace(/"/g, '')]; // Remove quotes from the value
      } else {
        console.warn(`Invalid attribute key found: ${pair}`);
        return ['', ''];
      }
    } else {
      console.warn(`Attribute string not formatted correctly: ${pair}`);
      return ['', ''];
    }
  }).filter(([key, value]) => key);
}


/*
import {LitElement, html} from 'lit';
import {customElement,property} from 'lit/decorators.js';

@customElement('r-tile')
export class RTile extends LitElement {
  color = 'pink';

  render(){
    console.log ('Rendering color ' + this.color);
    return html`<div><h2 style='color:${this.color}' >Hello from RTile!</h2></div>`;
  }
}
*/