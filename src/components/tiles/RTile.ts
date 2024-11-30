import { LitElement, html, type PropertyValueMap } from 'lit';
import { customElement, property} from 'lit/decorators.js';
import { RS1 } from '$lib/RSsvelte.svelte';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import interact from 'interactjs';
import panzoom from 'panzoom';
import { text } from '@sveltejs/kit';

@customElement('r-tile')
export class RTile extends LitElement {
  declare TList: RS1.TileList;
  declare _textEditContent: string;
  declare _fileUploaded: boolean;
  declare _editMode: boolean;
  declare _currentTile?: RS1.TDE | undefined;
  declare _panToggle: boolean;
  declare _isTextPreview: boolean;

  static properties = {
    _fileUploaded: { type: Boolean },
    _editMode: { type: Boolean },
    // _textEditContent: { type: String },
    // // _currentTile: { type: Object },
    _panToggle: { type: Boolean },
    TList: { type: Object },
    _isTextPreview: { type: Boolean }
  };

  static TTDE = new RS1.TDE('T\ta|name:T|inner:|alert:|image:|drag:|\ts|scale:|position:|top:|left:|width:|height:|display:block|flex-direction:column|align-items:center|justify-content:center|background:black|background-image:url("")|\t');
  static TDefArray: RS1.TDE[] = [RTile.TTDE];
  static TDef = RTile.TileMerge(RTile.TDefArray)

  static ButtonTDE = new RS1.TDE('Btn\ta|name:Button|\ts|cursor:pointer|\t');
  static ButtonDefArray: RS1.TDE[] = [RTile.TDef, RTile.ButtonTDE];
  static ButtonDef = RTile.TileMerge(RTile.ButtonDefArray);

  static RoundButtonTDE = new RS1.TDE('RndBtn\ta|name:RoundButton|\ts|border-radius:25px|\t');
  static RoundButtonDefArray: RS1.TDE[] = [RTile.ButtonDef, RTile.RoundButtonTDE];
  static RoundButtonDef = RTile.TileMerge(RTile.RoundButtonDefArray);

  static TextEditTDE = new RS1.TDE('Txt\ta|name:TextEdit|text:true|textPreview:true|\ts|\t');
  static TextEditDefArray: RS1.TDE[] = [RTile.TDef, RTile.TextEditTDE];
  static TextEditDef = RTile.TileMerge(RTile.TextEditDefArray);

  static TextButtonTDE = new RS1.TDE('TxtBtn\ta|name:TextButton|textBtn:true|\ts|\t');
  static TextButtonDefArray: RS1.TDE[] = [RTile.RoundButtonDef, RTile.TextButtonTDE];
  static TextButtonDef = RTile.TileMerge(RTile.TextButtonDefArray);

  static ImageButtonTDE = new RS1.TDE('ImgBtn\ta|name:ImageButton|drag:false|upload:true|\ts|\t');
  static ImageButtonDefArray: RS1.TDE[] = [RTile.RoundButtonDef, RTile.ImageButtonTDE];
  static ImageButtonDef = RTile.TileMerge(RTile.ImageButtonDefArray);

  constructor() {
    super();
    this._fileUploaded = false;
    this._editMode = false;
    this._textEditContent = '';
    this._panToggle = false;
    this.TList = new RS1.TileList('');
    this._isTextPreview = true;
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
    if (!this._currentTile) this._currentTile = this.TList.tiles[1];
    
    const element = this.shadowRoot?.getElementById('tile2');
    if (element) {
      const Panzoom = panzoom(element,
        {
        // autocenter: true, 
        // bounds: true,
        // initialZoom: this._currentZoom,
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
     
    }
  }

  setupClickHandler() {
    this.shadowRoot?.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      
      if (!target) return;

      if (this._currentTile) {
        const element = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(this._currentTile)}`);
          if (element) {
            interact(element).unset();
          }
        }
      
      const tileIndex = parseInt(target.id.replace('tile', ''));
      const tile = this.TList.tiles[tileIndex];
      this._currentTile = tile;
      
      if (!tile) return;

        this.handleClick(tile);
    })
   

  }
  handleClick(tile: RS1.TDE) {
    const alertContent = tile.aList?.descByName('alert');
    const redirectLink = tile.aList?.descByName('redirect');
    const isTextBtn = tile.aList?.descByName('textBtn');
    const isDrag = tile.aList?.descByName('drag');
    const handleInteractionToggle = tile.aList?.descByName('toggle');
    const isImage = tile.aList?.descByName('image');
    const isPan = tile.aList?.descByName('pan');
    const isTextBold = tile.aList?.descByName('textBold');
    const isTextItalic = tile.aList?.descByName('textItalic');
    const isTextUnderline = tile.aList?.descByName('textUnderline');
    const textEditor = document.getElementById('text-edit');

    function applyFormatting(command:string) {
        document.execCommand(command, false);
        textEditor?.focus();
    }

    if (alertContent) {
      alert(alertContent);
    }

    if (redirectLink) {
      window.location.href = redirectLink;
    }

    if (isTextBtn === "true") { 

      const parent = tile.parent;
      const parentTile = this.TList.tiles[parent];
      const parentInnerVID = parentTile.aList?.getVID('inner');
      const textPreviewVID = parentTile.aList?.getVID('textPreview');
      const isTextPreview = parentTile.aList?.descByName('textPreview');

      if (parentInnerVID) {
        parentInnerVID.Desc = this._textEditContent;
        parentTile.aList?.setVID(parentInnerVID);
      }

      if (textPreviewVID) {
        textPreviewVID.Desc = 'true';
        parentTile.aList?.setVID(textPreviewVID);
      }

      this._isTextPreview = true;
     
    }

    if( isTextBold === "true") {
      applyFormatting('bold');
    }

    if (handleInteractionToggle) {
      this._editMode = !this._editMode;
      const innerVID = tile.aList?.getVID('inner');
      if (innerVID) {
        innerVID.Desc = this._editMode ? 'Done' : 'Edit';
        tile.aList?.setVID(innerVID);
      }
      
    }

    if (!this._panToggle) {
      if (isDrag === "true") {
      this.handleInteractions(tile);
      }
    } 

    if (isDrag === "false") {
      const element = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(tile)}`);
      if (element) {
        interact(element).unset(); 
      }
      console.log('edit mode:', this._editMode)
    }

    if (isImage === "true" && !this._panToggle) {
      const parent = tile.parent;
      const parentTile = this.TList.tiles[parent];
      this.handleInteractions(parentTile);
    }
}

  renderDivs(tile: RS1.TDE): any {
    const innerContent = tile.aList?.descByName('inner') || '';
    const innerContentHTML = unsafeHTML(innerContent);
    const parentTile = this.TList.tiles[tile.parent];
    const isImageBtn = tile.aList?.descByName('upload');
    const isImage = tile.aList?.descByName('image');
    const isText = tile.aList?.descByName('text');
    const isTextBtn = tile.aList?.descByName('textBtn');
    const handleInteractionToggle = tile.aList?.descByName('toggle');
    const displayVID = tile.sList?.getVID('display');
    const istextPreview = tile.aList?.descByName('textPreview');
    const textPreviewVID = tile.aList?.getVID('textPreview');
    let childrenHtml = html``;

    if (isImage === "true") {
      const dragVID = tile.aList?.getVID('drag');
      if (dragVID && this._fileUploaded) {
        dragVID.Desc = this._editMode ? 'true' : 'false';
        tile.aList?.setVID(dragVID);
        const element = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(tile)}`);
        if (element) {
          interact(element).unset();
          const parent = tile.parent;
          const parentTile = this.TList.tiles[parent];
          this.handleInteractions(parentTile);
        }
      }
    }

    if (handleInteractionToggle) {
      const innerVIDToggle = tile.aList?.getVID('inner');
      const displayVID = tile.sList?.getVID('display');
      if (innerVIDToggle) {
        innerVIDToggle.Desc = this._editMode ? 'Done' : 'Edit';
        tile.aList?.setVID(innerVIDToggle);
      }
      if (this._fileUploaded) {
        this._currentTile = tile
        console.log('file uploaded!')
        if (displayVID) {
          displayVID.Desc = this._panToggle ? 'none' : 'flex';
          tile.sList?.setVID(displayVID);
        }
      }
    }

    if (isImageBtn === "true") {
      const displayVID = tile.sList?.getVID('display');
      if (displayVID) {
        displayVID.Desc = this._panToggle ? 'none' : 'flex'
        tile.sList?.setVID(displayVID);
      }
    }

    if (isTextBtn === "true") {
      const isTextPreview = parentTile.aList?.descByName('textPreview');
      if (isTextPreview === "true" && this._isTextPreview) {
        if (displayVID) {
          displayVID.Desc = 'none'
          tile.sList?.setVID(displayVID);
          
        }
      }
      else if (isTextPreview === "false" && !this._isTextPreview) {
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


    const styleStr = tile.sList?.toVIDList(";");

    if (tile.first) {
      let child = this.TList.tiles[tile.first]
      while (child) {
        childrenHtml = html`${childrenHtml}${this.renderDivs(child)}`;
        child = this.TList.tiles[child.next];
      }
    }
    
    // return html`<div id="tile${this.TList.tiles.indexOf(tile)}" style="${styleStr}">${innerContentHTML}${childrenHtml}</div>`;

    if (isText === "true") {
      
      if (!this._panToggle) {
        if (istextPreview === "false") {

          return html`
          <div id="tile${this.TList.tiles.indexOf(tile)}" style="${styleStr}">
            <textarea
            .value="${innerContent}"
            id="text-edit"
            contenteditable="true" 
            placeholder="Enter text here"
            @input="${(e: Event) => {
              console.log('inputx' + innerContent) 
              this._textEditContent = (e.target as HTMLTextAreaElement).value;
            }}"
            style="background: white; border: none;">
            </textarea> 
            ${childrenHtml}
          </div>`;
        }
        else if (istextPreview === "true") {
          return html`
          <div id="tile${this.TList.tiles.indexOf(tile)}" style="${styleStr}">
            <div
            id="text-edit"
            contenteditable="false" 
            @click="${() =>  { textPreviewVID.Desc = "false";
            tile.aList?.setVID(textPreviewVID);
            this._isTextPreview = false;}}"
            style="background: transparent; border: none; color: white;">
            ${innerContentHTML}
            </div>
            ${childrenHtml}
          </div>`;
        }
    }
  }
    return html`<div id="tile${this.TList.tiles.indexOf(tile)}" style="${styleStr}">
    ${innerContentHTML}
    ${childrenHtml}
    </div>`;
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

  updated(changedProperties: PropertyValueMap<any>): void {
    super.updated(changedProperties);
    // this.setupClickHandler();
    if (this._currentTile && this._panToggle) {
      const element = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(this._currentTile)}`);
      if (element) {
        interact(element).unset(); 
          }
  }
}

  shouldUpdate(changedProperties: PropertyValueMap<any>): boolean {
    console.log('Changed properties:', [...changedProperties.keys()]); 
    return super.shouldUpdate(changedProperties);
  }

}
