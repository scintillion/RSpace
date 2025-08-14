import { LitElement, css, html, type PropertyValues, type ReactiveController, type TemplateResult } from 'lit';
import { customElement} from 'lit/decorators.js';
import { RS1 } from '$lib/RSsvelte.svelte';
import interact from 'interactjs';

type Data =  'text' | 'number' | 'image' | 'video' | 'audio' | 'file' | 'json' | 'buffer' | 'any';
type Element = 'div' | 'button' ;
type Display = 'text' | 'image' | 'video' | 'canvas' | 'input' | 'html' ;

interface TileInterface {
    id: string;
    input: TileInputInterface;
    output: TileOutputInterface;
    element: TileElementInterface;
    display: TileDisplayInterface;
    processor: TileProcessorInterface;
    interaction: TileInteractionInterface;
}

interface TileInputInterface {
    ports: Map<string, InputPortInterface>;
    onReceive: (data: RS1.Nug, portName: string) => void;
    receive(data: RS1.Nug, portName: string): void;
    addInputPort(portName: string, type: Data[], required?: boolean): void;
    removeInputPort(portName: string): void;
    getCurrentData(portName: string): RS1.Nug | null
}

interface InputPortInterface {
    type: Data[];
    currentData: RS1.Nug | null;
    required: boolean;
}

interface BaseInteractionInterface {
  enabled: boolean;
  action?: () => void;
  set(action: () => void): void;
  enable(): void;
  disable(): void;
  setup(element: HTMLElement): void;
  remove(element: HTMLElement): void;
}

interface TileOutputInterface {
    send(data: RS1.Nug): void;
}

interface TileElementInterface {
    type: Element;
    styles: string;
    render(content: TemplateResult): TemplateResult;
}

interface TileDisplayInterface {
    type: Display;
    styles: string;
    update(data: any): void;
    render(data: any): TemplateResult;
}

interface TileProcessorInterface {
    process(data?: RS1.Nug): any;
    setProcess(process: (data?: RS1.Nug) => any): void;
}

interface DragInteractionInterface extends BaseInteractionInterface {
  axis: 'x' | 'y' | 'xy';
  setAxis(axis: 'x' | 'y' | 'xy'): void;
}

interface ClickInteractionInterface extends BaseInteractionInterface {

}

interface SwipeInteractionInterface extends BaseInteractionInterface {
  minDistance: number;
  maxTime: number;
  setOptions(options: { minDistance?: number; maxTime?: number }): void;
}

interface ResizeInteractionInterface extends BaseInteractionInterface {
  edges: string;
  setEdges(edges: string): void;
}

interface HoverInteractionInterface extends BaseInteractionInterface {

}

interface TileInteractionInterface {
  drag: DragInteractionInterface;
  click: ClickInteractionInterface;
  swipe: SwipeInteractionInterface;
  resize: ResizeInteractionInterface;
  hover: HoverInteractionInterface;

  setupAll(element: HTMLElement): void;
  removeAll(element: HTMLElement): void;
}

interface TileConfig {
    id: string;
    inputConfig: { inputPorts: InputPortInterface[]};
    outputConfig: { outputType: string };
    elementConfig: { type: Element, styles: string };
    displayConfig: { type: Display, styles: string };
    processorConfig: { process: (data?: RS1.Nug) => any };
    interactionConfig: { interactions: BaseInteractionInterface[] };
}

class TileConfigBuilder {
    static fromTDE(tde: RS1.TDE, id: string): TileConfig {
        return {
            id: id,
            inputConfig: { inputPorts: [{type: ['any'], currentData: null, required: false}] },
            outputConfig: { outputType: tde.aList?.descByName('outputType') || 'any' },
            elementConfig: { type: tde.aList?.descByName('elementType') as Element || 'div', styles: tde.sList?.toVIDList(";") ?? "" },
            displayConfig: { type: tde.aList?.descByName('displayType') as Display || 'text', styles: tde.sList?.toVIDList(";") ?? "" },
            processorConfig: { process: (data?: RS1.Nug) => data },
            interactionConfig: { interactions: [] },
        };
    }
}

class MagicTile implements TileInterface {
    id: string;
    input: TileInputInterface;
    output: TileOutputInterface;
    element: TileElementInterface;
    display: TileDisplayInterface;
    processor: TileProcessorInterface;
    interaction: TileInteractionInterface;
    
    private host: RTile
    private currentData: any = null;

    constructor(host: RTile, config: TileConfig) {
        this.id = config.id;
        this.input = new TileInput(config.inputConfig);
        this.output = new TileOutput();
        this.element = new TileElement(config.elementConfig);
        this.display = new TileDisplay(config.displayConfig);
        this.processor = new TileProcessor(config.processorConfig);
        this.interaction = new TileInteraction();
        this.host = host;

        this.input.onReceive = this.handleInputData.bind(this);
    }

    private handleInputData(data: RS1.Nug, portName: string): void {
        const processedData = this.processor.process(data);
        this.currentData = processedData;
        this.display.update(processedData);
    }

    getCurrentData(): any {
        return this.currentData;
    }

}

  class TileInput implements TileInputInterface {
    public ports: Map<string, InputPortInterface> = new Map();
    public onReceive: (data: RS1.Nug, portName: string) => void = () => {}; 

    constructor(config: {inputPorts: InputPortInterface[]}) {
        for (const port of config.inputPorts) {
            this.ports.set('default', port);
        }

        if (!config.inputPorts) {
            this.ports.set('default', { type: ['any'], required: false, currentData: null });
        }
    }
    
    receive(data: RS1.Nug, portName: string): void {
        const port = this.ports.get(portName);
        if (!port) {
            console.warn(`TileInput: Port '${portName}' not found`);
            return;
        }

        if (!this.isValidInputType(data, port.type)) {
            console.warn(`TileInput: Invalid input type for port '${portName}'`);
            return;
        }

        port.currentData = data;
        this.onReceive(data, portName);
    }

    private isValidInputType(data: RS1.Nug, allowedTypes: Data[]): boolean {
        if (allowedTypes.includes('any')) {
            return true;
        }

        const detectedType = this.detectDataType(data);
        return allowedTypes.includes(detectedType);
    }

    private detectDataType(data: RS1.Nug): Data {
        return data._type.toLowerCase() as Data;
    }

    addInputPort(portName: string, type: Data[], required?: boolean): void {
        this.ports.set(portName, { type: type, required: required ?? false, currentData: null });
    }

    getCurrentData(portName: string): RS1.Nug | null {
        return this.ports.get(portName)?.currentData ?? null;
    }

    removeInputPort(portName: string): void {
        this.ports.delete(portName);
    }
  }

  class TileOutput implements TileOutputInterface {
    private subscribers: Map<string, (data: RS1.Nug) => void> = new Map();

    public send(data: RS1.Nug): void {
        this.subscribers.forEach(handler => handler(data));
    }

    public subscribe(subscriberId: string, handler: (data: RS1.Nug) => void): void {
        this.subscribers.set(subscriberId, handler);
    }
  }

  class TileElement implements TileElementInterface {
    type: Element;
    styles: string;
  
    constructor(config: { type: Element, styles: string }) {
      this.type = config.type;
      this.styles = config.styles;
    }
  
    render(content: TemplateResult): TemplateResult {
      switch (this.type) {
        case 'div':
          return html`<div style="${this.styles}">${content}<slot></slot></div>`;

        case 'button':
          return html`<button style="${this.styles}">${content}<slot></slot></button>`;
 
        default:
          return html`<div style="${this.styles}">${content}<slot></slot></div>`;
      }
    }
  }

  class TileDisplay implements TileDisplayInterface {
    type: Display;
    styles: string;
    private currentData: RS1.Nug | null = null;
    private onUpdate?: (data: RS1.Nug) => void;
  
    constructor(config: { type: TileDisplay['type'], styles: string }) {
      this.type = config.type;
      this.styles = config.styles;
    }

    update(data: RS1.Nug): void {
      this.currentData = data;
      if (this.onUpdate) this.onUpdate(data);
    }
  
    render(data: RS1.Nug): TemplateResult {
      switch (this.type) {
        case 'text':
          return html`<div class="text-display"></div>`;
        
        case 'image':
          return html`<img src="" alt="Tile image" />`;
        
        case 'video':
          return html`<video src="" controls></video>`;
        
        case 'canvas':
          return html`<canvas id="tile-canvas"></canvas>`;

        case 'input':
          return html`<input type="text" .value="" />`;
        
        default:
          return html`<div></div>`;
      }
    }
  }

  class TileProcessor implements TileProcessorInterface {
    private currentFunction: (data?: RS1.Nug) => any;
  
    constructor(config: {process: (data?: RS1.Nug) => any}) {
      this.currentFunction = config.process;
    }
  
    process(input: RS1.Nug): RS1.Nug {
      return this.currentFunction(input);
    }
  
    setProcess(fn: (data?: RS1.Nug) => any): void {
      this.currentFunction = fn;
    }
  
    getProcess(): (data?: RS1.Nug) => any {
      return this.currentFunction;
    }
  }

  abstract class BaseInteraction implements BaseInteractionInterface {
    enabled: boolean = false;
    action?: () => void;
    protected interactInstance: any = null;
    
    set(action: () => void): void {
      this.action = action;
    }
    
    enable(): void {
      this.enabled = true;
    }
    
    disable(): void {
      this.enabled = false;
      this.remove();
    }
    
    abstract setup(element: HTMLElement): void;
    
    remove(element?: HTMLElement): void {
      if (this.interactInstance) {
        this.interactInstance.unset();
        this.interactInstance = null;
      }
      this.action = undefined;
    }
  }

  class DragInteraction extends BaseInteraction implements DragInteractionInterface {
    axis: 'x' | 'y' | 'xy' = 'xy';
    private restrictionTarget: string | HTMLElement | any = 'parent';
    
    setAxis(axis: 'x' | 'y' | 'xy'): void {
      this.axis = axis;
    }
    
    setRestriction(target: string | HTMLElement | any): void {
      this.restrictionTarget = target;
    }
    
    setup(element: HTMLElement): void {
      if (!this.enabled) return;
      
      let x = 0, y = 0;
      
      this.interactInstance = interact(element).draggable({
        startAxis: this.axis,
        lockAxis: this.axis,
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: this.restrictionTarget,
            endOnly: true
          })
        ],
        inertia: true,
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
          end: () => {
            if (this.action) this.action();
          }
        }
      });
    }
  }
  
  class ClickInteraction extends BaseInteraction implements ClickInteractionInterface {
    setup(element: HTMLElement): void {
      if (!this.enabled) return;
      
      element.addEventListener('click', () => {
        if (this.action) this.action();
      });
    }
  }
  
  class SwipeInteraction extends BaseInteraction implements SwipeInteractionInterface {
    minDistance: number = 60;
    maxTime: number = 500;
    
    setOptions(options: { minDistance?: number; maxTime?: number }): void {
      if (options.minDistance) this.minDistance = options.minDistance;
      if (options.maxTime) this.maxTime = options.maxTime;
    }
    
    setup(element: HTMLElement): void {
     
    }
  }

  class ResizeInteraction extends BaseInteraction implements ResizeInteractionInterface {
    edges: string = 'all';
    private restrictionTarget: string | HTMLElement | any = 'parent';

    setEdges(edges: string): void {
      this.edges = edges;
    }

    setRestriction(target: string | HTMLElement | any): void {
      this.restrictionTarget = target;
    }

    setup(element: HTMLElement): void {
      if (!this.enabled) return;
      
      let x = 0;
      let y = 0;
      let width = element.offsetWidth;
      let height = element.offsetHeight;
      
      interact(element)
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        modifiers: [
          interact.modifiers.restrictSize({
            min: { width: 50, height: 50 }
          }),
          interact.modifiers.restrictRect({
            restriction: this.restrictionTarget,
            endOnly: true
          })
        ],
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
            if (this.action) this.action();
          }
        }
      });
    }
  }

  class HoverInteraction extends BaseInteraction implements HoverInteractionInterface {
    setup(element: HTMLElement): void {
      element.addEventListener('mouseenter', () => {
        if (this.action) this.action();
      });

      element.addEventListener('mouseleave', () => {
        if (this.action) this.action();
      });
    }
  }   


  class TileInteraction implements TileInteractionInterface {
    drag: DragInteractionInterface;
    click: ClickInteractionInterface;
    swipe: SwipeInteractionInterface;
    resize: ResizeInteractionInterface;
    hover: HoverInteractionInterface;

    constructor() {
      this.drag = new DragInteraction();
      this.click = new ClickInteraction();
      this.swipe = new SwipeInteraction();
      this.resize = new ResizeInteraction();
      this.hover = new HoverInteraction();
    }

    setupAll(element: HTMLElement): void {  
      this.drag.setup(element);
      this.click.setup(element);
      this.swipe.setup(element);
      this.resize.setup(element);
      this.hover.setup(element);
    }

    removeAll(element: HTMLElement): void {
      this.drag.remove(element);
      this.click.remove(element);
      this.swipe.remove(element);
      this.resize.remove(element);
      this.hover.remove(element);
    }
  }


@customElement('rel-tile')
export class RTile extends LitElement {
  declare TDE: RS1.TDE;
  
  public tile?: MagicTile;

  static properties = {
    TDE: { type: RS1.TDE },
    id: { type: String },
  };

  constructor() {
    super();
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('TDE') && this.TDE) {
        const config = TileConfigBuilder.fromTDE(this.TDE, this.id);
        this.tile = new MagicTile(this, config);
    }
  }

  protected firstUpdated() {
    if (this.tile && this.shadowRoot && this.TDE) {
      const tileElement = this.shadowRoot.querySelector('div, button') as HTMLElement;
      if (tileElement) {
        const isDragEnabled = this.TDE.aList?.descByName('drag') === 'true';
        const dragAxis = this.TDE.aList?.descByName('dragAxis') as 'x' | 'y' | 'xy' || 'xy';

        const isResizeEnabled = this.TDE.aList?.descByName('resize') === 'true';
        const resizeEdges = this.TDE.aList?.descByName('resizeEdges') || 'all';
        
        if (isDragEnabled) {
          this.tile.interaction.drag.enable();
          this.tile.interaction.drag.setAxis(dragAxis);
          
          this.setupDragRestriction(tileElement);
        }

        if (isResizeEnabled) {
          this.tile.interaction.resize.enable();
          this.tile.interaction.resize.setEdges(resizeEdges);
          
          this.setupResizeRestriction(tileElement);
        }
        
        this.tile.interaction.setupAll(tileElement);
      }
    }
  }
  
  private setupDragRestriction(element: HTMLElement) {
    let restrictionTarget: string | HTMLElement = 'parent'; 
    
    if (this.TDE.parent !== undefined && this.TDE.parent !== -1) {
      let currentElement = this.parentElement;
      
      while (currentElement) {
        if (currentElement instanceof RTile) {
          const parentRTile = currentElement as RTile;
          const parentTileElement = parentRTile.shadowRoot?.querySelector('div, button') as HTMLElement;
          
          if (parentTileElement) {
            restrictionTarget = parentTileElement;
            break;
          }
        }
        currentElement = currentElement.parentElement;
      }
      
      if (restrictionTarget === 'parent') {
        console.warn(`Tile '${this.TDE.aList?.descByName('name')}' has a TList parent, but couldn't find parent RTile element. Using default restriction.`);
      }
    }
    
    (this.tile!.interaction.drag as any).setRestriction(restrictionTarget);
  }

  private setupResizeRestriction(element: HTMLElement) {
    let restrictionTarget: string | HTMLElement = 'parent';
    
    if (this.TDE.parent !== undefined && this.TDE.parent !== -1) {
      let currentElement = this.parentElement;
      
      while (currentElement) {
        if (currentElement instanceof RTile) {
          const parentRTile = currentElement as RTile;
          const parentTileElement = parentRTile.shadowRoot?.querySelector('div, button') as HTMLElement;
          
          if (parentTileElement) {
            restrictionTarget = parentTileElement;
            break;
          }
        }
        currentElement = currentElement.parentElement;
      }
    }
    
    (this.tile!.interaction.resize as any).setRestriction(restrictionTarget);
  }

  render() {
    if (!this.tile) {
      return html`<div>No tile data</div>`;
    }

    const data = this.tile.getCurrentData();
    const displayContent = this.tile.display.render(data);
    return this.tile.element.render(displayContent);
  }
}

@customElement('tilelist-renderer')
export class TileListRenderer extends LitElement {
  declare TList: RS1.TileList;
  
  static properties = {
    TList: { type: Object },
  };

  constructor() {
    super();
  }

  private renderTileAndChildren(tile: RS1.TDE): TemplateResult {
    if (!tile) {
      return html``;
    }

    console.log('Rendering tile:', tile.tileID?.ToString() || 'no-id', 'level:', tile.level);

    const childElements = []; 
    let currentChildIndex = tile.first; 

    while (currentChildIndex > 0 && currentChildIndex < this.TList.tiles.length) {
      const childTile = this.TList.tiles[currentChildIndex]; 
      if (childTile) {
        childElements.push(this.renderTileAndChildren(childTile));
        currentChildIndex = childTile.next; 
      } else {
        break;
      }
    }

    return html`
      <rel-tile .TDE=${tile}>
        ${childElements}
      </rel-tile>
    `;
  }

  render(): TemplateResult {
    if (!this.TList || !this.TList.tiles) {
      return html`<div>No TileList or tiles found</div>`;
    }

    
    const topLevelTiles = this.TList.tiles.filter(tile => tile && !tile.parent);

    if (topLevelTiles.length === 0) {
      return html`<div>No top-level tiles found</div>`;
    }

    return html`
      ${topLevelTiles.map(tile => this.renderTileAndChildren(tile))}
    `;
  }
}


