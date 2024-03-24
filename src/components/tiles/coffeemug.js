import { html, css, LitElement } from 'lit';

export class CoffeeMug extends LitElement {
	static get properties() {
		return {
			size: {
				type: String
			}
		};
	}

	render() {
		return html`<div>This coffee mug's size is: ${this.size} ☕</div>`;
	}
}

customElements.define('coffee-mug', CoffeeMug);
