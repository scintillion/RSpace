import { LitElement, html, nothing, type PropertyValueMap, css, type PropertyValues } from 'lit';
import { customElement, property} from 'lit/decorators.js';
import { RS1 } from '$lib/RSsvelte.svelte';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import interact from 'interactjs';
import panzoom from 'panzoom';
import { text } from '@sveltejs/kit';
import Splide from '@splidejs/splide';
import {MediaController} from 'media-chrome';

type BackgroundImageState = {
  url: string | null;
  position: string;
  size: number; 
  posX: number; 
  posY: number; 
};

class TileDefBuilder {
  static readonly MasterTDE = new RS1.TDE('T\ta|name:T|inner:|function:|element:div|alert:|image:|BgImage:|drag:|click:true|dblclick:|hold:|swipe:|hover:true|\ts|scale:|position:|top:|left:|width:|height:|display:block|flex-direction:column|align-items:center|justify-content:center|background:black|background-image:url("")|background-position:center center|background-repeat:no-repeat|background-size:cover|\t');
  static readonly ButtonTDE = this.listMerge(this.MasterTDE, new RS1.TDE('Btn\ta|name:Button|element:button|type:|value:|\ts|cursor:pointer|\t'))
  static readonly RoundButtonTDE = this.listMerge(this.ButtonTDE, new RS1.TDE('RndBtn\ta|name:RoundButton|\ts|border-radius:25px|\t'));
  static readonly InnerTextTDE = this.listMerge(this.MasterTDE, new RS1.TDE('Txt\ta|name:TextEdit|text:true|textPreview:true|innerEdit:true|\ts|\t'));
  static readonly ImageCarouselTDE = this.listMerge(this.MasterTDE, new RS1.TDE('Carousel\ta|name:ImageCarousel|function:Carousel|event:Swipe|\ts|\t'));
  static readonly InputTDE = this.listMerge(this.MasterTDE, new RS1.TDE('Input\ta|name:Input|function:Input|input-required:|input-type:|input-maxlength:|input-min:|input-max:|input-pattern:|input-step:|input-placeholder:|input-title:|input-readonly:|input-disabled:|input-autocomplete:|input-autofocus:|input-multiple:|input-novalidate:|\ts|\t'));
  static readonly VideoPlayerTDE = this.listMerge(this.MasterTDE, new RS1.TDE('Video\ta|name:VideoPlayer|function:VideoPlayer|video-src:|video-type:|video-controls:true|video-autoplay:false|video-loop:false|video-muted:false|\ts|\t'));

  static listMerge(A: RS1.TDE, B: RS1.TDE): RS1.TDE {
    const style = A.sList?.copy() as RS1.qList;
    const attr = A.aList?.copy() as RS1.qList;
    style?.merge(B.sList);
    attr?.merge(B.aList);
    B.sList = style;
    B.aList = attr;
    return B;
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

  static NewInstance = (tile:RS1.TDE) => {

      switch(tile.TList?.listName.replace(/^\s+/, '')) {
        case 'T':
          this.listMerge(this.MasterTDE, tile);
          break;

        case 'Btn':
          this.listMerge(this.ButtonTDE, tile);
        
          break;

        case 'RndBtn':
          this.listMerge(this.RoundButtonTDE, tile);
          break;

        case 'Txt':
          this.listMerge(this.InnerTextTDE, tile);
          break;  

        case 'Carousel':
          this.listMerge(this.ImageCarouselTDE, tile);
          break;

        case 'Input':
          this.listMerge(this.InputTDE, tile);
          break;

        case 'Video':
          this.listMerge(this.VideoPlayerTDE, tile);
          break;
      }
  }
}


@customElement('r-tile')
export class RTile extends LitElement {
  declare TList: RS1.TileList;
  declare tile: RS1.TDE;
 
  declare _panToggle: boolean;
  declare _panAxis: string;

  private declare _isTextPreview: boolean;
  private _textEditContent: string = '' ;

  private declare _backgroundImageState: BackgroundImageState; 
  private declare _isEditBg: boolean;
  private _bgControlsInitialized: boolean = false;

  static properties = {
    _panToggle: { type: Boolean },
    _panAxis: { type: String },
    TList: { type: Object },
    _isTextPreview: { type: Boolean },
    _backgroundImageState: { type: Object },
     _isEditBg: { type: Boolean },
  };

  constructor() {
    super();
    this._panToggle = false;
    this._panAxis = 'x';
    this._isTextPreview = true;
    this._backgroundImageState = { 
      url: null, 
      position: 'center center',
      size: 100, 
      posX: 50, 
      posY: 50  
    };
    this._isEditBg = false;
  }

  handleTilePlacemant(tile: RS1.TDE) {
    const id = `tile${this.TList.tiles.indexOf(tile)}`;
    const element = this.shadowRoot?.getElementById(id);
    console.log('interaction id ' + id);

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
              if (this._isEditBg) {
                event.interaction.stop();
                return;
              }
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
              if (this._isEditBg) {
                event.interaction.stop();
                return;
              }
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

private setupTileInteractions(tile: RS1.TDE) {
  const element = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(tile)}`);

  if (!element) return;


  interact(element).unset();

  const isSwipe = tile.aList.descByName('swipe');
  const isHold = tile.aList.descByName('hold');

 
    if(isSwipe === 'true'){
      // interact(element).draggable({
      //   inertia: true,
      //   listeners:{
      //     move: (event) => {},
      //     end: (event) => {
      //       if (event.speed > 300) {
      //         if (Math.abs(event.velocityX) > Math.abs(event.velocityY)) {
      //           this.handleSwipe(tile, event.velocityX > 0 ? 1 : -1)
      //           console.log('swipe left')
      //         }
      //         else {
      //           this.handleSwipe(tile, event.velocityY > 0 ? 2 : -2)
      //           console.log('swipe right')
      //         }
      //       }
      //     }
      //   }
      // })
      
      // interact(element)
      // .draggable({
      //   inertia: true,
      //   modifiers: [
      //     interact.modifiers.restrictRect({
      //       restriction: 'parent',
      //       endOnly: true
      //     })
      //   ],
      //   autoScroll: true,
      //   onmove: (event) => {},
      //   onend: (event) => {
      //     const swipe = event.swipe || (event.getSwipe && event.getSwipe());
      //     if (swipe) {
      //       if (swipe.left) {
      //         console.log('Swiped left');
      //       } else if (swipe.right) {
      //         console.log('Swiped right');
      //       } else if (swipe.up) {
      //         console.log('Swiped up');
      //       } else if (swipe.down) {
      //         console.log('Swiped down');
      //       }
      //     }
      //   }
      // })
    }

    if (isHold === 'true') {
      interact(element)
      .on('hold', () => {
          this.handleLongPress(tile);
      });
  }
}

  handleClick(tile: RS1.TDE) {
    const tileFunction = tile.aList?.descByName('function');
    const alertContent = tile.aList?.descByName('alert');
    const redirectLink = tile.aList?.descByName('redirect');
    const isDrag = tile.aList?.descByName('drag');
    const isLink = tile.aList?.descByName('link');
    const textEditor = this.shadowRoot?.getElementById('text-box');

    switch (tileFunction) {
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
          this.dispatchEvent(new CustomEvent('format-text', {
            detail: { command: 'bold' },
            bubbles: true,
            composed: true 
          }));
          break;
        
        case 'Italic':
          this.dispatchEvent(new CustomEvent('format-text', {
            detail: { command: 'italic' },
            bubbles: true,
            composed: true
          }));
          break;
        
        case 'Underline':
          this.dispatchEvent(new CustomEvent('format-text', {
            detail: { command: 'underline' },
            bubbles: true,
            composed: true
          }));
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
      this.handleTilePlacemant(tile);
      }
    } 

    if (isDrag === "false") {
      const element = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(tile)}`);
      if (element) {
        interact(element).unset(); 
      }
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
  const modifiedTList = this.TList

  this.dispatchEvent(
    new CustomEvent('tile-deleted', {
      detail: { tileIndex, modifiedTList},
      bubbles: true,
      composed: true
    })
  );

  this.requestUpdate();
}

  private handleBackgroundImageUpload(event: Event, tile: RS1.TDE) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    const bgImageVID = tile.sList?.getVID('background-image');
    const bgPositionVID = tile.sList?.getVID('background-position');
    const bgSizeVID = tile.sList?.getVID('background-size');

    if (files !== null && files.length > 0 && bgImageVID) {
      try {
        const file = files[0];
        if (!file.type.startsWith('image/')) {
          alert('Only image files are allowed');
          return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const imageUrl = `url("${e.target?.result}")`;
          bgImageVID.Desc = imageUrl;
          tile.sList?.setVID(bgImageVID);

          if (bgPositionVID) {
            bgPositionVID.Desc = 'center center';
            tile.sList?.setVID(bgPositionVID);
          }
          
          if (bgSizeVID) {
            bgSizeVID.Desc = 'cover';
            tile.sList?.setVID(bgSizeVID);
          }
          
          this._backgroundImageState = {
            ...this._backgroundImageState,
            url: imageUrl
          }
        }
      } catch (error) {
        console.error('Error uploading background image:', error);
      }
    }
  }

  private handleRemoveBackgroundImage(tile: RS1.TDE) {
    const bgImageVID = tile.sList?.getVID('background-image');
    if (bgImageVID) {
      bgImageVID.Desc = 'url("")'; 
      tile.sList?.setVID(bgImageVID);
      this._backgroundImageState = { ...this._backgroundImageState, url: null };
    }
  }

  private triggerBgImageUpload(tile: RS1.TDE) {
    this._isEditBg = true;
    const tileIndex = this.TList.tiles.indexOf(tile);
    const input = this.shadowRoot?.getElementById(`bg-file-upload-${tileIndex}`) as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  private setupBackgroundControls(tileId: string) {
    const bgController = this.shadowRoot?.querySelector(`#tile${tileId} .bg-controller`) as HTMLElement;
    const resizeHandle = this.shadowRoot?.querySelector(`#tile${tileId} .resize-handle`) as HTMLElement;
    
    if (!bgController || !resizeHandle) return;
    
    interact(bgController).unset();
    interact(resizeHandle).unset();

    interact(bgController).draggable({
      listeners: {
        start: (event) => {
          event.target.dataset.startPosX = this._backgroundImageState.posX.toString();
          event.target.dataset.startPosY = this._backgroundImageState.posY.toString();
        },

        move: (event) => {
          if (this._panToggle) {
            event.interaction.stop();
            return;
          }
          
          const tileElement = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(this.tile)}`);
          if (!tileElement) return;
          
          const startPosX = parseFloat(event.target.dataset.startPosX || '50');
          const startPosY = parseFloat(event.target.dataset.startPosY || '50');
          
          const containerWidth = tileElement.clientWidth;
          const containerHeight = tileElement.clientHeight;
          
          const deltaPercentX = -(event.dx / containerWidth) * 100;
          const deltaPercentY = -(event.dy / containerHeight) * 100;

          const newPosX = Math.max(0, Math.min(100, startPosX + deltaPercentX));
          const newPosY = Math.max(0, Math.min(100, startPosY + deltaPercentY));
          
          this._backgroundImageState.posX = newPosX;
          this._backgroundImageState.posY = newPosY;


          tileElement.style.backgroundPosition = `${newPosX}% ${newPosY}%`;

          event.target.dataset.startPosX = this._backgroundImageState.posX.toString();
          event.target.dataset.startPosY = this._backgroundImageState.posY.toString();
          
        },

        end: (event) => {

        }
      }
    });
  
    interact(resizeHandle).draggable({
      listeners: {
        start: (event) => {
          event.target.dataset.startSize = this._backgroundImageState.size.toString();
          event.target.dataset.startX = event.clientX.toString();
          event.target.dataset.startY = event.clientY.toString();
        },
      
        move: (event) => {
            if (this._panToggle) {
              event.interaction.stop();
              return;
            }
          
          const tileElement = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(this.tile)}`);
          if (!tileElement) return;
          
          const startSize = parseFloat(event.target.dataset.startSize || '100');
          const startX = parseFloat(event.target.dataset.startX || '0');
          const startY = parseFloat(event.target.dataset.startY || '0');
          
          const totalDeltaX = event.clientX - startX;
          const totalDeltaY = event.clientY - startY;
          
          const diagonalDelta = (totalDeltaX + totalDeltaY) / 2;
          
          const containerSize = Math.min(tileElement.clientWidth, tileElement.clientHeight);
          const deltaPercent = (diagonalDelta / containerSize) * 100;
          
          const newSize = Math.max(50, Math.min(300, startSize + deltaPercent));

          this._backgroundImageState.size = newSize;
        
          tileElement.style.backgroundSize = `${newSize}%`;

          event.target.dataset.startSize = this._backgroundImageState.size.toString();
          event.target.dataset.startX = event.clientX.toString();
          event.target.dataset.startY = event.clientY.toString();
        },
        
        end: (event) => {
        
        }
      }
    });
  }

  private updateBackgroundStyles(tile: RS1.TDE) {
    if (!this._backgroundImageState.url) return;
    
    const bgImageVID = tile.sList?.getVID('background-image');
    const bgSizeVID = tile.sList?.getVID('background-size');
    const bgPositionVID = tile.sList?.getVID('background-position');
    
    if (bgImageVID) {
      bgImageVID.Desc = this._backgroundImageState.url;
      tile.sList?.setVID(bgImageVID);
    }
    
    if (bgSizeVID) {
      bgSizeVID.Desc =  `${this._backgroundImageState.size !== 100 ? `${this._backgroundImageState.size}%` : 'cover' }`;
      tile.sList?.setVID(bgSizeVID);
    } 
    
    if (bgPositionVID) {
      bgPositionVID.Desc = `${this._backgroundImageState.posX}% ${this._backgroundImageState.posY}%`;
      tile.sList?.setVID(bgPositionVID);
    }
    
  }

  renderDivs(tile: RS1.TDE): any {
    const innerContent = tile.aList?.descByName('inner') || '';
    const elementType = tile.aList?.descByName('element');
    const tileFunction = tile.aList?.descByName('function');
    const parentTile = this.TList.tiles[tile.parent];
    // const isText = tile.aList?.descByName('text');
    const isInnerEdit = tile.aList?.descByName('innerEdit');
    const displayVID = tile.sList?.getVID('display');
    const istextPreview = tile.aList?.descByName('textPreview');
    const textPreviewVID = tile.aList?.getVID('textPreview');
    let styleStr = tile.sList?.toVIDList(";");
    let childrenHtml = html``;
    const tileIndex = this.TList.tiles.indexOf(tile);

    const currentBgUrl = tile.sList?.descByName('background-image');
    const currentBgPos = tile.sList?.descByName('background-position'); 
    const currentBgSize = tile.sList?.descByName('background-size'); 
    
    if (currentBgUrl && currentBgUrl !== 'url("")') {
         let posX = 50;
         let posY = 50;
         let size = 100;
         
         if (currentBgPos) {
           const posValues = currentBgPos.trim().split(' ');
           if (posValues.length >= 2) {
             const xPos = posValues[0];
             const yPos = posValues[1];
             
             if (xPos.endsWith('%')) {
               posX = parseFloat(xPos);
             }
             if (yPos.endsWith('%')) {
               posY = parseFloat(yPos);
             }
           }
         }
         
         if (currentBgSize && currentBgSize.endsWith('%')) {
           size = parseFloat(currentBgSize);
         } else if (currentBgSize === 'cover') {
           size = 100;
         }
         
         this._backgroundImageState = { 
           url: currentBgUrl, 
           position: currentBgPos,
           size: size,
           posX: posX, 
           posY: posY 
         };
      }


    const innerContentHTMLEditable = () => {
          if (istextPreview === "false") {
            return html`
            <div
            id="text-edit"
            contenteditable="true"
            placeholder="Enter text here"
            @input="${(e: Event) => {
              console.log('inputx' + innerContent) 
              this._textEditContent = (e.target as HTMLDivElement).textContent || '';
            }}"
            style="background: white; border: none; color: black; resize: both; overflow: auto; min-height: 50px; min-width: 150px; cursor: text ; ">
            ${(innerContent)}
            </div> 
             <button class="system-button" 
                style="border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;"
                @click="${() => {
                  const parentInnerVID = tile.aList?.getVID('inner');
                  const textPreviewVID = tile.aList?.getVID('textPreview');
          
                  if (parentInnerVID) {
                    parentInnerVID.Desc = this._textEditContent;
                    tile.aList?.setVID(parentInnerVID);
                  }
            
                  if (textPreviewVID) {
                    textPreviewVID.Desc = 'true';
                    tile.aList?.setVID(textPreviewVID);
                  }
            
                  this._isTextPreview = true;
                
                }}">
                Save
              </button>
         `;
          }

          else if (istextPreview === "true") {
            return html`
              <div
              id="text-edit2"
              contenteditable="false" 
              @click="${() =>  {
                if (!this._panToggle) {
                 textPreviewVID.Desc = "false";
              tile.aList?.setVID(textPreviewVID);
              this._isTextPreview = false;}}}"
              style="background: transparent; border: none; color: white;">
              ${unsafeHTML(innerContent)}
              </div>
             
              
            `;
          }
          if (!this._panToggle) {
               textPreviewVID.Desc = "true";
              tile.aList?.setVID(textPreviewVID);
              this._isTextPreview = true;
          } 
      }

    const innerContentHTML = isInnerEdit === 'true' ? innerContentHTMLEditable() : unsafeHTML(innerContent);

    switch (tileFunction) {
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
            style="background: white; border: none; color: black; resize: both; overflow: auto; min-height: 50px; min-width: 150px; cursor: text ; "
            @focus="${() => {
              this.dispatchEvent(new CustomEvent('text-box-interaction', {
                bubbles: true,
                composed: true,
              }))
            }}"
            @blur="${() => {
              this.dispatchEvent(new CustomEvent('text-box-interaction-over', {
                bubbles: true,
                composed: true,
              }))
            }}">
            </div> `;
          break;
          
        case 'Carousel':
          const tileIndexCarousel = this.TList.tiles.indexOf(tile);
          childrenHtml = html`
            <image-carousel
              id="tile${tileIndexCarousel}"
              class="tile"
              style="position: relative; ${styleStr}"
              .tileIndex="${tileIndexCarousel}"
              .canDelete="${tileIndexCarousel !== 1}"
              @delete-tile="${() => this.deleteTile(tile)}">
            </image-carousel>          
          `;
          return childrenHtml;
          break;

        case 'Input':
          // const submitButton = new RS1.TDE('Btn\ta|name:Submit|element:button|inner:Submit|type:submit|\ts|width:70px|height:30px|background:#1e1e1e|color:white|\t')
          const submitButton = TileDefBuilder.modifyTDE(TileDefBuilder.ButtonTDE, {
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

    switch (elementType) {
      case 'div':
        const isBgImage = tile.aList?.descByName('BgImage');
        const bgControls = (!this._panToggle) ? html`
          <div class="background-controls" style="position: absolute; opacity:0; top: 50px; right: 10px; display: flex; flex-direction: column; gap: 5px; z-index: 11;">
            <input
              type="file"
              id="bg-file-upload-${tileIndex}"
              style="display: none;"
              accept="image/*"
              @change=${(e: Event) => this.handleBackgroundImageUpload(e, tile)}
            />
            ${this._isEditBg ? html`
              ${this._backgroundImageState.url ? html`
                <button class="system-button" style=" display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;" @click=${() => this.triggerBgImageUpload(tile)}>Replace</button>
                <button class="system-button" style=" display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;" @click=${() => this.handleRemoveBackgroundImage(tile)}>Remove</button>
                <button class="system-button" style=" display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;" @click=${() => {this.updateBackgroundStyles(tile); this._isEditBg = false}}>Done</button>
              ` : html`
                <button class="system-button" style=" display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;" @click=${() => this.triggerBgImageUpload(tile)}>Upload</button>
                <button class="system-button" style=" display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;" @click=${() => {this.updateBackgroundStyles(tile); this._isEditBg = false}}>Done</button>
              `}
            ` : html`
              <button class="system-button" style=" display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 100px; height: 30px; background: #1e1e1e;" @click=${() => this._isEditBg = true}>Background</button>
            `}
            
          </div>
        ` : '';

        const bgController = (!this._panToggle && this._backgroundImageState.url && this._isEditBg) ? html`
          <div 
            class="bg-controller" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: move; z-index: 5; background-color: rgba(255, 255, 255, 0.1);"
          ></div>
          <div 
            class="resize-handle" 
            style="position: absolute; bottom: 10px; right: 10px; width: 12px; height: 12px; background-color: #3498db; border: 2px solid white; border-radius: 50%; z-index: 15; cursor: se-resize;"
          ></div>
        ` : '';

        return html`<div id="tile${tileIndex}" class="tile" style="${styleStr}"
          @click="${(e: Event) => {
            e.stopPropagation();
            this.handleClick(tile)
          }
        }" 
          @mouseenter="${(e: Event) => {
            e.stopPropagation();
            this.handleHover(tile, true);
            const button = (e.currentTarget as HTMLElement).querySelector(':scope > .delete-button');
            if (button) {
              if (this._panToggle)  (button as HTMLElement).style.opacity = '1';
              else (button as HTMLButtonElement).disabled = true
            }
            const bgControlsElement = (e.currentTarget as HTMLElement).querySelector(':scope > .background-controls');
            if (bgControlsElement) {
              if (!this._panToggle) (bgControlsElement as HTMLElement).style.opacity = '1';
              else (bgControlsElement as HTMLButtonElement).disabled = true
            }
          }}"
          @mouseleave="${(e: Event) => {
            e.stopPropagation();
            this.handleHover(tile, false);
            const button = (e.currentTarget as HTMLElement).querySelector(':scope > .delete-button');
            if (button) (button as HTMLElement).style.opacity = '0';
            const bgControlsElement = (e.currentTarget as HTMLElement).querySelector(':scope > .background-controls');
            if (bgControlsElement) (bgControlsElement as HTMLElement).style.opacity = '0';
          }}"
          @dblclick="${(e: Event) => { 
            e.stopPropagation();
            this.handleDoubleClick(tile)
          }
        }"
          @format-text="${(e: CustomEvent) => { 
            const targetTextBox = this.shadowRoot?.getElementById('text-box') as HTMLDivElement | null;
            if (targetTextBox) {
              const command = e.detail.command;
              document.execCommand(command, false);
              e.stopPropagation(); 
            }
          }
        }">
          ${innerContentHTML}${childrenHtml}
          ${isBgImage ==='true' ? html`${bgControls}${bgController}` : nothing}
           <slot></slot>
          ${tileIndex !== 1 ? html`
            <button class="delete-button" 
              style="position: absolute; top: 10px; right: 10px; opacity: 0; transition: opacity 0.3s; z-index: 10; display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;"
              @click="${() => this.deleteTile(tile)}">
              Delete
            </button>
          ` : ''}
        </div>`;
      case 'button': 
        return childrenHtml = html`<button id="tile${this.TList.tiles.indexOf(tile)}" @click="${(e: Event) => {
          // e.stopPropagation();
          this.handleClick(tile)
        }}" type="${tile.aList?.getVID('type')?.Desc}" value="${tile.aList?.getVID('value')?.Desc}" class="button" style="${styleStr}">${innerContentHTML}</button>`;
    }
  }

  render() {
    return html`
      ${this.renderDivs(this.tile)}
    `;
  }

  handleDoubleClick(tile: RS1.TDE) {
    console.log('Double click detected on tile:', tile.aList?.descByName('name'));
  
    const tileIndex = this.TList.tiles.indexOf(tile);
    const element = this.shadowRoot?.getElementById(`tile${tileIndex}`);
    
    if (element) {

    }
  }
  
  handleHover(tile: RS1.TDE, isEnter: boolean) {
    const tileIndex = this.TList.tiles.indexOf(tile);
    const element = this.shadowRoot?.getElementById(`tile${tileIndex}`);
    // console.log('Hover detected on tile:', tile.aList?.descByName('name'));
    
    if (!element || this._panToggle) return;
    
    if (isEnter) {
      const hover = tile.aList?.descByName('hover');

      if (hover === 'true') {
        element.style.transition = 'filter 0.3s ease';
        element.style.filter = 'brightness(1.2)';
        element.style.transition = 'box-shadow 0.3s ease';
        element.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.7)';
      }
      
    } else {
        element.style.filter = '';
        element.style.boxShadow = '';
    }
  }
  
  handleSwipe(tile: RS1.TDE, direction: number) {
    console.log('Swipe detected on tile:', tile.aList?.descByName('name'), 'Direction:', direction);
  }
  
  handleLongPress(tile: RS1.TDE) {
    console.log('Long press detected on tile:', tile.aList?.descByName('name'));
  }

  firstUpdated(changedProperties: PropertyValueMap<any>): void {
    super.firstUpdated(changedProperties);
    this.setupTileInteractions(this.tile);
    this.handleTilePlacemant(this.tile);
  }

  updated(changedProperties: PropertyValueMap<any>): void {
    super.updated(changedProperties);

    // if (this._currentTile && this._panToggle) {
    //   const element = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(this.tile)}`);
    //   if (element) {
    //     interact(element).unset(); 
    //   }
    // }

    if (changedProperties.has('tile') || changedProperties.has('_panToggle')) {
      const element = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(this.tile)}`);
      if (element) {
        this.setupTileInteractions(this.tile);
      }
    }

    if (this._panToggle) {
      const textPreviewVID = this.tile.aList?.getVID('textPreview');
      if (textPreviewVID && textPreviewVID.Desc === 'false') {
        console.log(`Tile '${this.tile.aList?.descByName('name')}': Forcing textPreview to false because panToggle is enabled.`);
        textPreviewVID.Desc = 'true';
        this.tile.aList?.setVID(textPreviewVID);
        this._isTextPreview = true;
      }
    }

    if (changedProperties.has('_backgroundImageState')) {
      const oldState = changedProperties.get('_backgroundImageState') as BackgroundImageState;
      if (oldState?.url !== this._backgroundImageState.url) {
        this._bgControlsInitialized = false;
      }
    }
  
    if ((changedProperties.has('_isEditBg') || changedProperties.has('_backgroundImageState')) && 
        this._backgroundImageState.url && 
        this._isEditBg && 
        !this._bgControlsInitialized) {
      this._bgControlsInitialized = true;
      this.setupBackgroundControls(this.TList.tiles.indexOf(this.tile).toString());
    } else if (!this._isEditBg) {
      this._bgControlsInitialized = false;
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    const element = this.shadowRoot?.getElementById(`tile${this.TList.tiles.indexOf(this.tile)}`);
    if (element) {
      interact(element).unset();
      
      const bgController = element.querySelector('.bg-controller') as HTMLElement;
      const resizeHandle = element.querySelector('.resize-handle') as HTMLElement;
      
      if (bgController) {interact(bgController).unset()};
      if (resizeHandle) interact(resizeHandle).unset();
    }
  }

  shouldUpdate(changedProperties: PropertyValueMap<any>): boolean {
    console.log('Changed properties:', [...changedProperties.keys()]); 
    return super.shouldUpdate(changedProperties);
  }

  willUpdate(changedProperties: PropertyValues): void {
    TileDefBuilder.NewInstance(this.tile)
  }
}

@customElement ('tile-list-renderer')
export class TileListRenderer extends LitElement {
 
  declare TList: RS1.TileList;
  declare _panToggle: boolean;
  declare showEditorPanel: boolean;
  declare showListEditor: boolean;
  private isInteractingWithCarousel = false;
  private isInteractingwithTextBox = false

  static properties = {
    TList: { type: Object },
    _panToggle: { type: Boolean},
    showEditorPanel: { type: Boolean},
    showListEditor: { type: Boolean},
  };

  constructor() {
      super();
    this.TList = new RS1.TileList('');
    this._panToggle = false;
  }

  private renderTileAndChildren(tile: RS1.TDE | undefined): any {
    if (!tile) {
      return html``;
    }

    const childElements = []; 
    let currentChildIndex = tile.first; 

    while (currentChildIndex !== undefined && currentChildIndex !== -1 && currentChildIndex < this.TList.tiles.length) {
        const childTile = this.TList.tiles[currentChildIndex]; 

        if (childTile) {
             childElements.push(this.renderTileAndChildren(childTile));
        } else {
            break;
        }

        currentChildIndex = childTile.next; 
    }
  
    return html`
      <r-tile
        .tile=${tile}
        .TList=${this.TList}
        ._panToggle=${this._panToggle}
        .showListEditor=${this.showListEditor}
        @tile-deleted=${this.handleTileDeletion}
      >
        ${childElements}
      </r-tile>
    `;
  }

  private handleBackgroundPan() {
    const element = this.shadowRoot?.getElementById('tile-container');
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
            if (!this._panToggle) return;
          
            if (this.isInteractingWithCarousel) {
              event.interaction.stop();
              this.isInteractingWithCarousel = false;
              return;
            }
            if (this.isInteractingwithTextBox) {
              event.interaction.stop();
              return;
            }
          
            xPos += event.dx;
            yPos += event.dy;
            element.style.transform = `translate(${xPos}px, ${yPos}px)`;
          }
        },
        modifiers: [
            interact.modifiers.restrict({
                restriction: 'parent',
                endOnly: true
            })
        ],
        inertia: true,
        // startAxis: this._panAxis as 'x' | 'y' | 'xy',
        lockAxis: 'start'
      });

      interact(element).styleCursor(false);
    }
    else {
      console.warn('base tile not found')
    }
  }

  private handleEditModeToggle(e: CustomEvent) {
    if (e.detail.editMode) {
      this._panToggle = false;
    }
    this.requestUpdate();
  }
  
  private handleBrowseModeToggle(e: CustomEvent) {
    this._panToggle = e.detail.BrowseMode;
    if (this._panToggle) {
      // this._editMode = false;
    }
    this.requestUpdate();
  }
  
  private handlePanelToggle(e: CustomEvent) {
    this.showEditorPanel = e.detail.showPanel;
    this.requestUpdate();
  }

  private handleTileDeletion(event: CustomEvent) {
    this.TList = event.detail.modifiedTList
    this.requestUpdate();
  }


  render() {
    if (!this.TList || !this.TList.tiles) {
        return html`<p>No TileList found.</p>`;
    }

    const topLevelTiles = this.TList.tiles.filter(tile => !tile.parent);

    if (topLevelTiles.length === 0) {
        return html`<p>No top-level tiles found.</p>`;
    }

    return html`
     <div id="tile-container" style="width: 100%; height: 100%; overflow: hidden; position: relative;">
      ${topLevelTiles.map(tile => this.renderTileAndChildren(tile))}
      </div>
       <tile-editor-panel
        ?BrowseMode=${this._panToggle}
        ?showPanel=${this.showEditorPanel}
        ?showListEditor=${this.showListEditor}
        @edit-mode-toggle=${this.handleEditModeToggle}
        @pan-mode-toggle=${this.handleBrowseModeToggle}
        @panel-toggle=${this.handlePanelToggle}
      ></tile-editor-panel>
    `;
  }

  protected firstUpdated(): void {
    this.handleBackgroundPan();
  }

  protected updated(_changedProperties: PropertyValues): void {
    this.addEventListener('carousel-interaction', () => {
      this.isInteractingWithCarousel = true;
    });
    this.addEventListener('text-box-interaction', () => {
      this.isInteractingwithTextBox = true;
      console.log('focus event')
    });
    this.addEventListener('text-box-interaction-over', () => {
      this.isInteractingwithTextBox = false;
      console.log('focus event')
    });
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
    this.handlePointerDown();
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

  handlePointerDown() {
    this.addEventListener('pointerdown', (e) => {
      if (this.images.length > 0) {
        this.dispatchEvent(new CustomEvent('carousel-interaction', {
          bubbles: true,
          composed: true,
        }));
      }
    }); 
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
    if (this.editMode) {
      return;
    }
    this.editMode = true;
    this.BrowseMode = false;
    // this.editMode = !this.editMode;
    this.dispatchEvent(new CustomEvent('edit-mode-toggle', { 
      detail: { editMode: this.editMode },
      bubbles: true, 
      composed: true 
    }));
  }

  private toggleBrowseMode() {
    if (this.BrowseMode) return;
    this.editMode = false;
    this.BrowseMode = true;
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
