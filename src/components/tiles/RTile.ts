import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RS1 } from '$lib/RS';

@customElement('r-tile')
export class RTile extends LitElement {
  @property() tileString: string[] = [];
  @property() TList: RS1.TileList = new RS1.TileList('');

  assign(tileString: string[]) {
    this.TList = new RS1.TileList(tileString);
  }

  renderDivs(tile: RS1.TDE): any {
    const innerContent = tile.aList?.x.GetDesc('inner') || '';
    const styleStr = tile.sList?.x.toVIDList(";");
    let childrenHtml = html``;

    if (tile.first) {
      let child = this.TList.tiles[tile.first]
      while (child) {
        childrenHtml = html`${childrenHtml}${this.renderDivs(child)}`;
        child = this.TList.tiles[child.next];
      }
    }

    return html`<div id="tile${this.TList.tiles.indexOf(tile)}" style="${styleStr}">${innerContent}${childrenHtml}</div>`;
  }

  render() {
    this.assign(this.tileString);

    const topLevelTiles = this.TList.tiles.filter(tile => !tile.parent);
    return html`${topLevelTiles.map(tile => this.renderDivs(tile))}`;
  }
}


