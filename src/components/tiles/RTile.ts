import { LitElement, html, type PropertyValueMap, css } from 'lit';
import { customElement, property} from 'lit/decorators.js';
import { RS1 } from '$lib/RSsvelte.svelte';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import interact from 'interactjs';
import panzoom from 'panzoom';
import { text } from '@sveltejs/kit';
import Splide from '@splidejs/splide';

@customElement('r-tile')
export class RTile extends LitElement {
  declare TList: RS1.TileList;
  declare tile: RS1.TDE;
  declare _textEditContent: string;
  declare _fileUploaded: boolean;
  declare _editMode: boolean;
  declare _currentTile?: RS1.TDE | undefined;
  declare _panToggle: boolean;
  declare _panAxis: string;
  declare _isTextPreview: boolean;

  static properties = {
    _fileUploaded: { type: Boolean },
    _editMode: { type: Boolean },
    _panToggle: { type: Boolean },
    _panAxis: { type: String },
    TList: { type: Object },
    _isTextPreview: { type: Boolean }
  };

  static TTDE = new RS1.TDE('T\ta|name:T|inner:|function:|element:div|alert:|image:|drag:|\ts|scale:|position:|top:|left:|width:|height:|display:block|flex-direction:column|align-items:center|justify-content:center|background:black|background-image:url("")|\t');
  static TDefArray: RS1.TDE[] = [RTile.TTDE];
  static TDef = RTile.TileMerge(RTile.TDefArray)

  static ButtonTDE = new RS1.TDE('Btn\ta|name:Button|element:button|\ts|cursor:pointer|\t');
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
    this._panAxis = 'x';
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

    const VID = tile.sList?.getVID('background-image');
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
            tile.sList?.setVID(VID);
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
    // if (!this._currentTile) this._currentTile = this.TList.tiles[1];
    
    const element = this.shadowRoot?.getElementById('tile2');
    let xPos = 0;
    let yPos = 0;
    if (element) {
  //     const Panzoom = panzoom(element,
  //       {
  //       // autocenter: true, 
  //       // bounds: true,
  //       // initialZoom: this._currentZoom,
  //       beforeMouseDown: (e: any) => {
  //           if (this._currentTile && this._panToggle) {
  //             if (this.TList.tiles.indexOf(this._currentTile) !== 2) {
  //             e.preventDefault();
  //             return false
  //           }
  //         }
  //         return true;
  //       },
  //     }
  //     );
     
  //   }
  // }
  
      interact(element).draggable({
        listeners: {
            move: event => {
              if (this._panToggle === false) return;
                xPos += event.dx
                yPos += event.dy
          
                event.target.style.transform =
                  `translate(${xPos}px, ${yPos}px)`
            }
        },
        modifiers: [
            interact.modifiers.restrict({
                restriction: 'parent',
                endOnly: true
            })
        ],
        inertia: true,
        startAxis: this._panAxis as 'x' | 'y' | 'xy',
        lockAxis: 'start'
      });

      interact(element).styleCursor(false);
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
    const tileFunction = tile.aList?.descByName('function');
    const alertContent = tile.aList?.descByName('alert');
    const redirectLink = tile.aList?.descByName('redirect');
    const isDrag = tile.aList?.descByName('drag');
    const isLink = tile.aList?.descByName('link');
    const textEditor = this.shadowRoot?.getElementById('text-box');

    switch (tileFunction) {
      case 'Image':
        if (!this._panToggle) {
          const parent = tile.parent;
          const parentTile = this.TList.tiles[parent];
          this.handleInteractions(parentTile);
        }
        break;
      
      case 'EditToggle':
        this._editMode = !this._editMode;
        const innerVID = tile.aList?.getVID('inner');
        if (innerVID) {
          innerVID.Desc = this._editMode ? 'Done' : 'Edit';
          tile.aList?.setVID(innerVID);
        }
        break;

      case 'TextSave':
        const parent = tile.parent;
        const parentTile = this.TList.tiles[parent];
        const parentInnerVID = parentTile.aList?.getVID('inner');
        const textPreviewVID = parentTile.aList?.getVID('textPreview');

        if (parentInnerVID) {
          parentInnerVID.Desc = this._textEditContent;
          parentTile.aList?.setVID(parentInnerVID);
        }
  
        if (textPreviewVID) {
          textPreviewVID.Desc = 'true';
          parentTile.aList?.setVID(textPreviewVID);
        }
  
        this._isTextPreview = true;
        break;


      case 'Bold':
        applyFormatting('bold');
        break;

      case 'Italic':
        applyFormatting('italic');
        break;
      
      case 'Underline':
        applyFormatting('underline');
        break;   
    }

    function applyFormatting(command:string) {
      if (!textEditor) return;
      document.execCommand(command, false);
    }

    if (alertContent) {
      alert(alertContent);
    }

    if (redirectLink) {
      window.location.href = redirectLink;
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

    if (isLink) {
      const link = tile.aList?.descByName('link');
      this.dispatchEvent(
        new CustomEvent('tileLink', {
          detail: { name: `${link}` },
          bubbles: true,
          composed: true
        })
      );
    }
}

  renderDivs(tile: RS1.TDE): any {
    const innerContent = tile.aList?.descByName('inner') || '';
    const elementType = tile.aList?.descByName('element');
    const tileFunction = tile.aList?.descByName('function');
    const parentTile = this.TList.tiles[tile.parent];
    // const isText = tile.aList?.descByName('text');
    const isInnerEdit = tile.aList?.descByName('innerEdit');
    const innerContentHTML = isInnerEdit === 'true' ? html`<div>${unsafeHTML(innerContent)}</div>` : unsafeHTML(innerContent);
    const displayVID = tile.sList?.getVID('display');
    const istextPreview = tile.aList?.descByName('textPreview');
    const textPreviewVID = tile.aList?.getVID('textPreview');
    let childrenHtml = html``;

    switch (tileFunction) {
      case 'Image':
        const dragVID = tile.aList?.getVID('drag');
        if (dragVID) {
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
  
        if (!this._panToggle) {
          const borderVID = tile.sList?.getVID('border-style');
          if (borderVID) {
            borderVID.Desc = this._editMode ? 'dotted' : 'none';
            tile.sList?.setVID(borderVID);
            console.log('border', borderVID.Desc)
          }
  
          if (this._fileUploaded && this._editMode) {
            childrenHtml = html`
            <button id="image-delete" style="width:70px;height:30px;background:#1e1e1e;color:white;border-radius:8px;position:absolute;top:0px;left:0px" @click=${() => {
              const VID = tile.sList?.getVID('background-image');
              if (VID) {
                VID.Desc = 'url("")';
                tile.sList?.setVID(VID);
                this._fileUploaded = false;
                this.requestUpdate();
              }
            }}>Delete</button>`   
          }
          else if (!this._fileUploaded) {
            childrenHtml = html`
            <button style="width:70px;height:30px;background:#1e1e1e;color:white;border-radius:8px;position:absolute;top:0px;left:0px">
              <label for="file-upload">Upload</label>
              <input id="file-upload" type="file" style="display: none;" @change=${(event:Event) => this.handleUpload(event, tile)}>
            </button>`
          }
        }
        break;

        case 'EditToggle':
          const innerVIDToggle = tile.aList?.getVID('inner');
          if (innerVIDToggle) {
            innerVIDToggle.Desc = this._editMode ? 'Done' : 'Edit';
            tile.aList?.setVID(innerVIDToggle);
          }
            this._currentTile = tile
            if (displayVID) {
              displayVID.Desc = this._panToggle ? 'none' : 'flex';
              tile.sList?.setVID(displayVID);
            }
          break;

        case 'ImageUpload':
          childrenHtml = html`
          <label for="file-upload">Upload</label>
          <input id="file-upload" type="file" style="display: none;" @change=${(event:Event) => this.handleUpload(event, tile)}>`
        
          if (displayVID) {
            displayVID.Desc = this._panToggle ? 'none' : 'flex'
            tile.sList?.setVID(displayVID);
          }
          break;

        case 'TextSave':
          const isParentTextPreview = parentTile.aList?.descByName('textPreview');
          if (isParentTextPreview === "true" && this._isTextPreview) {
            if (displayVID) {
              displayVID.Desc = 'none'
              tile.sList?.setVID(displayVID);
              
            }
          }
          else if (isParentTextPreview === "false" && !this._isTextPreview) {
            if (displayVID) {
              displayVID.Desc = 'flex'
              tile.sList?.setVID(displayVID);
            }
          }
          break;

        case 'TextBox':
          childrenHtml = html`
          <div
          id="text-box"
          contenteditable="true"
          style="background: white; border: none; color: black; resize: both; overflow: auto; min-height: 50px; min-width: 150px; cursor: text ; ">
          </div> `;
          break;
          
        case 'Carousel':
          childrenHtml = html`<image-carousel></image-carousel>`
    }

    let styleStr = tile.sList?.toVIDList(";");

    if (tile.first) {
      let child = this.TList.tiles[tile.first]
      while (child) {
        childrenHtml = html`${childrenHtml}${this.renderDivs(child)}`;
        child = this.TList.tiles[child.next];
      }
    }
    
    if (isInnerEdit === "true") {
      
      if (!this._panToggle) {
        if (istextPreview === "false") {

        return html`
        <div id="tile${this.TList.tiles.indexOf(tile)}" style="${styleStr}">
          <div
          id="text-edit"
          contenteditable="true"
          placeholder="Enter text here"
          @input="${(e: Event) => {
            console.log('inputx' + innerContent) 
            this._textEditContent = (e.target as HTMLDivElement).textContent || '';
          }}"
          style="background: white; border: none; color: black; resize: both; overflow: auto; min-height: 50px; min-width: 150px; cursor: text ; ">
          ${innerContent} 
          </div> 
          ${childrenHtml}
        </div>`;
        }

        
        else if (istextPreview === "true") {
          return html`
          <div id="tile${this.TList.tiles.indexOf(tile)}" style="${styleStr}">
            <div
            id="text-edit2"
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

    switch (elementType) {
      case 'div':
        return html`<div id="tile${this.TList.tiles.indexOf(tile)}" class="tile" style="${styleStr}">${innerContentHTML}${childrenHtml}</div>`;

      case 'button': 
        return childrenHtml = html`<button id="tile${this.TList.tiles.indexOf(tile)}" class="tile" style="${styleStr}">${innerContentHTML}</button>`;
    }
  }

  render() {
    this.NewInstance(this.TList);
    return html`${ this.renderDivs(this.tile)}`;
  }

  firstUpdated(changedProperties: PropertyValueMap<any>): void {
    super.firstUpdated(changedProperties);
    // this.handleBackgroundPan();
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
  this.handleBackgroundPan();
}

  shouldUpdate(changedProperties: PropertyValueMap<any>): boolean {
    console.log('Changed properties:', [...changedProperties.keys()]); 
    return super.shouldUpdate(changedProperties);
  }

}

@customElement ('tile-list-renderer') 
export class TileListRenderer extends LitElement {

  declare TList: RS1.TileList;
  declare topLevelTiles: RS1.TDE[];
  declare _panToggle: boolean; 

  static properties = {
    TList: { type: Object },
    _panToggle: { type: Boolean, state: true },
  };

  constructor() {
    super();
    this.TList = new RS1.TileList('');
    this._panToggle = false;
  }
  
  willUpdate(changedProperties: PropertyValueMap<any>) {
      if (changedProperties.has('TList')) {
        this.topLevelTiles = this.TList.tiles.filter(tile => !tile.parent);
      }
  }

  render() {
    return html`
      ${this.topLevelTiles.map(tile => html`
        <r-tile .tile=${tile} ._panToggle=${this._panToggle} .TList=${this.TList}></r-tile>
      `)}
    `;
  }

}

@customElement('image-carousel')
export class ImageCarousel extends LitElement {
  declare images: string[];
  declare splide: Splide;

  static properties = {
    images: { type: Array },
  };

  static styles = css`
  .carousel-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .splide {
    width: 100%;
    height: 100%;
  }
  
  .splide__track {
    width: 100%;
    height: 100%;
  }
  
  .splide__slide {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .splide__slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .upload-container {
    width: 100%;
    height: 70%; 
    display: flex;
    justify-content: center;
    align-items: center;
    
    padding: 10px;
   
  }

  .upload-button {
    background-color: #4CAF50;
    color: #fff;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }
  
  .upload-button:hover {
    background-color: #3e8e41;
  }
  
  #imageUpload {
    display: none;
  }

  input[type="file"] {
    display: none;
  }
  `;

  constructor() {
    super();
    this.images = [];
  }

  firstUpdated() {
    this.initSplide();
     const styleElement = document.createElement('style');
    styleElement.textContent = `
      @import url("https://cdn.jsdelivr.net/npm/@splidejs/splide/dist/css/splide.min.css");
    `;
    this.renderRoot.appendChild(styleElement);
  }

  updated(changedProperties: PropertyValueMap<this>) {
    if (changedProperties.has('images')) {
      this.initSplide();
    }
  }

  initSplide() {
    if (this.splide) {
      this.splide.destroy();
    }
    
    const splideElement = this.shadowRoot?.querySelector('.splide') as HTMLElement;
    if (splideElement && this.images.length > 0) {
      this.splide = new Splide(splideElement, {
        type: 'loop',
        perPage: 1,
        autoplay: true,
        interval: 2000,
        pauseOnHover: true,
        pagination: true,
        arrows: true
      }).mount();
    }
  }

  handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) {console.error('no files selected'); return} ;
    const newImages = Array.from(files).map(file => URL.createObjectURL(file));
    this.images = [...this.images, ...newImages];
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="carousel-container">
        ${this.images.length > 0 ? html`
          <div class="splide">
            <div class="splide__track">
              <ul class="splide__list">
                ${this.images.map(image => html`
                  <li class="splide__slide">
                    <img src="${image}" alt="Carousel image">
                  </li>
                `)}
              </ul>
            </div>
          </div>
        ` : html`
        `
      }
        
        <div class="upload-container">
          <input 
            type="file" 
            id="imageUpload" 
            accept="image/*" 
            @change="${this.handleFileUpload}"
            multiple
          >
          <label for="imageUpload" class="upload-button">
            Upload Image
          </label>
        </div>
      </div>
    `;
  }
}