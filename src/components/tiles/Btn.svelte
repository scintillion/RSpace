<script lang="ts">
	import T from './T.svelte';

	interface Props {
		[id: string]: any;
	}

	const props: Props = $props();
	
	// Ensure button element type and add default button styles
	const styles = (props.styles || '') + 'cursor:pointer;align-items:center;justify-content:center;display:flex;';
</script>

<T {...props} element="button" styles={styles} />
