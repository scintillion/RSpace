<script lang="ts">
	import '../app.css';

	let title = 'Relational Spaces';
</script>

<svelte:head>
	<title>{title}</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0"
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
		rel="stylesheet"
	/>
	<style>
		/* Don't reset padding: 0 on * — it overrides Tailwind padding utilities */
		* {
			margin: 0;
			box-sizing: border-box;
			font-family: 'Montserrat', sans-serif;
		}
		/* Avoid overflow: hidden on * so fixed modals and their buttons aren't clipped or blocked */
		html, body {
			overflow-x: hidden;
		}
	</style>
</svelte:head>

<div class="container">
	<div class="slot-full-width">
		<slot />
	</div>
</div>

<style lang="scss">
	.container {
		display: flex;
		flex-direction: column;
		width: 100vw;
		min-height: 100vh;
		background: #1e1e1e;
		color: white;
	}

	/* Let page content (e.g. sample-tiles) fill width; pages that want centering can add it themselves */
	.slot-full-width {
		flex: 1;
		width: 100%;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
</style>
