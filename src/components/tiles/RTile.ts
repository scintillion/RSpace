import { LitElement, html, type PropertyValueMap, css } from 'lit';
import { customElement, property} from 'lit/decorators.js';
import { RS1 } from '$lib/RSsvelte.svelte';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import interact from 'interactjs';
import panzoom from 'panzoom';
import { text } from '@sveltejs/kit';
import Splide from '@splidejs/splide';
import {MediaController} from 'media-chrome';

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
  declare _showEditorPanel: boolean;
  declare showListEditor: boolean;

  static properties = {
    _fileUploaded: { type: Boolean },
    _editMode: { type: Boolean },
    _panToggle: { type: Boolean },
    _panAxis: { type: String },
    TList: { type: Object },
    _isTextPreview: { type: Boolean },
    _showEditorPanel: { type: Boolean }
  };

  static TTDE = new RS1.TDE('T\ta|name:T|inner:|function:|element:div|alert:|image:|drag:|\ts|scale:|position:|top:|left:|width:|height:|display:block|flex-direction:column|align-items:center|justify-content:center|background:black|background-image:url("")|\t');
  static TDefArray: RS1.TDE[] = [RTile.TTDE];
  static TDef = RTile.TileMerge(RTile.TDefArray)

  static ButtonTDE = new RS1.TDE('Btn\ta|name:Button|element:button|type:|value:|\ts|cursor:pointer|\t');
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

  static ImageCarouselTDE = new RS1.TDE('Carousel\ta|name:ImageCarousel|function:Carousel|event:Swipe|\ts|\t');
  static ImageCarouselDefArray: RS1.TDE[] = [RTile.TDef, RTile.ImageCarouselTDE];
  static ImageCarouselDef = RTile.TileMerge(RTile.ImageCarouselDefArray);

  static InputTDE = new RS1.TDE('Input\ta|name:Input|function:Input|input-required:|input-type:|input-maxlength:|input-min:|input-max:|input-pattern:|input-step:|input-placeholder:|input-title:|input-readonly:|input-disabled:|input-autocomplete:|input-autofocus:|input-multiple:|input-novalidate:|\ts|\t');
  static InputDefArray: RS1.TDE[] = [RTile.TDef, RTile.InputTDE];
  static InputDef = RTile.TileMerge(RTile.InputDefArray);

  static VideoPlayerTDE = new RS1.TDE('Video\ta|name:VideoPlayer|function:VideoPlayer|video-src:|video-type:|video-controls:true|video-autoplay:false|video-loop:false|video-muted:false|\ts|\t');
  static VideoPlayerDefArray: RS1.TDE[] = [RTile.TDef, RTile.VideoPlayerTDE];
  static VideoPlayerDef = RTile.TileMerge(RTile.VideoPlayerDefArray);

  constructor() {
    super();
    this._fileUploaded = false;
    this._editMode = false;
    this._textEditContent = '';
    this._panToggle = false;
    this._panAxis = 'x';
    this._isTextPreview = true;
    this._showEditorPanel = true;
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

  static modifyTDE(TileDef: RS1.TDE, modifications: {
      styles?: Record<string, string>,
      attributes?: Record<string, string>
    }): RS1.TDE {
     
      if (modifications.styles) {
        Object.entries(modifications.styles).forEach(([property, value]) => {
          const VID = TileDef.sList?.getVID(property);
          if (VID) {
            VID.Desc = value;
            TileDef.sList?.setVID(VID);
          }
          else {
            TileDef.sList?.set(property, value);
          }
        });
      }

      if (modifications.attributes) {
        Object.entries(modifications.attributes).forEach(([property, value]) => {
          const VID = TileDef.aList?.getVID(property);
          if (VID) {
            VID.Desc = value;
            TileDef.aList?.setVID(VID);
          }
          else {
            TileDef.aList?.set(property, value);
          }
        });
      }
      return TileDef;
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

        case 'Carousel':
          RTile.Merge(RTile.ImageCarouselDef, tile);
          break;

        case 'Input':
          RTile.Merge(RTile.InputDef, tile);
          break;

        case 'Video':
          RTile.Merge(RTile.VideoPlayerDef, tile);
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

deleteTile(tile: RS1.TDE) {
  if (!this.TList || !tile) return;
  const tileIndex = this.TList.tiles.indexOf(tile);
  this.TList.tiles.splice(tileIndex, 1);
  this.TList.Links();

  this.dispatchEvent(
    new CustomEvent('tile-deleted', {
      detail: { tileIndex },
      bubbles: true,
      composed: true
    })
  );

  this.requestUpdate();
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
    let styleStr = tile.sList?.toVIDList(";");
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
            const tileIndexCarousel = this.TList.tiles.indexOf(tile);
            childrenHtml = html`
              <div id="tile${tileIndexCarousel}" class="tile" style="position: relative; ${styleStr}">
                <image-carousel 
                  .tileIndex="${tileIndexCarousel}"
                  .canDelete="${tileIndexCarousel !== 1}"
                  @delete-tile="${() => this.deleteTile(tile)}">
                </image-carousel>
              </div>
            `;
            return childrenHtml;
            break;

        case 'Input':
          // const submitButton = new RS1.TDE('Btn\ta|name:Submit|element:button|inner:Submit|type:submit|\ts|width:70px|height:30px|background:#1e1e1e|color:white|\t')
          const submitButton = RTile.modifyTDE(RTile.ButtonTDE, {
            attributes: {
              name: 'Submit',
              inner: 'Submit',
              type: 'submit',
            },
            styles: {
              width: '70px',
              height: '30px',
              background: '#1e1e1e',
              color: 'white'
            }
          })
          childrenHtml = html`
          <form style="display: flex; background: transparent;">
            <input type="${tile.aList?.getVID('input-type')?.Desc}" placeholder="${tile.aList?.getVID('input-placeholder')?.Desc}" ${tile.aList?.getVID('input-required')?.Desc === 'true' ? 'required' : '' } minlength="${tile.aList?.getVID('input-minlength')?.Desc}" maxlength="${tile.aList?.getVID('input-maxlength')?.Desc}"></input>
            ${this.renderDivs(submitButton)}
          </form> `; 
          break;

        case 'ColorPicker':
          childrenHtml = html`
          <color-picker></color-picker>`
          break;

        case 'VideoPlayer':
          const videoSrc = tile.aList?.descByName('video-src') || '';
          const videoType = tile.aList?.descByName('video-type') || 'video/mp4';
          const videoControls = tile.aList?.descByName('video-controls') === 'true';
          const videoAutoplay = tile.aList?.descByName('video-autoplay') === 'true';
          const videoLoop = tile.aList?.descByName('video-loop') === 'true';
          const videoMuted = tile.aList?.descByName('video-muted') === 'true';

          childrenHtml = html`
            <video-player
              .src=${videoSrc}
              .type=${videoType}
              ?controls=${videoControls}
              ?autoplay=${videoAutoplay}
              ?loop=${videoLoop}
              ?muted=${videoMuted}
            ></video-player>
          `;
          break;

    }

     styleStr = tile.sList?.toVIDList(";");

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
        const tileIndex = this.TList.tiles.indexOf(tile);
        return html`<div id="tile${tileIndex}" class="tile" style="${styleStr}"
          @mouseenter="${(e: Event) => {
            e.stopPropagation();
            const button = (e.currentTarget as HTMLElement).querySelector(':scope > .delete-button');
            if (button) (button as HTMLElement).style.opacity = '1';
          }}"
          @mouseleave="${(e: Event) => {
            e.stopPropagation();
            const button = (e.currentTarget as HTMLElement).querySelector(':scope > .delete-button');
            if (button) (button as HTMLElement).style.opacity = '0';
          }}">
          ${innerContentHTML}${childrenHtml}
          ${tileIndex !== 1 ? html`
            <button class="delete-button" 
              style="position: absolute; top: 10px; right: 10px; opacity: 0; transition: opacity 0.3s; z-index: 10; display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;"
              @click="${() => this.deleteTile(tile)}">
              Delete
            </button>
          ` : ''}
        </div>`;
      case 'button': 
        return childrenHtml = html`<button id="tile${this.TList.tiles.indexOf(tile)}" type="${tile.aList?.getVID('type')?.Desc}" value="${tile.aList?.getVID('value')?.Desc}" class="tile" style="${styleStr}">${innerContentHTML}</button>`;
    }
  }

  render() {
    this.NewInstance(this.TList);
    return html`
      ${this.renderDivs(this.tile)}
      <tile-editor-panel
        ?editMode=${this._editMode}
        ?BrowseMode=${this._panToggle}
        ?showPanel=${this._showEditorPanel}
        ?showListEditor=${this.showListEditor}
        @edit-mode-toggle=${this.handleEditModeToggle}
        @pan-mode-toggle=${this.handleBrowseModeToggle}
        @panel-toggle=${this.handlePanelToggle}
      ></tile-editor-panel>
    `;
  }
  private handleEditModeToggle(e: CustomEvent) {
    this._editMode = e.detail.editMode;
    if (this._editMode) {
      this._panToggle = false;
    }
    this.requestUpdate();
  }
  
  private handleBrowseModeToggle(e: CustomEvent) {
    this._panToggle = e.detail.BrowseMode;
    if (this._panToggle) {
      this._editMode = false;
    }
    this.requestUpdate();
  }
  
  private handlePanelToggle(e: CustomEvent) {
    this._showEditorPanel = e.detail.showPanel;
    this.requestUpdate();
  }

  firstUpdated(changedProperties: PropertyValueMap<any>): void {
    super.firstUpdated(changedProperties);
    this.setupClickHandler();
    this.handleBackgroundPan();
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
    console.log('updated property: ', changedProperties);
  // this.handleBackgroundPan();
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
  declare showListEditor: boolean;

  static properties = {
    TList: { type: Object },
    _panToggle: { type: Boolean, state: true },
    showListEditor: { type: Boolean, state: true },
  };

  constructor() {
    super();
    this.TList = new RS1.TileList('');
    this._panToggle = false;
    this.showListEditor = false;
  }
  
  willUpdate(changedProperties: PropertyValueMap<any>) {
      if (changedProperties.has('TList')) {
        this.topLevelTiles = this.TList.tiles.filter(tile => !tile.parent);
      }
  }

  render() {
    return html`
      ${this.topLevelTiles.map(tile => html`
        <r-tile .tile=${tile} ._panToggle=${this._panToggle} .TList=${this.TList} .showListEditor=${this.showListEditor}></r-tile>
      `)}
    `;
  }

}

@customElement('image-carousel')
export class ImageCarousel extends LitElement {
  declare images: string[];
  declare splide: Splide;
  declare tileIndex: number;
  declare canDelete: boolean;

  static properties = {
    images: { type: Array },
    tileIndex: { type: Number },
    canDelete: { type: Boolean }
  };

  static styles = css`
  .carousel-container {
    position: relative;
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

  .controls {
    position: absolute;
    top: 10px;
    right: 10px;
    opacity: 0; 
    transition: opacity 0.3s; 
    z-index: 10; 
    display: flex;
    gap: 10px;
    
  }

  .carousel-container:hover .controls {
    opacity: 1;
  }

  .upload-button, .delete-button, .delete-tile-button {
 display: inline-block;
      border: none;
      border-radius: 5px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      color: #fff;
      cursor: pointer;
      width: 70px;
      height: 30px;
      background: #1e1e1e;
  }

  input[type="file"] {
    display: none;
  }
  `;

  constructor() {
    super();
    this.images = [];
    this.tileIndex = -1;
    this.canDelete = true;
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

  deleteCurrentImage() {
    if (this.splide && this.images.length > 0) {
      const currentIndex = this.splide.index;
      if (currentIndex >= 0 && currentIndex < this.images.length) {
        const removedImage = this.images[currentIndex];
        this.images = this.images.filter((_, index) => index !== currentIndex);
        URL.revokeObjectURL(removedImage); 
        this.requestUpdate();
      }
    }
  }
  
  deleteTile() {
    this.dispatchEvent(new CustomEvent('delete-tile', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div class="carousel-container">
        <div class="controls">
          <label for="imageUpload" class="upload-button">Upload</label>
          ${this.images.length > 0
            ? html`<button class="delete-button" @click="${this.deleteCurrentImage}">Delete Image</button>`
            : ''}
          ${this.canDelete
            ? html`<button class="delete-tile-button" @click="${this.deleteTile}">Delete</button>`
            : ''}
        </div>
        ${this.images.length > 0
          ? html`
              <div class="splide">
                <div class="splide__track">
                  <ul class="splide__list">
                    ${this.images.map(
                      image => html`
                        <li class="splide__slide">
                          <img src="${image}" alt="Carousel image" />
                        </li>
                      `
                    )}
                  </ul>
                </div>
              </div>
            `
          : html``}
        <input
          type="file"
          id="imageUpload"
          accept="image/*"
          @change="${this.handleFileUpload}"
          multiple
        />
      </div>
    `;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.splide) {
      this.splide.destroy();
    }
  }
}

@customElement('color-picker')
class ColorPicker extends LitElement {
  
  static get styles() {
    return css`
      .color-picker {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        overflow: hidden;
        appearance: none;
        -webkit-appearance: none;
        border: none;
        cursor: pointer;
        background:#D1D5DB
    
      }
      .color-picker::-webkit-color-swatch {
        border-radius: 50%;
        border: none;
    }

      .color-picker::-moz-color-swatch {
        border-radius: 50%;
        border: none;
      }
    `;
  }

  changeTextColor(color: string) {
    document.execCommand('foreColor', false, color);
  }

  render() {
    return html`<input type="color" class="color-picker" @input=${(e: any) => this.changeTextColor(e.target.value)}>`;
  }
}

@customElement('video-player')
export class VideoPlayerElement extends LitElement {
  private mediaController: any = null;
  private videoElement: HTMLVideoElement | null = null;
  private currentVideoUrl: string | null = null;
  declare src: string | null;
  declare type: string;
  declare controls: boolean;
  declare autoplay: boolean;
  declare loop: boolean;
  declare muted: boolean;

  static properties = {
    type: { type: String },
    controls: { type: Boolean },
    autoplay: { type: Boolean },
    loop: { type: Boolean },
    muted: { type: Boolean },
  }

  constructor() {
    super()
    this.src = null
    this.type = 'video/mp4'
    this.controls = true
    this.autoplay = false
    this.loop = false
    this.muted = false
  }
 
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    media-controller {
      width: 100%;
      height: 100%;
      --media-control-background: rgba(20, 20, 20, 0.7);
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .controls {
      position: absolute;
      top: 10px;
      right: 10px;
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 10;
      display: flex;
      gap: 10px;
    }
    :host(:hover) .controls {
      opacity: 1;
    } 
    .upload-button, .delete-button {
      display: inline-block;
      border: none;
      border-radius: 5px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      color: #fff;
      cursor: pointer;
      width: 70px;
      height: 30px;
      background: #1e1e1e;
    }
    input[type="file"] {
      display: none;
    }
  `;

  firstUpdated() {
    this.initializePlayer();
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('src') && this.src) {
      this.currentVideoUrl = this.src;
      if (this.videoElement) {
        this.videoElement.src = this.currentVideoUrl;
        this.videoElement.load();
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.currentVideoUrl && this.currentVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.currentVideoUrl);
    }
  }

  private initializePlayer() {
    this.mediaController = this.shadowRoot?.querySelector('media-controller');
    this.videoElement = this.shadowRoot!.querySelector('video');
    console.log('vidautoplay: ', this.autoplay)
  }

  private handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      if (this.currentVideoUrl && this.currentVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentVideoUrl);
      }
      
      this.currentVideoUrl = URL.createObjectURL(file);
      
      if (this.videoElement) {
        this.videoElement.src = this.currentVideoUrl;
        this.videoElement.load();
      }
      
      this.requestUpdate();
    }
  }

  private handleDelete() {
    if (this.currentVideoUrl) {
      if (this.currentVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentVideoUrl);
      }
      this.currentVideoUrl = null;
      if (this.videoElement) {
        this.videoElement.src = '';
      }
      this.requestUpdate();
    }
  }

  render() {
    return html`
      <div class="container">
        <div class="controls">
          <label class="upload-button">
            Upload
            <input type="file" accept="video/*" @change="${this.handleFileUpload}">
          </label>
          ${this.currentVideoUrl ? html`
            <button class="delete-button" @click="${this.handleDelete}">
              Delete
            </button>
          ` : ''}
        </div>
        ${this.currentVideoUrl ? html`
          <media-controller>
            <video
              slot="media"
              preload="auto"
              crossorigin
              playsinline
              src="${this.currentVideoUrl}"
              ?type="${this.type}"
              ?autoplay="${this.autoplay}"
              ?loop="${this.loop}"
              ?muted="${this.muted}"
            >
              <source src="${this.currentVideoUrl}" type="${this.type}">
            </video>
            <media-control-bar>
              <media-play-button></media-play-button>
              <media-seek-backward-button></media-seek-backward-button>
              <media-seek-forward-button></media-seek-forward-button>
              <media-mute-button></media-mute-button>
              <media-volume-range></media-volume-range>
              <media-time-range></media-time-range>
              <media-time-display></media-time-display>
              <media-fullscreen-button></media-fullscreen-button>
            </media-control-bar>
          </media-controller>
        ` : ''}
      </div>
    `;
  }
}

@customElement('tile-editor-panel')
export class TileEditorPanel extends LitElement {
  declare editMode: boolean;
  declare BrowseMode: boolean;
  declare showPanel: boolean;
  declare showListEditor: boolean;

  static properties = {
    editMode: { type: Boolean },
    BrowseMode: { type: Boolean },
    showPanel: { type: Boolean },
    showListEditor: { type: Boolean },
  }

  constructor() {
    super()
    this.editMode = false;
    this.BrowseMode = false;
    this.showPanel = true;
    this.showListEditor = false;
  }
 
  static styles = css`
    :host {
      display: block;
    }
    
    .editor-panel {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: rgba(40, 44, 52, 0.9);
      border-radius: 8px;
      padding: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 200px;
      color: white;
      font-family: Arial, sans-serif;
      transition: transform 0.3s ease;
    }
    
    .editor-panel-hidden {
      transform: translateX(calc(100% + 20px));
    }
    
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
      padding-bottom: 5px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .panel-title {
      font-weight: bold;
      margin: 0;
    }
    
    .toggle-panel-btn {
      position: absolute;
      left: -20px;
      top: 10px;
      width: 20px;
      height: 40px;
      background-color: rgba(40, 44, 52, 0.9);
      border-radius: 4px 0 0 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: white;
    }
    
    .editor-btn {
      padding: 8px 12px;
      background-color: #3a3f4b;
      border: none;
      border-radius: 4px;
      color: white;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    
    .editor-btn:hover {
      background-color: #4a4f5b;
    }
    
    .editor-btn.active {
      background-color: #3498db;
    }
    
    .editor-btn-icon {
      margin-right: 8px;
    }
  `;

  private togglePanel() {
    this.showPanel = !this.showPanel;
    this.dispatchEvent(new CustomEvent('panel-toggle', { 
      detail: { showPanel: this.showPanel },
      bubbles: true, 
      composed: true 
    }));
  }

  private toggleEditMode() {
    this.editMode = !this.editMode;
    this.dispatchEvent(new CustomEvent('edit-mode-toggle', { 
      detail: { editMode: this.editMode },
      bubbles: true, 
      composed: true 
    }));
  }

  private toggleBrowseMode() {
    this.BrowseMode = !this.BrowseMode;
    this.dispatchEvent(new CustomEvent('pan-mode-toggle', { 
      detail: { BrowseMode: this.BrowseMode },
      bubbles: true, 
      composed: true 
    }));
  }

  private navigateToListEditor() {
    this.showListEditor = !this.showListEditor;
    const globalEvent = new CustomEvent('toggle-plot-view', {
      detail: { showListEditor: this.showListEditor }
    });
    window.dispatchEvent(globalEvent);
  }

  render() {
    const BrowseModeActive = this.BrowseMode ? 'active' : '';
    const editModeActive = this.editMode ? 'active' : '';
    const panelHidden = !this.showPanel ? 'editor-panel-hidden' : '';
    
    return html`
      <div class="editor-panel ${panelHidden}">
        <div class="toggle-panel-btn" @click="${this.togglePanel}">
          ${this.showPanel ? '◀' : '▶'}
        </div>
        
        <div class="panel-header">
          <h3 class="panel-title">Tile Editor</h3>
        </div>
        
        <button class="editor-btn ${editModeActive}" @click="${this.toggleEditMode}">
          <span class="editor-btn-icon">✏️</span> Edit Mode
        </button>
        
        <button class="editor-btn ${BrowseModeActive}" @click="${this.toggleBrowseMode}">
          <span class="editor-btn-icon">🖐️</span> Browse Mode
        </button>

        <button class="editor-btn" @click="${this.navigateToListEditor}">
          <span class="editor-btn-icon">📝</span> List Editor
        </button>
      </div>
    `;
  }
}
