import { LitElement, html } from 'lit';
import { customElement, property} from 'lit/decorators.js';
import { RS1 } from '$lib/RS';

@customElement('r-tile')
export class RTile extends LitElement {
  @property() TList: RS1.TileList = new RS1.TileList('');

  
  static TTDE = new RS1.TDE('T\ta|name:T|inner:|\ts|display:block|flex-direction:column|align-items:center|justify-content:center|background:black|background-image:url("")|\t')
  static TDefArray: RS1.TDE[] = [RTile.TTDE];
  static TDef = RTile.TileMerge(RTile.TDefArray)

  static ButtonTDE = new RS1.TDE('Btn\ta|name:Button|\ts|cursor:pointer|\t');
  static ButtonDefArray: RS1.TDE[] = [RTile.TDef, RTile.ButtonTDE];
  static ButtonDef = RTile.TileMerge(RTile.ButtonDefArray);

  static RoundButtonTDE = new RS1.TDE('RndBtn\ta|name:RoundButton|\ts|border-radius:25px|\t');
  static RoundButtonDefArray: RS1.TDE[] = [RTile.ButtonDef, RTile.RoundButtonTDE];
  static RoundButtonDef = RTile.TileMerge(RTile.RoundButtonDefArray);

  static Merge(A: RS1.TDE, B: RS1.TDE): RS1.TDE {
    const style = A.sList?.copy;
    const attr = A.aList?.copy;
    style?.merge(B.sList);
    attr?.merge(B.aList);
    B.sList = style;
    B.aList = attr;
    return B;
  }

  static TileMerge(TDEArray: RS1.TDE[]): RS1.TDE {
    
    if(TDEArray.length == 0) {
      throw new Error('TDEArray is empty');
    }

    if(TDEArray.length == 1) {
      return TDEArray[0];
    }

    for (let i = TDEArray.length - 2; i >= 0; --i) {
      RTile.Merge(TDEArray[i], TDEArray[i+1]);
    }
   
    return TDEArray[TDEArray.length - 1];
  }

  NewInstance = (TileList: RS1.TileList) => {
    
    TileList.tiles.forEach(tile => {
      
      switch(tile.TList?.listName.replace(/^\s+/, '')) {
        case 'T':
          RTile.Merge(RTile.TDef, tile);
          break;

        case 'Btn':
          RTile.Merge(RTile.ButtonDef, tile);
          break;

        case 'RndBtn':
          RTile.Merge(RTile.RoundButtonDef, tile);
          break;
      }
    })
  }


  renderDivs(tile: RS1.TDE): any {
    const innerContent = tile.aList?.descByName('inner') || '';
    const styleStr = tile.sList?.toVIDList(";");
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
    this.NewInstance(this.TList);

    const topLevelTiles = this.TList.tiles.filter(tile => !tile.parent);
    return html`${topLevelTiles.map(tile => this.renderDivs(tile))}`;
  }
}
