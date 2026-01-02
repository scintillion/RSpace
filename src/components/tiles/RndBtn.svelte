<script lang="ts">
	import Btn from './Btn.svelte';

	interface Props {
		[id: string]: any;
	}

	const props: Props = $props();
	
	// Add rounded border radius to button styles
	const styles = (props.styles || '') + 'border-radius:25px;';
</script>

<Btn {...props} styles={styles} />
