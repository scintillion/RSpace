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

  renderDivs(tilelist: RS1.TileList, level: number): any {
    this.TList = new RS1.TileList(this.tileString);
    return tilelist.tiles.map((tile: RS1.TDE) => {
      const innerContent = tile.aList?.x.GetDesc('inner') || '';
      const styleStr = tile.sList?.x.toVIDList(";");

      // if (tile.level === level) {
      //   const childTiles = this.renderDivs(tilelist, level + 1);
      //   return html`<div id="tile${this.TList.tiles.indexOf(tile)}" style="${styleStr}">${innerContent}${childTiles}</div>`;
      // }
      // return ''; 

      if (!tile.parent && tile.level === level) {
        return html`<div id="tile${this.TList.tiles.indexOf(tile)}" style="${styleStr}">${innerContent}${this.renderDivs(tilelist, level + 1)}</div>`;
      } 
      else if (tile.parent && tile.first != 0 && tile.level === level) {
        return html`<div id="tile${this.TList.tiles.indexOf(tile)}" style="${styleStr}">${innerContent}${this.renderDivs(tilelist, level + 1)}</div>`;
      }
      else if (tile.level === level) {
        return html`<div id="tile${this.TList.tiles.indexOf(tile)}" style="${styleStr}">${innerContent}</div>`;
      }
      return '';
    });
  }

  render() {
    this.assign(this.tileString);
    return html`${this.renderDivs(this.TList, 1)}`;
  }
}


