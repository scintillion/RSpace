import { LitElement, html, type PropertyValueMap } from 'lit';
import { customElement, property} from 'lit/decorators.js';
import { RS1 } from '$lib/RSsvelte.svelte';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import interact from 'interactjs';
import panzoom from 'panzoom';

@customElement('r-tile')
export class RTile extends LitElement {
  declare TList: RS1.TileList;
  declare _textEditContent: string;
  declare _fileUploaded: boolean;
  declare _editMode: boolean;
  declare _currentTile?: RS1.TDE | undefined;
  declare _currentZoom: number | undefined;
  declare _panToggle: boolean;

  static properties = {
    _fileUploaded: { type: Boolean },
    _editMode: { type: Boolean },
    _textEditContent: { type: String },
    // _currentTile: { type: Object },
    _currentZoom: { type: Number },
    _panToggle: { type: Boolean },
    TList: { type: Object }
  };

  static TTDE = new RS1.TDE('T\ta|name:T|inner:|alert:|image:|pan:|\ts|scale:|position:|top:|left:|width:|height:|display:block|flex-direction:column|align-items:center|justify-content:center|background:black|background-image:url("")|\t');
  static TDefArray: RS1.TDE[] = [RTile.TTDE];
  static TDef = RTile.TileMerge(RTile.TDefArray)

  static ButtonTDE = new RS1.TDE('Btn\ta|name:Button|\ts|cursor:pointer|\t');
  static ButtonDefArray: RS1.TDE[] = [RTile.TDef, RTile.ButtonTDE];
  static ButtonDef = RTile.TileMerge(RTile.ButtonDefArray);

  static RoundButtonTDE = new RS1.TDE('RndBtn\ta|name:RoundButton|\ts|border-radius:25px|\t');
  static RoundButtonDefArray: RS1.TDE[] = [RTile.ButtonDef, RTile.RoundButtonTDE];
  static RoundButtonDef = RTile.TileMerge(RTile.RoundButtonDefArray);

  static TextEditTDE = new RS1.TDE('Txt\ta|name:TextEdit|text:true|\ts|\t');
  static TextEditDefArray: RS1.TDE[] = [RTile.TDef, RTile.TextEditTDE];
  static TextEditDef = RTile.TileMerge(RTile.TextEditDefArray);

  static TextButtonTDE = new RS1.TDE('TxtBtn\ta|name:TextButton|textBtn:true|\ts|\t');
  static TextButtonDefArray: RS1.TDE[] = [RTile.RoundButtonDef, RTile.TextButtonTDE];
  static TextButtonDef = RTile.TileMerge(RTile.TextButtonDefArray);

  static ImageButtonTDE = new RS1.TDE('ImgBtn\ta|name:ImageButton|pan:false|upload:true|\ts|\t');
  static ImageButtonDefArray: RS1.TDE[] = [RTile.RoundButtonDef, RTile.ImageButtonTDE];
  static ImageButtonDef = RTile.TileMerge(RTile.ImageButtonDefArray);

  constructor() {
    super();
    this._fileUploaded = false;
    this._editMode = false;
    this._textEditContent = '';
    this._currentZoom = undefined;
    this._panToggle = false;
    this.TList = new RS1.TileList('');
  }

  static Merge(A: RS1.TDE, B: RS1.TDE): RS1.TDE {
    const style = A.sList?.copy() as RS1.qList;
    const attr = A.aList?.copy() as RS1.qList;
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

        case 'Txt':
          RTile.Merge(RTile.TextEditDef, tile);
          break;  

        case 'TxtBtn':
          RTile.Merge(RTile.TextButtonDef, tile);
          break;  

        case 'ImgBtn':
          RTile.Merge(RTile.ImageButtonDef, tile);
          break;
      }
    })
  }

  handleUpload(event: Event, tile: RS1.TDE) {
    const files = (event.currentTarget as HTMLInputElement).files;
    this._currentTile = tile;
    const parent = tile.parent;
    const parentTile = this.TList.tiles[parent];

    const VID = parentTile.sList?.getVID('background-image');
    if ( files !== null && files.length > 0) {
      try {
        const file = files[0];
        if (!file.type.startsWith('image/')) {
          alert('Only image files are allowed');
          return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          if (VID) {
            VID.Desc = `url("${e.target?.result}")`;
            parentTile.sList?.setVID(VID);
           
            this.requestUpdate();

          }
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
      this._fileUploaded = true;
      this._editMode = true;
    }
  }

  handleInteractions(tile: RS1.TDE) {
    const id = `tile${this.TList.tiles.indexOf(tile)}`;
    const element = this.shadowRoot?.getElementById(id);
    console.log('interaction id ' + id);
    this._currentTile = tile;

    if (element) {
      let x = 0;
      let y = 0;
      let width = element.offsetWidth;
      let height = element.offsetHeight;

      interact(element)
        .draggable({
          inertia: true,
          modifiers: [
            interact.modifiers.restrictRect({
              // restriction: 'parent',
              endOnly: true
            })
          ],
          // autoScroll: true,
          listeners: {
            start: (event) => {
              const transform = window.getComputedStyle(element).getPropertyValue('transform');
              const matrix = new DOMMatrix(transform);
              x = matrix.m41;
              y = matrix.m42;
            },
            move: (event) => {
              x += event.dx;
              y += event.dy;
              element.style.transform = `translate(${x}px, ${y}px)`;
            },
            end: (event) => {
              this.updateTilePosition(tile, element, x, y);
            }
          }
        })

        .resizable({
          edges: { left: true, right: true, bottom: true, top: true },
          listeners: {
            move: (event) => {
              const currentTransform = new DOMMatrix(element.style.transform);
              const currentX = currentTransform.m41;
              const currentY = currentTransform.m42;
        
              x = currentX + event.deltaRect.left;
              y = currentY + event.deltaRect.top;
              width = event.rect.width;
              height = event.rect.height;
        
              Object.assign(element.style, {
                width: `${width}px`,
                height: `${height}px`,
                transform: `translate(${x}px, ${y}px)`
              });
            },
            end: (event) => {
              this.updateTilePosition(tile, element,x,y);
              this.updateTileSize(tile, width, height);
            }
          }});
    }
  }

  updateTilePosition(tile: RS1.TDE, element: HTMLElement,x:number,y:number) {
    const translateVID = tile.sList?.getVID('transform');
    const positionVID = tile.sList?.getVID('position');
  
    if (translateVID && positionVID) {
      translateVID.Desc = `translate(${x}px, ${y}px)`;
      positionVID.Desc = 'absolute';
  
      tile.sList?.setVID(translateVID);
      tile.sList?.setVID(positionVID);
    }
  }

  updateTileSize(tile: RS1.TDE, width: number, height: number) {
    const widthVID = tile.sList?.getVID('width');
    const heightVID = tile.sList?.getVID('height');

    if (widthVID && heightVID) {
      widthVID.Desc = `${width}px`;
      heightVID.Desc = `${height}px`;

      tile.sList?.setVID(widthVID);
      tile.sList?.setVID(heightVID);
    }
  }

  handleBackgroundPan() {
    const element = this.shadowRoot?.getElementById('tile2');
    if (element) {
      console.log('current zoom' + this._currentZoom);
      const Panzoom = panzoom(element,
        {
        // autocenter: true, 
        // bounds: true,
        initialZoom: this._currentZoom,
        beforeMouseDown: (e: any) => {
            if (this._currentTile && this._panToggle) {
              if (this.TList.tiles.indexOf(this._currentTile) !== 2) {
              e.preventDefault();
              return false
            }
          }
          return true;
        },
      }
      );
    
      Panzoom.on('zoomend', (e) =>{
        this._currentZoom = Panzoom.getTransform().scale;
        console.log('updated zoom' + this._currentZoom);
      })
     
    }
  }

  setupClickHandler() {
    this.shadowRoot?.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      
      if (!target) return;
      
      const tileIndex = parseInt(target.id.replace('tile', ''));
      const tile = this.TList.tiles[tileIndex];
      
      if (!tile) return;
    
      this.handleClick(tile);
    })
   

  }
  handleClick(tile: RS1.TDE) {
    const alertContent = tile.aList?.descByName('alert');
    const redirectLink = tile.aList?.descByName('redirect');
    const isTextBtn = tile.aList?.descByName('textBtn');
    const isPan = tile.aList?.descByName('pan');
    const handleInteractionToggle = tile.aList?.descByName('toggle');
    const isImage = tile.aList?.descByName('image');

    if (alertContent) {
      alert(alertContent);
    }

    if (redirectLink) {
      window.location.href = redirectLink;
    }

    if (isTextBtn === "true") {
      const parent = tile.parent;
      const parentTile = this.TList.tiles[parent];
      const VID = parentTile.aList?.getVID('inner');

      if (VID) {
        VID.Desc = this._textEditContent;
        parentTile.aList?.setVID(VID);
        this.requestUpdate();
      }
    }

    if (handleInteractionToggle) {
      this._editMode = !this._editMode;
    }

    if (isPan === "true") {
      this.handleInteractions(tile);
    }

    if (isPan === "false") {
      const element = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(tile)}`);
      if (element) {
        interact(element).unset(); 
      }
      console.log('edit mode:', this._editMode)
    }
      if (handleInteractionToggle) {
      const innerVID = tile.aList?.getVID('inner');
      if (innerVID) {
        innerVID.Desc = this._editMode ? 'Done' : 'Edit';
        tile.aList?.setVID(innerVID);
      }
    }

    if (isImage === "true") {
      const parent = tile.parent;
      const parentTile = this.TList.tiles[parent];
      this.handleInteractions(parentTile);
    }
  }

  renderDivs(tile: RS1.TDE): any {
    const innerContent = tile.aList?.descByName('inner') || '';
    const innerContentHTML = unsafeHTML(innerContent)
    const alertContent = tile.aList?.descByName('alert');
    const redirectLink = tile.aList?.descByName('redirect');
    const isImageBtn = tile.aList?.descByName('upload');
    const isImage = tile.aList?.descByName('image');
    const isText = tile.aList?.descByName('text');
    const isTextBtn = tile.aList?.descByName('textBtn');
    const isPan = tile.aList?.descByName('pan');
    const handleInteractionToggle = tile.aList?.descByName('toggle');
    let childrenHtml = html``;
  
    // this.handleBackgroundPan();

    if (isImage === "true") {
      const panVID = tile.aList?.getVID('pan');
      if (panVID && this._fileUploaded) {
        panVID.Desc = this._editMode ? 'true' : 'false';
        tile.aList?.setVID(panVID);
        const element = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(tile)}`);
        if (element) {
          interact(element).unset();
          const parent = tile.parent;
          const parentTile = this.TList.tiles[parent];
          this.handleInteractions(parentTile);
        }
      }
      console.log('Updated pan:', tile.aList?.getVID('pan').Desc);
    }

    if (handleInteractionToggle) {
      const innerVID = tile.aList?.getVID('inner');
      if (innerVID) {
        innerVID.Desc = this._editMode ? 'Done' : 'Edit';
        tile.aList?.setVID(innerVID);
      }
      if (this._fileUploaded) {
        this._currentTile = tile
        const displayVID = tile.sList?.getVID('display');
        console.log('file uploaded!')
        if (displayVID) {
          displayVID.Desc = 'flex'
          tile.sList?.setVID(displayVID);
        }
      }
    }
 

    if (isImageBtn === "true") {
      childrenHtml = html`
        <label for="file-upload">Upload</label>
        <input id="file-upload" type="file" style="display: none;" @change=${(event:Event) => this.handleUpload(event, tile)}>`
    }

    if (isText === "true") {
      childrenHtml = html`
        <textarea
          .value="${this._textEditContent}"
          id="text-edit"
          @input="${(e: Event) => {
            this._textEditContent = (e.target as HTMLTextAreaElement).value;
            this.requestUpdate();
          }}"
          style="" />`
    }

    const styleStr = tile.sList?.toVIDList(";");

    if (tile.first) {
      let child = this.TList.tiles[tile.first]
      while (child) {
        childrenHtml = html`${childrenHtml}${this.renderDivs(child)}`;
        child = this.TList.tiles[child.next];
      }
    }
    
    return html`<div id="tile${this.TList.tiles.indexOf(tile)}" style="${styleStr}">${innerContentHTML}${childrenHtml}</div>`;
  }

  render() {
    this.NewInstance(this.TList);
    const topLevelTiles = this.TList.tiles.filter(tile => !tile.parent);
    return html`${topLevelTiles.map(tile => this.renderDivs(tile))}`;
  }

  firstUpdated(changedProperties: PropertyValueMap<any>): void {
    super.firstUpdated(changedProperties);
    this.handleBackgroundPan();
    this.setupClickHandler();
  }

  shouldUpdate(changedProperties: PropertyValueMap<any>): boolean {
    console.log('Changed properties:', [...changedProperties.keys()]); 
    return super.shouldUpdate(changedProperties);
  }

}
