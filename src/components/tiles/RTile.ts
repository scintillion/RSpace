import { LitElement, html, nothing, type PropertyValueMap, css, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property} from 'lit/decorators.js';
import { RS1 } from '$lib/RS';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import interact from 'interactjs';
import panzoom from 'panzoom';
import { text } from '@sveltejs/kit';
import Splide from '@splidejs/splide';
import {MediaController} from 'media-chrome';
import { tileComm, type TileMessage } from '../../stores/tileDataStore.js';

type BackgroundImageState = {
  url: string | null;
  position: string;
  size: number; 
  posX: number; 
  posY: number; 
};

class TileDefBuilder {
  static readonly MasterTDE = new RS1.TDE('T\ta|name:T|inner:|innerEdit:false|function:|element:div|alert:|image:|BgImage:|drag:|dragAxis:xy|resize:true|click:true|clickAction:|dblclick:|dblclickAction:|hold:|holdAction:|swipe:|swipeAction:|hover:true|hoverAction:|\ts|scale:|position:|top:|left:|width:|height:|display:block|flex-direction:column|align-items:center|justify-content:center|background:black|background-image:url("")|background-position:center center|background-repeat:no-repeat|background-size:cover|border-radius:0px|border:none|border-color:transparent|border-width:0px|border-style:solid|box-shadow:none|box-sizing:border-box|cursor:default|\t'); 
  static readonly ButtonTDE = this.listMerge(this.MasterTDE, new RS1.TDE('Btn\ta|name:Button|element:button|type:|value:|\ts|cursor:pointer|\t'))
  static readonly RoundButtonTDE = this.listMerge(this.ButtonTDE, new RS1.TDE('RndBtn\ta|name:RoundButton|\ts|border-radius:25px|\t'));
  static readonly InnerTextTDE = this.listMerge(this.MasterTDE, new RS1.TDE('Txt\ta|name:TextEdit|text:true|textPreview:true|innerEdit:true|\ts|\t'));
  static readonly ImageCarouselTDE = this.listMerge(this.MasterTDE, new RS1.TDE('Carousel\ta|name:ImageCarousel|function:Carousel|event:Swipe|\ts|\t'));
  static readonly InputTDE = this.listMerge(this.MasterTDE, new RS1.TDE('Input\ta|name:Input|function:Input|input-required:|input-type:|input-maxlength:|input-min:|input-max:|input-pattern:|input-step:|input-placeholder:|input-title:|input-readonly:|input-disabled:|input-autocomplete:|input-autofocus:|input-multiple:|input-novalidate:|\ts|\t'));
  static readonly VideoPlayerTDE = this.listMerge(this.MasterTDE, new RS1.TDE('Video\ta|name:VideoPlayer|function:VideoPlayer|video-src:|video-type:|video-controls:true|video-autoplay:false|video-loop:false|video-muted:false|\ts|\t'));
  static readonly ColorPickerTDE = this.listMerge(this.MasterTDE, new RS1.TDE('ColorPicker\ta|name:ColorPicker|color:|color-picker-type:|color-picker-format:|color-picker-opacity:|color-picker-alpha:|color-picker-presets:|color-picker-palette:|color-picker-swatches:|color-picker-opacity-type:|color-picker-opacity-format:|color-picker-opacity-presets:|color-picker-opacity-palette:|color-picker-opacity-swatches:|\ts|\t'));
  static readonly IframeTDE = this.listMerge(this.MasterTDE, new RS1.TDE('Iframe\ta|name:Iframe|iframe-src:|iframe-title:|iframe-sandbox:allow-same-origin allow-scripts allow-popups allow-forms|iframe-loading:lazy|iframe-referrerpolicy:no-referrer|iframe-allow:|iframe-width:|iframe-height:|iframe-scrolling:auto|\ts|\t'));
  static readonly TimerTDE = this.listMerge(this.MasterTDE, new RS1.TDE('Timer\ta|name:Timer|function:Timer|timer-duration:300|timer-mode:countdown|timer-sound:true|\ts|\t'));

  static listMerge(A: RS1.TDE, B: RS1.TDE): RS1.TDE {
    const style = A.sList?.copy() as RS1.qList;
    const attr = A.aList?.copy() as RS1.qList;
    style?.qMerge(B.sList as RS1.qList);
    attr?.qMerge(B.aList as RS1.qList);
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

  static newTDEInstance = (tile:RS1.TDE) => {

      switch(tile.tileID?.tname) {
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

        case 'ColorPicker':
          this.listMerge(this.ColorPickerTDE, tile);
          break;

        case 'Iframe':
          this.listMerge(this.IframeTDE, tile);
          break;

        case 'Timer':
          this.listMerge(this.TimerTDE, tile);
          break;

        default:
          console.warn('No tile type found');
          break;
      }
  }
}


@customElement('r-tile')
export class RTile extends LitElement {
  declare TList: RS1.TileList;
  declare tile: RS1.TDE;

  private tileId: string;
  private tileElement: HTMLElement | null;
 
  declare editMode: boolean;
  declare _panAxis: string;

  private declare _isTextPreview: boolean;
  private _textEditContent: string = '' ;

  private declare _backgroundImageState: BackgroundImageState; 
  private declare _isEditBg: boolean;
  private _bgControlsInitialized: boolean = false;

  private _unsubscribeMessageStore: (() => void) | null = null;

  static properties = {
    editMode: { type: Boolean },
    _panAxis: { type: String },
    TList: { type: Object },
    _isTextPreview: { type: Boolean },
    _backgroundImageState: { type: Object },
    _isEditBg: { type: Boolean },
  };

  constructor() {
    super();
    this.tileElement = null;
    this.tileId = '';
    this.editMode = false;
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
    this._bgControlsInitialized = false;
    this._unsubscribeMessageStore = null;
  }
  
  firstUpdated(changedProperties: PropertyValueMap<any>): void {
    super.firstUpdated(changedProperties);
    const tileId = this.TList.tiles.indexOf(this.tile).toString()
    if (tileId) {
        this.tileElement = this.shadowRoot?.getElementById(`tile${tileId}`) ?? null;
    }
  
    if (!this.tileElement) {
        console.warn(`Element with ID 'tile${tileId}' not found in shadowRoot.`);
    }
   
    this.setupTileInteractions(this.tile);
    this.setupMessaging();
  }

  updated(changedProperties: PropertyValueMap<any>): void {
    super.updated(changedProperties);

    if (changedProperties.has('tile') || changedProperties.has('editMode')) {
      const element = this.tileElement;

      if (element) {
        this.setupTileInteractions(this.tile);
      }

      if (changedProperties.has('editMode') && !this.editMode) {
        const textPreviewVID = this.tile.aList?.getVID('textPreview');
        if (textPreviewVID && textPreviewVID.Desc === 'false') {
          textPreviewVID.Desc = 'true';
          this.tile.aList?.setVID(textPreviewVID);
          this._isTextPreview = true;
        }
        this._isEditBg = false;
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
    const element = this.tileElement;
    if (element) {
      interact(element).unset();
      
      const bgController = element.querySelector('.bg-controller') as HTMLElement;
      const resizeHandle = element.querySelector('.resize-handle') as HTMLElement;
      
      if (bgController) {interact(bgController).unset()};
      if (resizeHandle) interact(resizeHandle).unset();
    }
    
    this.removeTimer(this.tile);
    this.cleanupMessaging();
  }

  shouldUpdate(changedProperties: PropertyValueMap<any>): boolean {
    console.log('Changed properties:', [...changedProperties.keys()]); 
    return super.shouldUpdate(changedProperties);
  }

  private setupDraggable(tile: RS1.TDE, axis?:string) {
    const element = this.tileElement;
   
    if (element) {
      element.style.touchAction = 'none';
      let x = 0;
      let y = 0;
      interact(element)
        .draggable({
          inertia: true,
          startAxis: (axis === 'x' || axis === 'y') ? axis : 'xy',
          lockAxis: (axis === 'x' || axis === 'y') ? axis : 'xy',
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
          },
        })  
    }
  }

  private setupResizable(tile: RS1.TDE) {
    const element = this.tileElement;
    
    if (element) {
      let x = 0;
      let y = 0;
      let width = element.offsetWidth;
      let height = element.offsetHeight;
      interact(element)
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

  private updateTilePosition(tile: RS1.TDE, element: HTMLElement,x:number,y:number) {
    const translateVID = tile.sList?.getVID('transform');
    const positionVID = tile.sList?.getVID('position');
  
    if (translateVID && positionVID) {
      translateVID.Desc = `translate(${x}px, ${y}px)`;
      positionVID.Desc = 'absolute';
  
      tile.sList?.setVID(translateVID);
      tile.sList?.setVID(positionVID);
    }
  }

  private updateTileSize(tile: RS1.TDE, width: number, height: number) {
    const widthVID = tile.sList?.getVID('width');
    const heightVID = tile.sList?.getVID('height');

    if (widthVID && heightVID) {
      widthVID.Desc = `${width}px`;
      heightVID.Desc = `${height}px`;

      tile.sList?.setVID(widthVID);
      tile.sList?.setVID(heightVID);
    }
  }

  private handleSwipe(target:HTMLElement, options?:Object) {
    const defaults = {
        minSwipeDistance: 60,  
        maxSwipeTime: 500,    
        onSwipe: (direction:any) => {
            console.log(`Swipe detected: ${direction}`);
        }
    };

    const config = { ...defaults, ...options };

    if (!target) {
        console.error("No target detected for swipe interaction");
        return null;
    }

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const swipeInteractable = interact(target)
        .draggable({
            onstart: function (event) {
                startX = event.pageX;
                startY = event.pageY;
                startTime = event.timeStamp;
            },
            onend: function (event) {
                const endX = event.pageX;
                const endY = event.pageY;
                const endTime = event.timeStamp;

                const deltaX = endX - startX;
                const deltaY = endY - startY;
                const absDeltaX = Math.abs(deltaX);
                const absDeltaY = Math.abs(deltaY);
                const deltaTime = endTime - startTime;
                
                if (deltaTime <= config.maxSwipeTime &&
                    (absDeltaX >= config.minSwipeDistance || absDeltaY >= config.minSwipeDistance))
                {
                    let direction = null;

                    if (absDeltaX > absDeltaY) {
                        direction = (deltaX > 0) ? 'right' : 'left';
                    } else {
                        direction = (deltaY > 0) ? 'down' : 'up';
                    }

                    if (direction && typeof config.onSwipe === 'function') {
                        config.onSwipe(direction);
                    }  
                }
            },
            modifiers: [
             
            ],
            listeners: {
                 move(event) {
                     event.preventDefault();
                 }
            }

        })
        
    if (swipeInteractable) swipeInteractable.styleCursor(false);

    return swipeInteractable;
}

private setupTileInteractions(tile: RS1.TDE) {
  const element = this.tileElement;
  if (!element) return;

  interact(element).unset();

  const isDrag = this.editMode && tile.aList?.descByName('drag') === 'true';
  const dragAxis = tile.aList?.descByName('dragAxis')
  const isResize = this.editMode && tile.aList?.descByName('resize') === 'true';
  const isSwipe = tile.aList.descByName('swipe') === 'true';
  const isHold = tile.aList.descByName('hold') === 'true';

  if (isDrag) {
    this.setupDraggable(tile, dragAxis);
  }

  if (isResize) {
    this.setupResizable(tile);
  }

  if(isSwipe) {
    this.handleSwipe(element)
  }

  if (isHold) {
    interact(element)
    .on('hold', () => {
        this.handleLongPress(tile);
    });
  }
}

  private handleClickAction(tile: RS1.TDE) {
    const action = tile.aList?.descByName('clickAction');

    switch (action) {
        case 'Bold':
          this.applyTextFormatting(tile, 'bold');
          break;
        
        case 'Italic':
          this.applyTextFormatting(tile, 'italic');
          break;
        
        case 'Underline':
          this.applyTextFormatting(tile, 'underline');
          break;

        case 'Alert':
          const alertContent = tile.aList?.descByName('alertContent');
          if (alertContent && alertContent !== '') {
            alert(alertContent);
          } 
          else {
            alert('No alert set');
          } 
          break;

        case 'Redirect':
          const redirectLink = tile.aList?.descByName('redirect');
          window.location.href = redirectLink;
          break;

        case 'VillaLink':
          const link = tile.aList?.descByName('link');
          this.dispatchEvent(
            new CustomEvent('tileLink', {
              detail: { name: `${link}` },
              bubbles: true,
              composed: true
            })
          );
          break;
    }
  }

  private deleteTile(tile: RS1.TDE) {
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
          if (!this.editMode) {
            event.interaction.stop();
            return;
          }
          
          const element = this.tileElement;
          if (!element) return;
          
          const startPosX = parseFloat(event.target.dataset.startPosX || '50');
          const startPosY = parseFloat(event.target.dataset.startPosY || '50');
          
          const containerWidth = element.clientWidth;
          const containerHeight = element.clientHeight;
          
          const deltaPercentX = -(event.dx / containerWidth) * 100;
          const deltaPercentY = -(event.dy / containerHeight) * 100;

          const newPosX = Math.max(0, Math.min(100, startPosX + deltaPercentX));
          const newPosY = Math.max(0, Math.min(100, startPosY + deltaPercentY));
          
          this._backgroundImageState.posX = newPosX;
          this._backgroundImageState.posY = newPosY;


          element.style.backgroundPosition = `${newPosX}% ${newPosY}%`;

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
            if (!this.editMode) {
              event.interaction.stop();
              return;
            }
          
            const element = this.tileElement;
            if (!element) return;
          
          const startSize = parseFloat(event.target.dataset.startSize || '100');
          const startX = parseFloat(event.target.dataset.startX || '0');
          const startY = parseFloat(event.target.dataset.startY || '0');
          
          const totalDeltaX = event.clientX - startX;
          const totalDeltaY = event.clientY - startY;
          
          const diagonalDelta = (totalDeltaX + totalDeltaY) / 2;
          
          const containerSize = Math.min(element.clientWidth, element.clientHeight);
          const deltaPercent = (diagonalDelta / containerSize) * 100;
          
          const newSize = Math.max(50, Math.min(300, startSize + deltaPercent));

          this._backgroundImageState.size = newSize;
        
          element.style.backgroundSize = `${newSize}%`;

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

  private findClosestParentByType(tile: RS1.TDE, tileType: string) {
    let currentTile = tile;

    while (currentTile) {
      if (currentTile.tileID?.tname === tileType) {
        return currentTile;
      }
      currentTile = this.TList.tiles[currentTile.parent];
    }
    console.warn('No parent found');
    return null;
  }

  private applyTextFormatting(tile:RS1.TDE, command: string) {
    const textBoxTile = this.findClosestParentByType(tile, 'Txt');
    const textBoxTileId = textBoxTile ? this.TList.tiles.indexOf(this.tile).toString() : null;
    const textBoxTileElement = textBoxTileId ? this.shadowRoot?.getElementById(`tile${textBoxTileId}`) : null;

    if (textBoxTileElement !== null) {
      document.execCommand(command, false);
    }
    else {
      console.warn('No text box found');
    }
  }

  private getTileDeleteButton(tile: RS1.TDE) {
    return html`
      <button class="delete-button" 
        style="position: absolute; top: 10px; right: 10px; opacity: 0; transition: opacity 0.3s; z-index: 10; display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;"
        @click="${() => this.deleteTile(tile)}">
        Delete
      </button>
    `;
  }

  private renderInnerContentEditable(tile: RS1.TDE, innerContent: string, istextPreview: boolean, textPreviewVID: any): any {
    if (!istextPreview) {
      return html`
      <div
      id="text-edit"
      contenteditable="true"
      placeholder="Enter text here"
      @input="${(e: Event) => {
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

    else if (istextPreview) {
      return html`
        <div
        id="text-edit2"
        contenteditable="false" 
        @click="${() =>  {
    if (this.editMode && textPreviewVID) { 
            textPreviewVID.Desc = "false";
        tile.aList?.setVID(textPreviewVID);
      this._isTextPreview = false;
    }}}"
        style="background: transparent; border: none; color: white;">
        ${unsafeHTML(innerContent)}
        </div>
      `;
    }
    return html``; 
  }

  private renderDivWrapper(
    tile: RS1.TDE,
    innerContentHTML: any, 
    embeddedComponent: any, 
    styleStr: string,
    tileIndex: number,
    isClick?: boolean,
    isDblClick?: boolean
  ): any {
    const isBgImage = tile.aList?.descByName('BgImage') === 'true';
    const bgControlsHTML = (this.editMode && isBgImage) ? html`
      <div class="background-controls" style="position: absolute; opacity:0; top: 50px; right: 10px; display: flex; flex-direction: column; gap: 5px; z-index: 11;">
        <input type="file" id="bg-file-upload-${tileIndex}" style="display: none;" accept="image/*" @change=${(e: Event) => this.handleBackgroundImageUpload(e, tile)}/>
        ${this._isEditBg ? html`
          ${this._backgroundImageState.url ? html`
            <button class="system-button" style="display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;" @click=${() => this.triggerBgImageUpload(tile)}>Replace</button>
            <button class="system-button" style="display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;" @click=${() => this.handleRemoveBackgroundImage(tile)}>Remove</button>
            <button class="system-button" style="display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;" @click=${() => {this.updateBackgroundStyles(tile); this._isEditBg = false}}>Done</button>
          ` : html`
            <button class="system-button" style="display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;" @click=${() => this.triggerBgImageUpload(tile)}>Upload</button>
            <button class="system-button" style="display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;" @click=${() => {this.updateBackgroundStyles(tile); this._isEditBg = false}}>Done</button>
          `}
        ` : html`
          <button class="system-button" style="display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 100px; height: 30px; background: #1e1e1e;" @click=${() => this._isEditBg = true}>Background</button>
        `}
      </div>
    ` : '';
    const bgControllerInteractive = (this.editMode && isBgImage && this._backgroundImageState.url && this._isEditBg) ? html`
      <div class="bg-controller" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: move; z-index: 5; background-color: rgba(255, 255, 255, 0.1);"></div>
      <div class="resize-handle" style="position: absolute; bottom: 10px; right: 10px; width: 12px; height: 12px; background-color: #3498db; border: 2px solid white; border-radius: 50%; z-index: 15; cursor: se-resize;"></div>
    ` : '';

    return html`<div id="tile${tileIndex}" class="tile" style="${styleStr}"
      @click="${(e: Event) => {
        e.stopPropagation();
        if (isClick) { this.handleClickAction(tile); }
      }}"
      @mouseenter="${(e: Event) => {
        e.stopPropagation();
        this.handleHover(tile, true);
        const hostElement = e.currentTarget as HTMLElement;
        const deleteBtn = hostElement.querySelector('.delete-button');
        if (deleteBtn) {
          if (!this.editMode) {
            (deleteBtn as HTMLElement).style.opacity = '1';
            (deleteBtn as HTMLButtonElement).disabled = false;
          } else {
            (deleteBtn as HTMLElement).style.opacity = '0';
            (deleteBtn as HTMLButtonElement).disabled = true;
          }
        }
        const bgControlsElement = hostElement.querySelector('.background-controls');
        if (bgControlsElement && this.editMode) {
          (bgControlsElement as HTMLElement).style.opacity = '1';
        }
      }}"
      @mouseleave="${(e: Event) => {
        e.stopPropagation();
        this.handleHover(tile, false);
        const hostElement = e.currentTarget as HTMLElement;
        const deleteBtn = hostElement.querySelector('.delete-button');
        if (deleteBtn) { (deleteBtn as HTMLElement).style.opacity = '0'; }
        const bgControlsElement = hostElement.querySelector('.background-controls');
        if (bgControlsElement && !this._isEditBg) {
          (bgControlsElement as HTMLElement).style.opacity = '0';
        }
      }}"
      @dblclick="${(e: Event) => { 
        e.stopPropagation();
        if (isDblClick) { this.handleDoubleClick(tile); }
      }}"
      @format-text="${(e: CustomEvent) => { 
        const targetTextBox = this.shadowRoot?.getElementById('text-box') as HTMLDivElement | null;
        if (targetTextBox) {
          const command = e.detail.command;
          document.execCommand(command, false);
          e.stopPropagation(); 
        }
      }}">
      ${innerContentHTML}
      ${embeddedComponent}
      <slot></slot> 
      ${tileIndex !== 1 ? this.getTileDeleteButton(tile) : ''}
      ${isBgImage ? html`${bgControlsHTML}${bgControllerInteractive}` : nothing}
    </div>`;
  }

  private renderButtonElement(
    tile: RS1.TDE, 
    innerText: any, 
    styleStr: string, 
    tileIndex: number, 
    isClick: boolean
  ): any {
    return html`
    <button id="tile${tileIndex}" 
      class="button" 
      style="${styleStr}"
      @click="${(e: Event) => {
        if (isClick) { this.handleClickAction(tile); }
      }}" 
      type="${tile.aList?.getVID('type')?.Desc}" 
      value="${tile.aList?.getVID('value')?.Desc}">
      ${innerText}
    </button>`;
  }

  private renderTextBoxElement(tile: RS1.TDE): any {
    return html`
      <div
      class="text-box"
      contenteditable="true"
      style="background: white; border: none; color: black; resize: both; overflow: auto; min-height: 50px; min-width: 150px; cursor: text ; "
      @input="${(e: Event) => {
        this._textEditContent = (e.target as HTMLDivElement).textContent || '';
      }}"
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
      </div>
       <button class="system-button"
            title="Sends the current text as a message. Requires 'targetTile' attribute to be set on this tile."
            style="border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: auto; padding: 5px 10px; height: 30px; background: #007bff;"
            @click="${() => this.sendCurrentTextAsMessage()}">
            Send Message
          </button>
          <input type="file" 
            id="file-upload-${this.getTileId()}" 
            style="display: none;" 
            @change="${(e: Event) => this.handleFileUploadForSending(e)}"
            accept="image/*,video/*,*/*">
          <button class="system-button"
            title="Send a file, image, or video to the target tile. Requires 'targetTile' attribute to be set."
            style="border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: auto; padding: 5px 10px; height: 30px; background: #28a745;"
            @click="${() => {
              const fileInput = this.shadowRoot?.getElementById(`file-upload-${this.getTileId()}`) as HTMLInputElement;
              if (fileInput) fileInput.click();
            }}">
            Send File
          </button> `;
  }
  
  private renderCarouselElement(tile: RS1.TDE): any {
    const tileIndexCarousel = this.TList.tiles.indexOf(tile);
    return html`
      <image-carousel
        id="carousel-content-${tileIndexCarousel}"
        class="tile-content-carousel"
        .tileIndex="${tileIndexCarousel}"
      >
      </image-carousel>          
    `;
  }

  private renderInputElement(tile: RS1.TDE): any {
    const submitButtonTDE = TileDefBuilder.modifyTDE(TileDefBuilder.ButtonTDE, {
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
    });
    return html`
    <form style="display: flex; background: transparent;">
      <input 
        type="${tile.aList?.getVID('input-type')?.Desc}" 
        placeholder="${tile.aList?.getVID('input-placeholder')?.Desc}" 
        ${tile.aList?.getVID('input-required')?.Desc === 'true' ? 'required' : '' } 
        minlength="${tile.aList?.getVID('input-minlength')?.Desc}" 
        maxlength="${tile.aList?.getVID('input-maxlength')?.Desc}">
      </input>
      ${this.renderTDE(submitButtonTDE)}
    </form> `; 
  }

  private renderColorPickerElement(tile: RS1.TDE): any {
    return html`
    <color-picker></color-picker>`;
  }

  private renderVideoPlayerElement(tile: RS1.TDE): any {
    const videoSrc = tile.aList?.descByName('video-src') || '';
    const videoType = tile.aList?.descByName('video-type') || 'video/mp4';
    const videoControls = tile.aList?.descByName('video-controls') === 'true';
    const videoAutoplay = tile.aList?.descByName('video-autoplay') === 'true';
    const videoLoop = tile.aList?.descByName('video-loop') === 'true';
    const videoMuted = tile.aList?.descByName('video-muted') === 'true';

    return html`
      <video-player
        .src=${videoSrc}
        .type=${videoType}
        ?controls=${videoControls}
        ?autoplay=${videoAutoplay}
        ?loop=${videoLoop}
        ?muted=${videoMuted}
      ></video-player>
    `;
  }

  private renderIframeElement(tile: RS1.TDE): any {
    const iframeSrc = tile.aList?.descByName('iframe-src') || '';
    const iframeTitle = tile.aList?.descByName('iframe-title') || '';
    const iframeSandbox = tile.aList?.descByName('iframe-sandbox') || 'allow-same-origin allow-scripts allow-popups allow-forms';
    const iframeLoading = tile.aList?.descByName('iframe-loading') || 'lazy';
    const iframeReferrerPolicy = tile.aList?.descByName('iframe-referrerpolicy') || 'no-referrer';
    const iframeAllow = tile.aList?.descByName('iframe-allow') || '';
    const iframeWidth = tile.aList?.descByName('iframe-width') || '100%';
    const iframeHeight = tile.aList?.descByName('iframe-height') || '100%';
    const iframeScrolling = tile.aList?.descByName('iframe-scrolling') || 'auto';

    return html`
      <div class="iframe-container" style="width: 100%; height: 100%; position: relative;">
        <div class="controls" style="position: absolute; top: 45px; right: 10px; opacity: 0; transition: opacity 0.3s; z-index: 10; display: flex; gap: 10px;">
          <button class="system-button" style="display: inline-block; border: none; border-radius: 5px; justify-content: center; align-items: center; cursor: pointer; color: #fff; width: 70px; height: 30px; background: #1e1e1e;" @click=${() => this.handleIframeReload(tile)}>Reload</button>
        </div>
        <iframe
          src="${iframeSrc}"
          title="${iframeTitle}"
          sandbox="${iframeSandbox}"
          loading="${iframeLoading}"
          referrerpolicy="${iframeReferrerPolicy}"
          allow="${iframeAllow}"
          style="width: ${iframeWidth}; height: ${iframeHeight}; border: none;"
          scrolling="${iframeScrolling}"
        ></iframe>
      </div>
    `;
  }

  private handleIframeReload(tile: RS1.TDE) {
    const iframe = this.shadowRoot?.querySelector('iframe');
    if (iframe) {
      iframe.src = iframe.src;
    }
  }

  private renderTimerElement(tile: RS1.TDE): any {
    const timerDuration = parseInt(tile.aList?.descByName('timer-duration') || '300');
    const timerMode = tile.aList?.descByName('timer-mode') || 'countdown';
    const timerSound = tile.aList?.descByName('timer-sound') === 'true';
    const tileIndex = this.TList.tiles.indexOf(tile);
    
    if (!(window as any).rspaceTimers) {
      (window as any).rspaceTimers = {};
    }
    
    const timers = (window as any).rspaceTimers;
    const timerId = `timer-${tileIndex}`;
    
    if (!timers[timerId]) {
      timers[timerId] = {
        currentTime: timerMode === 'countdown' ? timerDuration : 0,
        isRunning: false,
        intervalId: null,
        mode: timerMode,
        sound: timerSound
      };
      
      timers[timerId].isRunning = true;
      timers[timerId].intervalId = setInterval(() => {
        const timer = timers[timerId];
        if (timer.mode === 'countdown') {
          timer.currentTime--;
          if (timer.currentTime <= 0) {
            timer.currentTime = 0;
            timer.isRunning = false;
            clearInterval(timer.intervalId);
            timer.intervalId = null;
            
            if (timer.sound) {
              try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.5);
              } catch (error) {
                console.warn('Could not play timer sound:', error);
              }
            }
          }
        } else {
          timer.currentTime++;
        }
        
        const timerDisplay = this.shadowRoot?.querySelector(`#timer-display-${tileIndex}`);
        if (timerDisplay) {
          const minutes = Math.floor(timer.currentTime / 60);
          const seconds = timer.currentTime % 60;
          const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          timerDisplay.textContent = displayTime;
        }
      }, 1000);
    }
    
    const minutes = Math.floor(timers[timerId].currentTime / 60);
    const seconds = timers[timerId].currentTime % 60;
    const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    return html`
      <div id="timer-display-${tileIndex}" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-family: 'Courier New', monospace; font-size: 2rem; font-weight: bold; color: white;">
        ${displayTime}
      </div>
    `;
  }

  private removeTimer(tile: RS1.TDE) {
    const tileIndex = this.TList.tiles.indexOf(tile);
    const timerId = `timer-${tileIndex}`;
    const timers = (window as any).rspaceTimers;
    if (timers && timers[timerId]) {
      clearInterval(timers[timerId].intervalId);
      delete timers[timerId];
    }
  }

  renderTDE(tile: RS1.TDE): any {
    const tileType = tile.tileID?.tname;
    const innerContent = tile.aList?.descByName('inner') || '';
    const tileIndex = this.TList.tiles.indexOf(tile);
    const styleStr = tile.sList?.toVIDList(";") ?? "";
    const isClick = tile.aList?.descByName('click') === 'true';
    const isDblClick = tile.aList?.descByName('dblclick') === 'true';

    const currentBgUrl = tile.sList?.descByName('background-image');
    const currentBgPos = tile.sList?.descByName('background-position'); 
    const currentBgSize = tile.sList?.descByName('background-size'); 

    if (currentBgUrl && currentBgUrl !== 'url("")') {
      let posX = 50; let posY = 50; let size = 100;
      if (currentBgPos) {
        const posValues = currentBgPos.trim().split(' ');
        if (posValues.length >= 2) {
          const xPos = posValues[0]; const yPos = posValues[1];
          if (xPos.endsWith('%')) posX = parseFloat(xPos);
          if (yPos.endsWith('%')) posY = parseFloat(yPos);
        }
      }
      if (currentBgSize && currentBgSize.endsWith('%')) size = parseFloat(currentBgSize);
      else if (currentBgSize === 'cover') size = 100;
      this._backgroundImageState = { url: currentBgUrl, position: currentBgPos, size: size, posX: posX, posY: posY };
    } 
    else {
      this._backgroundImageState = { url: null, position: 'center center', size: 100, posX: 50, posY: 50 }; 
    }

    const isInnerEdit = tile.aList?.descByName('innerEdit') === 'true';
    const istextPreview = tile.aList?.descByName('textPreview') === 'true';
    const textPreviewVID = tile.aList?.getVID('textPreview');
    const innerContentHTML = isInnerEdit ? this.renderInnerContentEditable(tile, innerContent, istextPreview, textPreviewVID as any) : unsafeHTML(innerContent);

    switch (tileType) {
        case 'T':
          return this.renderDivWrapper(
            tile,
            innerContentHTML, 
            nothing,                  
            styleStr,
            tileIndex,
            isClick,
            isDblClick
          );

        case 'Btn':
        case 'RndBtn':
          return this.renderButtonElement(
            tile,
            innerContentHTML,
            styleStr,
            tileIndex,
            isClick
          );

        case 'Carousel':
          const carouselHTML = this.renderCarouselElement(tile);
          return this.renderDivWrapper(
            tile,
            nothing,        
            carouselHTML,   
            styleStr,
            tileIndex,
            isClick,
            isDblClick
          );

        case 'Video':
          const videoHTML = this.renderVideoPlayerElement(tile);
          return this.renderDivWrapper(
            tile,
            nothing,
            videoHTML,
            styleStr,
            tileIndex,
            isClick,
            isDblClick
          );

        case 'Iframe':
          const iframeHTML = this.renderIframeElement(tile);
          return this.renderDivWrapper(
            tile,
            nothing,
            iframeHTML,
            styleStr,
            tileIndex,
            isClick,
            isDblClick
          );

        case 'Txt':
          const textHTML = this.renderTextBoxElement(tile);
          return this.renderDivWrapper(
            tile,
            nothing,
            textHTML,
            styleStr,
            tileIndex,
            isClick,
            isDblClick
          );

        case 'Input':
          const inputHTML = this.renderInputElement(tile);
          return this.renderDivWrapper(
            tile,
            nothing,
            inputHTML,
            styleStr,
            tileIndex,
            isClick,
            isDblClick
          );

        case 'ColorPicker':
          const colorPickerHTML = this.renderColorPickerElement(tile);
          return this.renderDivWrapper(
            tile,
            nothing,
            colorPickerHTML,
            styleStr,
            tileIndex,
            isClick,
            isDblClick
          );

        case 'Timer':
          return this.renderTimerElement(tile);

        default:
          console.warn('tileType not found: ' + tileType + '. Rendering a basic div.');
          return this.renderDivWrapper(
            tile,
            innerContentHTML,
            nothing,
            styleStr,
            tileIndex,
            isClick,
            isDblClick
          );
    }
  }

  render() {
    return html`
      ${this.renderTDE(this.tile)}
    `;
  }

  handleDoubleClick(tile: RS1.TDE) {
    console.log('Double click detected on tile:', tile.aList?.descByName('name'));
  }
  
  handleHover(tile: RS1.TDE, isEnter: boolean) {
    const element = this.tileElement;
    // console.log('Hover detected on tile:', tile.aList?.descByName('name'));
    
    if (!element || !this.editMode) return;
    
    if (isEnter) {
      const hover = tile.aList?.descByName('hover') === 'true';

      if (hover) {
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
  
  handleLongPress(tile: RS1.TDE) {
    console.log('Long press detected on tile:', tile.aList?.descByName('name'));
  }

  private setupMessaging() {
    const tileId = this.getTileId();
    this._unsubscribeMessageStore = tileComm.subscribe(tileId, (message: TileMessage | null) => {
      if (message) {
        console.log(`Tile ${tileId} received data from ${message.from}:`, message.nug.l.to$);
        this.handleIncomingMessage(message);
      }
    });
  }

  private cleanupMessaging() {
    if (this._unsubscribeMessageStore) {
      this._unsubscribeMessageStore();
      this._unsubscribeMessageStore = null;
    }
  }

  private getTileId(): string {
    const tileName = this.tile.aList?.getVID('name')?.Desc;
    if (tileName) return tileName;
    
    const tileIndex = this.TList.tiles.indexOf(this.tile);
    return `tile-${tileIndex}`;
  }

  private handleIncomingMessage(message: TileMessage) {
    const messageType = message.nug.l.descByName('messageType');
    
    if (messageType === 'textMessage') {
      const textContent = `received ${messageType} from ${message.from}: ${message.nug.l.descByName('textContent')}`;
      if (textContent) {
        console.log(`RTile ${this.getTileId()}: Updating text content with: ${textContent}`);
        this.updateTextContent(textContent);
      }
    } else if (messageType === 'media') {
      const textContent = `received ${messageType} from ${message.from}: ${message.nug.l.descByName('mediaType')}`;
      this.updateTextContent(textContent);
      this.handleMediaMessage(message);
    } else if (messageType === 'file') {
      const textContent = `received ${messageType} from ${message.from}: ${message.nug.l.descByName('fileName')}`;
      this.updateTextContent(textContent);
      this.handleFileMessage(message);
    } else {
      console.log(`RTile ${this.getTileId()}: Received data with unknown message type: ${messageType}`);
    }
  }

  private handleMediaMessage(message: TileMessage) {
    const mediaType = message.nug.l.descByName('mediaType');
    const mediaField = message.nug.getField('mediaData');
    
    if (mediaField && mediaField.AB) {
      console.log(`RTile ${this.getTileId()}: Received ${mediaType} media from ${message.from}`);
    }
  }

  private handleFileMessage(message: TileMessage) {
    const fileName = message.nug.l.descByName('fileName');
    const fileSize = message.nug.l.descByName('fileSize');
    const fileField = message.nug.getField('fileContent');
    
    if (fileField && fileField.AB) {
      console.log(`RTile ${this.getTileId()}: Received file ${fileName} (${fileSize} bytes) from ${message.from}`);
    }
  }

  private sendMediaMessage(targetTileId: string, mediaType: string, mediaBuffer: ArrayBuffer, metadata: any = {}) {
    const nug = new RS1.Nug('');
    
    nug.l.set('messageType', 'media');
    nug.l.set('mediaType', mediaType);
    nug.l.set('senderTile', this.getTileId());
    
    Object.entries(metadata).forEach(([key, value]) => {
      nug.l.set(key, String(value));
    });
    
    const mediaField = new RS1.PackField('mediaData', mediaBuffer);
    nug.addField(mediaField);
    
    console.log(`Tile ${this.getTileId()}: Sending ${mediaType} media to ${targetTileId}`);
    this.sendDataToTile(targetTileId, nug);
  }

  private sendFileMessage(targetTileId: string, fileName: string, fileBuffer: ArrayBuffer) {
    const nug = new RS1.Nug('');
    
    nug.l.set('messageType', 'file');
    nug.l.set('fileName', fileName);
    nug.l.set('fileSize', fileBuffer.byteLength.toString());
    nug.l.set('senderTile', this.getTileId());
    
    const fileField = new RS1.PackField('fileContent', fileBuffer);
    nug.addField(fileField);
    
    console.log(`Tile ${this.getTileId()}: Sending file ${fileName} to ${targetTileId}`);
    this.sendDataToTile(targetTileId, nug);
  }

  private handleFileUploadForSending(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      const targetTileId = this.tile.aList?.descByName('targetTile');
      if (!targetTileId) {
        alert('Target tile not specified. Set the "targetTile" attribute on this tile.');
        return;
      }
      
      console.log(`RTile ${this.getTileId()}: Uploading ${file.name} (${file.size} bytes)...`);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        if (file.type.startsWith('image/')) {
          this.sendMediaMessage(targetTileId, 'image', arrayBuffer, {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
          });
        } else if (file.type.startsWith('video/')) {
          this.sendMediaMessage(targetTileId, 'video', arrayBuffer, {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
          });
        } else {
          this.sendFileMessage(targetTileId, file.name, arrayBuffer);
        }
        
        // Reset the input
        input.value = '';
        console.log(`RTile ${this.getTileId()}: File ${file.name} sent successfully`);
      };
      
      reader.onerror = () => {
        console.error(`RTile ${this.getTileId()}: Error reading file ${file.name}`);
        alert('Error reading file. Please try again.');
      };
      
      reader.readAsArrayBuffer(file);
    }
  }

  private updateTextContent(content: string) {
    const innerVID = this.tile.aList?.getVID('inner');
    if (innerVID) {
      innerVID.Desc = content;
      this.tile.aList?.setVID(innerVID);
      this.requestUpdate();
    }
  }

  private sendDataToTile(targetTileId: string, nug: RS1.Nug) {
    const senderId = this.getTileId();
    console.log(`Tile ${senderId}: Sending nug to ${targetTileId}:`, nug.l.to$);
    tileComm.sendNug(senderId, targetTileId, nug);
  }

  private sendCurrentTextAsMessage() {
    const currentText = this._textEditContent;
    if (!currentText.trim()) {
      alert('Cannot send an empty message.');
      return;
    }

    const targetTileId = this.tile.aList?.descByName('targetTile');
    if (!targetTileId) {
      alert('Target tile not specified. Set the "targetTile" attribute on this tile.');
      return;
    }
    
    const nug = new RS1.Nug('');
    nug.l.set('textContent', currentText);
    nug.l.set('senderTile', this.getTileId());
    nug.l.set('messageType', 'textMessage');
    
    console.log(`Tile ${this.getTileId()}: Sending text message to ${targetTileId}: "${currentText}"`);
    this.sendDataToTile(targetTileId, nug);
  }
}

@customElement ('tile-list-renderer')
export class TileListRenderer extends LitElement {
 
  declare TList: RS1.TileList;
  declare editMode: boolean;
  declare showEditorPanel: boolean;
  declare showListEditor: boolean;
  private isInteractingWithCarousel = false;
  private isInteractingwithTextBox = false
  
  static properties = {
    TList: { type: Object },
    showEditorPanel: { type: Boolean },
    showListEditor: { type: Boolean },
    editMode: { type: Boolean },
  };

  constructor() {
    super();
    this.TList = new RS1.TileList('');
    this.editMode = false;
    this.showEditorPanel = true;
    this.showListEditor = false;
  }

  static styles = css`
  :host {
      width: 100%;
      height: 100%;
  }
  #main-container {
      position: relative;
      /* overflow: auto; */
      touch-action: pan-x pan-y;
      scrollbar-width: none;
  }`

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

    TileDefBuilder.newTDEInstance(tile)
  
    return html`
      <r-tile
        .tile=${tile}
        .TList=${this.TList}
        .editMode=${this.editMode}
        .showListEditor=${this.showListEditor}
        @tile-deleted=${this.handleTileDeletion}
      >
        ${childElements}
      </r-tile>
    `;
  }

  private handleBackgroundPan() {
    const element = this.shadowRoot?.getElementById('main-container');
    let xPos = 0;
    let yPos = 0;
    if (element) {
      interact(element).draggable({
        listeners: {
          move: event => {
            if (this.editMode) return; 
          
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
      console.warn('main-container not found')
    }
  }

  private handleModeChange(e: CustomEvent) {
    if (typeof e.detail.editMode === 'boolean') {
      this.editMode = e.detail.editMode;
      this.requestUpdate('editMode');
    }
  }
  
  private handlePanelToggle(e: CustomEvent) {
    if (typeof e.detail.showPanel === 'boolean') {
        this.showEditorPanel = e.detail.showPanel;
        this.requestUpdate('showEditorPanel');
    }
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
      <div id="main-container">
        ${topLevelTiles.map(tile => this.renderTileAndChildren(tile))}
      </div>
      <tile-editor-panel
      .editMode=${this.editMode}
      .showPanel=${this.showEditorPanel}
      .showListEditor=${this.showListEditor}
      @mode-change=${this.handleModeChange}
      @panel-toggle=${this.handlePanelToggle}
      >
      </tile-editor-panel>
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
    });
    this.addEventListener('text-box-interaction-over', () => {
      this.isInteractingwithTextBox = false;
    });
  }

}

@customElement('image-carousel')
export class ImageCarousel extends LitElement {
  declare images: string[];
  declare splide: Splide;
  declare tileIndex: number;

  static properties = {
    images: { type: Array },
    tileIndex: { type: Number },
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
    top: 45px;
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

  .upload-button, .delete-image-button, .delete-tile-button {
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
          <label for="imageUpload-${this.tileIndex}" class="upload-button">Upload</label>
          ${this.images.length > 0
            ? html`<button class="delete-image-button" @click="${this.deleteCurrentImage}">Delete Image</button>`
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
          id="imageUpload-${this.tileIndex}"
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
      top: 45px;
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
    const fileInput = this.shadowRoot?.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput && !fileInput.id) {
        fileInput.id = `video-upload-${Math.random().toString(36).substring(2,9)}`;
    }
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
  declare showPanel: boolean;
  declare showListEditor: boolean;

  static properties = {
    editMode: { type: Boolean },
    showPanel: { type: Boolean },
    showListEditor: { type: Boolean },
  }

  constructor() {
    super()
    this.editMode = false;
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
    this.dispatchEvent(new CustomEvent('panel-toggle', { 
      detail: { showPanel: !this.showPanel },
      bubbles: true, 
      composed: true 
    }));
  }

  private toggleEditMode() {
    if (this.editMode) {
      return;
    }
    this.editMode = true;
    this.dispatchEvent(new CustomEvent('mode-change', { 
      detail: { editMode: true },
      bubbles: true, 
      composed: true 
    }));
  }

  private toggleBrowseMode() {
    if (!this.editMode) {
      return;
    }
    this.editMode = false;
    this.dispatchEvent(new CustomEvent('mode-change', { 
      detail: { editMode: false },
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
    const BrowseModeActive = !this.editMode ? 'active' : '';
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
