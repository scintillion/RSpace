import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RS1 } from '$lib/RS';

@customElement('r-tile')
export class RTile extends LitElement {
  @property() tileString: string[] = [];
  @property() TList: RS1.TileList = new RS1.TileList('');
  
  static TileDef = new RS1.TDE('T\ta|name:TileDef|inner:|\ts|background:black|width:100vw|height:100vh|\t');

  assign(tileString: string[]) {
    this.TList = new RS1.TileList(tileString);
  }

  NewInstance = (TileList: RS1.TileList) => {

    TileList.tiles.forEach(tile => {
      const TDStyle = RTile.TileDef.sList?.x.copy;
      const TDAttr = RTile.TileDef.aList?.x.copy;

      TDStyle?.x.Merge(tile.sList);
      TDAttr?.x.Merge(tile.aList);

      tile.sList = TDStyle;
      tile.aList = TDAttr;
    })
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
    this.NewInstance(this.TList);
   
    const topLevelTiles = this.TList.tiles.filter(tile => !tile.parent);
    return html`${topLevelTiles.map(tile => this.renderDivs(tile))}`;
  }
}
