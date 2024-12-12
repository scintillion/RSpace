import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import interact from 'interactjs';

@customElement('villa-plotter')
export class VillaPlotter extends LitElement {
    declare tileList: string[];
    static properties = { tileList: { type: Array } };

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
        }
        .tile {
            position: absolute;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: blue;
            cursor: grab;
        }
    `;

    firstUpdated() {
        const container = this.shadowRoot!.querySelector('.container');
    
        if (container instanceof HTMLElement) 
        interact(container).draggable({
            listeners: {
                move: event => this.onDragMove(event),
            },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: this.shadowRoot!.querySelector('.container') as HTMLElement,
                    endOnly: true
                }),
            ],
            inertia: true
        });
    }

    onDragMove(event: any) {
        const target = event.target;
        const dx = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;

        target.style.transform = `translate(${dx}px, 0)`;
        target.setAttribute('data-x', dx.toString());
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
            <div class="container">
                ${this.tileList.map(tileString => this.renderTile(tileString))}
            </div>
            <h2>5000 X 4000</h2>
            <p>swipe to move >>></p>
        `;
    }
}