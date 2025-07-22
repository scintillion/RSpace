import { LitElement, css, html, type PropertyValues, type ReactiveController, type TemplateResult } from 'lit';
import { customElement} from 'lit/decorators.js';
import { RS1 } from '$lib/RSsvelte.svelte';

type Data =  'text' | 'number' | 'image' | 'video' | 'audio' | 'file' | 'json' | 'buffer' | 'any';
type Display =  'div' | 'button' | 'text' | 'image' | 'video' | 'canvas' | 'input' | 'custom';

interface TileInterface {
    id: string;
    input: TileInputInterface;
    output: TileOutputInterface;
    display: TileDisplayInterface;
    processor: TileProcessorInterface;
    interaction: TileInteractionInterface;
}

interface TileInputInterface {
    ports: Map<string, InputPortInterface>;
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

interface TileInteraction {
  type: string;
  action: string;
}

interface TileOutputInterface {
    send(data: RS1.Nug): void;
}

interface TileDisplayInterface {
    type: Display;
    styles: string;
    render(data: any): TemplateResult;
  }

interface TileProcessorInterface {
    process(data?: RS1.Nug): any;
    setProcess(process: (data?: RS1.Nug) => any): void;

}

interface TileInteractionInterface {
  interactions: TileInteraction[];
  addInteraction(element: HTMLElement, interaction: TileInteraction): void;
  removeInteraction(element: HTMLElement, interaction: TileInteraction): void;
}

interface TileConfig {
    id: string;
    inputConfig: { inputPorts: InputPortInterface[]};
    outputConfig: { outputType: string };
    displayConfig: { type: Display, styles: string };
    processorConfig: { process: (data?: RS1.Nug) => any };
    interactionConfig: { interactions: TileInteraction[] };
  }

class TileConfigBuilder {
    static fromTDE(tde: RS1.TDE, id: string): TileConfig {
        return {
            id: id,
            inputConfig: { inputPorts: [{type: ['any'], currentData: null, required: false}] },
            outputConfig: { outputType: tde.aList?.descByName('outputType') || 'any' },
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
    display: TileDisplayInterface;
    processor: TileProcessorInterface;
    interaction: TileInteractionInterface;
    
    private host: RTile

    constructor(host: RTile, config: TileConfig) {
        this.id = config.id;
        this.input = new TileInput(config.inputConfig);
        this.output = new TileOutput();
        this.display = new TileDisplay(config.displayConfig);
        this.processor = new TileProcessor(config.processorConfig);
        this.interaction = new TileInteraction(config.interactionConfig);
        this.host = host;
    }
}

  class TileInput implements TileInputInterface {
    public ports: Map<string, InputPortInterface> = new Map();

    constructor(config: {inputPorts: InputPortInterface[]}) {
        for (const port of config.inputPorts) {
            this.ports.set('default', port);
        }

        if (!config.inputPorts) {
            this.ports.set('default', { type: ['any'], required: false, currentData: null });
        }
    }
    receive(data: RS1.Nug, portName: string): void {

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
        case 'div':
          return html`<div></div>`;

        case 'button':
          return html`<button></button>`;

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

  class TileInteraction implements TileInteractionInterface {
    interactions: TileInteraction[] = [];

    constructor(config: {interactions: TileInteraction[]}) {
      this.interactions = config.interactions;
    }

    addInteraction(element: HTMLElement, interaction: TileInteraction): void {
      this.interactions.push(interaction);
    }

    removeInteraction(element: HTMLElement, interaction: TileInteraction): void {
      this.interactions = this.interactions.filter(i => i !== interaction);
    }
  }
  

@customElement('r-tile')
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

  render() {
    return html`
      <div class="tile-container"
           style=${this.tile?.display.styles}
        ${this.tile?.display.render(this.tile?.processor.process())}
        <slot></slot>
      </div>
    `;
  }
}

