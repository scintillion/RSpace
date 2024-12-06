import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('villa-plotter')
export class VillaPlotter extends LitElement {
    declare tileList: string[];
    static properties = { tileList: { type: Array } };

    static styles = css`
        :host {
        display: block;
        width: 100vw;
        height: 100vh;
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
        }
    `;

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
        `;
    }
}