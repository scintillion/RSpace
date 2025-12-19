<script lang="ts">
	const props: { id: string; styles?: string; content?: any; redirect?: string; } = $props();
</script>

{#if props.redirect}
<!-- IN CASE A REDIRECT IS AVAILABLE, WE WANT TO RENDER A BUTTON INSTEAD OF A DIV -->
<button id={props.id} onclick={() => window.open(props.redirect ?? "")} style={props.styles ?? ""}>
	{props.content ?? ""}
</button>
{:else}
<!-- IN CASE A REDIRECT IS UNAVAILABLE, WE WANT TO RENDER A DIV INSTEAD OF A BUTTON -->
<div id={props.id} style={props.styles ?? ""}>
	{props.content ?? ""}
</div>
{/if}
