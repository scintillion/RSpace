import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RS1 } from '$lib/RS';

// @customElement('r-tile')
// export class RTile extends LitElement {
//   color = 'cyan';
//   @property() attrStr: string = '';
//   @property() styleStr: string = '';

//   render() {
//     const div = document.createElement('div');
//     console.log ('attrStr=' + this.attrStr);
//     console.log ('styleStr=' + this.styleStr);

//     parseAttrString(this.attrStr).forEach(([key, value]) => {
//       div.setAttribute(key, value);
//     });
//     div.setAttribute('style', this.styleStr);
//     const content = document.createElement('h2');
//     content.setAttribute('style', 'color: ' + this.color);
//     content.textContent = 'QQQ Hello from RTile!';
//     div.appendChild(content);

//     return html`${div}`;
//   }
// }

// function parseAttrString(attrStr: string) {
//   console.log ('Parse=' + attrStr);

//   if (!attrStr) {
//     return [];
//   }

//   return attrStr.split(' ').map(pair => {
//     const parts = pair.split('=');
//     if (parts.length === 2) {
//       const [key, value] = parts;
//       if (key) {
//         return [key, value.replace(/"/g, '')]; // Remove quotes from the value
//       } else {
//         console.warn(`Invalid attribute key found: ${pair}`);
//         return ['', ''];
//       }
//     } else {
//       console.warn(`Attribute string not formatted correctly: ${pair}`);
//       return ['', ''];
//     }
//   }).filter(([key, value]) => key);
// }


/*
import {LitElement, html} from 'lit';
import {customElement,property} from 'lit/decorators.js';

@customElement('QQQ-tile')
export class RTile extends LitElement {
  color = 'pink';

  render(){
    console.log ('Rendering color ' + this.color);
    return html`<div><h2 style='color:${this.color}' >Hello from RTile!</h2></div>`;
  }
}
*/

@customElement('r-tile')
export class RTile extends LitElement {
 color = 'cyan';
 @property() attrStr: string = '';
 @property() styleStr: string = '';
 @property() tileString: string[] = [];  
 @property() Tlist: RS1.TileList = new RS1.TileList('');
 
 assign(tileString: string[]) {
   this.Tlist = new RS1.TileList(tileString);
   console.log('TileString = ' + tileString);
   this.Tlist.tiles.forEach((tile: RS1.TDE) => {
    console.log('attr stringx' + tile.aList?.x.Desc);
     this.styleStr = this.replacestyledelim(tile.sList?.x.Desc);
     this.attrStr = this.replaceattrdelim(tile.aList?.x.Desc);
     const attrs = this.parseAttrString(this.attrStr);
      for (const [key, value] of Object.entries(attrs)) {
        this.setAttribute(key, value);
      }
     
   })
   console.log('styleStr = ' + this.styleStr);
   console.log('attrStr = ' + this.attrStr);

 }
 
 
 
 parseAttrString(attrStr: string) {
    const attrs = {};
    if (!attrStr) {
      return attrs;
    }

    attrStr.split(' ').forEach(pair => {
      const parts = pair.split('=');
      if (parts.length === 2) {
        const [key, value] = parts;
        if (key) {
          attrs[key] = value.replace(/"/g, ''); 
        }
      }
    });

    return attrs;
 }

//  updated(changedProperties: Map<string, any>) {
//     if (changedProperties.has('attrStr')) {
//       const attrs = this.parseAttrString(this.attrStr);
//       for (const [key, value] of Object.entries(attrs)) {
//         this.setAttribute(key, value);
//       }
//     }
//  }

replacestyledelim(inputString: string | undefined): string {
  if (inputString === undefined) {
    console.log('No string');
    return '';
  }
  else {
  return inputString?.replace(/\|/g, ';');
  }
}

replaceattrdelim(inputString: string | undefined): string {
  if (inputString === undefined) {
    console.log('No attr string');
    return '';
  }
  else {
    let modifiedString = inputString.replace(/:/g, '=');
    // Replace '|' with ' ' (space)
    modifiedString = modifiedString.replace(/\|/g, ' ');
    return modifiedString;
  }
}





 render() {
  this.assign(this.tileString);
    return html`
      <div style="${this.styleStr}">
        <slot></slot>
      </div>
    `;
 }
}





  