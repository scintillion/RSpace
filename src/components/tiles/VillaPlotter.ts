import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import interact from 'interactjs';

@customElement('villa-plotter')
export class VillaPlotter extends LitElement {
    declare tileList: string[];
    declare position : { x: number, y: number };
    declare panAxis: string;
    static properties = { tileList: { type: Array }, panAxis: { type: String }, position: { type: Object } };

    constructor() {
        super();
        this.panAxis = 'xy';
        this.position = { x: 0, y: 0 };
        this.tileList = [];
    }

    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
        }
        .container {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: auto;
            touch-action: pan-x pan-y;
            scrollbar-width: none;
        }
        .base {
            position: relative;
            width: 3000px;
            height: 2000px;
            background: linear-gradient(45deg, #f06, #9f6);
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

    firstUpdated() {
        const container = this.shadowRoot!.querySelector('.base');

        if (container instanceof HTMLElement) {
            interact(container).draggable({
                listeners: {
                    move: event => {
                        this.position.x += event.dx
                        this.position.y += event.dy                                          
                        event.target.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`
                    }
                },
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    }),
                ],
                inertia: true,
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
                <p>Use two fingers to scroll UP or DOWN</p>
                <p>or</p>
                <p>click and drag to move UP or DOWN</p>
            </div>
            <div class="container">
                <div class="base">
                    ${this.tileList.map(tileString => this.renderTile(tileString))}
                </div>
            </div>
        `;
    }
}