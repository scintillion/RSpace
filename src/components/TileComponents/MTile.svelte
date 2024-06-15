<script lang="ts">
	export let AttrStr = "";
	export let StyleStr = "";

	function parseAttributes(attrStr: string) {
		const attrs: { [key: string]: string } = {};
		const regex = /(\w+)(?:\s*=\s*(["']?)(.*?)\2)?/g;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(attrStr))) {
			const attrName = match[1];
			let attrValue = match[3] || "true";

			attrs[attrName] = attrValue;
		}
		return attrs;
	}

	$: attributes = parseAttributes(AttrStr);
</script>

<div {...attributes} style={StyleStr}><slot /></div>
