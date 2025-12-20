<script lang="ts">
	const { id, styles, content, redirect }: { id: string; styles?: string; content?: any; redirect?: string; } = $props();
	
	function handleButtonClick() {
		console.log("red")
		window.open(redirect)
	}
</script>

{#if redirect}
<!-- IN CASE A REDIRECT IS AVAILABLE, WE WANT TO RENDER A BUTTON INSTEAD OF A DIV -->
<button id={id} onclick={handleButtonClick} style={styles ?? ""}>
	{content ?? ""}
</button>
{:else}
<!-- IN CASE A REDIRECT IS UNAVAILABLE, WE WANT TO RENDER A DIV INSTEAD OF A BUTTON -->
<div id={id} style={styles ?? ""}>
	{content ?? ""}
</div>
{/if}
