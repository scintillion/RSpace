import { LitElement, html, type PropertyValues, type ReactiveController, type TemplateResult } from 'lit';
import { customElement} from 'lit/decorators.js';
import { RS1 } from '$lib/RSsvelte.svelte';

type Data =  'text' | 'number' | 'image' | 'video' | 'audio' | 'file' | 'json' | 'buffer' | 'any';
type Display =  'text' | 'image' | 'video' | 'canvas' | 'form' | 'custom';

interface TileInterface {
    id: string;
    input: TileInputInterface;
    output: TileOutputInterface;
    display: TileDisplayInterface;
    processor: TileProcessorInterface;
}

interface TileInputInterface {
    receive(data: RS1.Nug, portName: string): void;
}

interface TileOutputInterface {
    send(data: RS1.Nug): void;
}

interface TileDisplayInterface {
    type: Display;
    render(data: any): TemplateResult;
  }

interface TileProcessorInterface {
    process(data?: RS1.Nug): any;
    setProcess(process: (data?: RS1.Nug) => any): void;
}

interface TileConfig {
    id: string;
    inputConfig: { inputPorts: Map<string, { types: Data[] }> };
    outputConfig: { outputType: string };
    displayConfig: { type: Display };
    processorConfig: { process: (data?: RS1.Nug) => any };
  }

class MagicTile implements TileInterface {
    id: string;
    input: TileInputInterface;
    output: TileOutputInterface;
    display: TileDisplayInterface;
    processor: TileProcessorInterface;
    
    private host: RTile

    constructor(host: RTile, config: TileConfig) {
        this.id = config.id;
        this.input = new TileInput(config.inputConfig);
        this.output = new TileOutput();
        this.display = new TileDisplay(config.displayConfig);
        this.processor = new TileProcessor(config.processorConfig);
        this.host = host;
    }
}

  class TileInput implements TileInputInterface {
    public inputPorts: Map<string, { types: Data[] }> = new Map();

    constructor(config: {inputPorts: Map<string, { types: Data[] }>}) {
        for (const [portName, portConfig] of config.inputPorts) {
            this.inputPorts.set(portName, { types: portConfig.types });
        }

        if (!config.inputPorts) {
            this.inputPorts.set('default', { types: ['any'] });
        }
    }
    receive(data: RS1.Nug, portName: string): void {

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
    private currentData: RS1.Nug | null = null;
    private onUpdate?: (data: RS1.Nug) => void;
  
    constructor(config: { type: TileDisplay['type'] }) {
      this.type = config.type;
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
        
        case 'form':
          return html`
            <form>
              <input type="text" .value="" />
              <button type="submit">Submit</button>
            </form>
          `;
        
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
  
  

@customElement('r-tile')
export class RTile extends LitElement {
  declare TDE: RS1.TDE;

  public tile?: MagicTile;

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('TDE') && this.TDE) {
        this.tile = new MagicTile(this, {
            id: '',
            inputConfig: { inputPorts: new Map() },
            outputConfig: { outputType: 'any' },
            displayConfig: { type: 'text' },
            processorConfig: { process: (data?: RS1.Nug) => data }
        });
    }
}
  
  render() {
    
  }
}
