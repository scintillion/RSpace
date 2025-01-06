import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import interact from 'interactjs';

@customElement('villa-plotter')
export class VillaPlotter extends LitElement {
    declare tileList: string[];
    declare position : { x: number, y: number };
    declare panAxis: string;
    static properties = { tileList: { type: Array }, panAxis: { type: String } };

    constructor() {
        super();
        this.panAxis = 'xy';
        this.position = { x: 0, y: 0 };
    }

    static styles = css`
        :host {
            display: block;
            width: 5000px;
            height: 4000px;
        }
        .container {
            position: relative;
            width: 100%;
            height: 100%;
            transform: translate(0, 0);
            touch-action: none;
        }
        .tile {
            position: absolute;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: blue;
        }
        .controls {
            position: fixed;
            z-index: 100;
        }
    `;

    updated() {
        const container = this.shadowRoot!.querySelector('.container');
        
        if (container instanceof HTMLElement) {
            interact(container).draggable({
                listeners: {
                    move: event => {
                        this.position.x += event.dx
                        this.position.y += event.dy
                  
                        event.target.style.transform =
                          `translate(${this.position.x}px, ${this.position.y}px)`
                    }
                },
                modifiers: [
                    interact.modifiers.restrict({
                        restriction: 'parent',
                        endOnly: true
                    }),
                ],
                inertia: true,
                startAxis: this.panAxis as 'x' | 'y' | 'xy',
                lockAxis: 'start'
            });
        }
    }

    renderTile(tile: string) {
        const [name, x, y, xDim, yDim] = tile.split(',').map((val, index) => index === 0 ? val : parseFloat(val));
        return html`
            <div 
            class="tile" 
            style="
            left: ${x}%; 
            top: ${y}%; 
            width: ${xDim}%; 
            height: ${yDim}%;"
        >
                ${name}
            </div>
        `;
    }

    render() {
        return html`
            <div class="controls">
                <h2>5000 X 4000</h2>
                <p>click and drag to move</p>
                <p>click button to toggle pan axis</p>
                <button @click=${() => this.panAxis = this.panAxis === 'x' ? 'y' : this.panAxis === 'y' ? 'xy' : 'x'}>
                pan: ${this.panAxis}
                </button>
            </div>
            <div class="container">
                ${this.tileList.map(tileString => this.renderTile(tileString))}
            </div>
        `;
    }
}