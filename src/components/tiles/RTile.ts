import { LitElement, html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { customElement, property } from 'lit/decorators.js';
import { RS1 } from '$lib/RS';

@customElement('r-tile')
export class RTile extends LitElement {
 color = 'cyan';
 @property() attrStr: string | undefined = '';
 @property() styleStr: string | undefined = '';
 @property() tileString: string[] = [];  
 @property() Tlist: RS1.TileList = new RS1.TileList('');
 
 assign(tileString: string[]) {
   this.Tlist = new RS1.TileList(tileString);
 }

render() {
  this.assign(this.tileString);

  let content = '';

  this.Tlist.tiles.forEach((tile: RS1.TDE) => {
    let attrStr = tile.aList?.x.toVIDList(" ","=");

    if (!tile.parent) {
       content += `<div ${attrStr} style="${tile.sList?.x.toVIDList(";")}">`;
    } else if (tile.parent) {
      content += `<slot ${attrStr} style="${tile.sList?.x.toVIDList(";")}"></slot>`;
    }
  });

  content += `</div>`
  
  return html`${unsafeHTML(content)}`;
}

}
