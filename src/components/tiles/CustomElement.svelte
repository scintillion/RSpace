<script lang="ts">
    import { onMount } from 'svelte';

  
    export class CustomElement extends HTMLElement {
      constructor() {
        super();
  
        // Your custom element logic here
      }
    }
  
// @customElement 'custom-element'

    onMount(() => {
      customElements.define('custom-element', CustomElement);
    });
  </script>
  
  <svelte:element this="custom-element">
    <!-- Your custom element's template -->
    <p>QED</p>
    <div>Hello XXX from Custom Element</div>
  </svelte:element>
  