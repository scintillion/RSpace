<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import interact from 'interactjs';

	interface Props {
		id: string;
		styles?: string;
		content?: any;
		redirect?: string;
		// Click actions
		clickAction?: 'Redirect' | 'Alert' | 'VillaLink' | 'Bold' | 'Italic' | 'Underline' | string;
		alertContent?: string;
		link?: string; // For VillaLink
		// Interactions
		drag?: boolean | string;
		dragAxis?: 'x' | 'y' | 'xy';
		resize?: boolean | string;
		swipe?: boolean | string;
		hold?: boolean | string;
		hover?: boolean | string;
		click?: boolean | string;
		dblclick?: boolean | string;
		// Text editing
		innerEdit?: boolean | string;
		textPreview?: boolean | string;
		// Background image
		bgImage?: boolean | string;
		backgroundImage?: string;
		// Element type
		element?: 'div' | 'button';
		// Event handlers
		onTileLink?: (link: string) => void;
		onDelete?: () => void;
		onPositionUpdate?: (x: number, y: number) => void;
		onSizeUpdate?: (width: number, height: number) => void;
	}

	const {
		id,
		styles = '',
		content = '',
		redirect = '',
		clickAction = '',
		alertContent = '',
		link = '',
		drag = false,
		dragAxis = 'xy',
		resize = false,
		swipe = false,
		hold = false,
		hover = false,
		click = true,
		dblclick = false,
		innerEdit = false,
		textPreview = true,
		bgImage = false,
		backgroundImage = '',
		element = 'div',
		onTileLink,
		onDelete,
		onPositionUpdate,
		onSizeUpdate
	}: Props = $props();

	let tileElement: HTMLElement | null = $state(null);
	let isEditingText = $state(false);
	let textContent = $state('');
	let isHovering = $state(false);
	let currentBgImage = $state('');
	
	// Initialize from props
	$effect(() => {
		textContent = content || '';
	});
	
	$effect(() => {
		currentBgImage = backgroundImage || '';
	});
	let isEditingBg = $state(false);
	let bgPosition = $state({ x: 50, y: 50 });
	let bgSize = $state(100);
	let holdTimeout: ReturnType<typeof setTimeout> | null = null;
	let swipeStart = { x: 0, y: 0, time: 0 };

	// Convert string booleans to actual booleans - use $derived for reactivity
	const isDrag = $derived(typeof drag === 'string' ? drag === 'true' : drag);
	const isResize = $derived(typeof resize === 'string' ? resize === 'true' : resize);
	const isSwipe = $derived(typeof swipe === 'string' ? swipe === 'true' : swipe);
	const isHold = $derived(typeof hold === 'string' ? hold === 'true' : hold);
	const isHoverEnabled = $derived(typeof hover === 'string' ? hover === 'true' : hover);
	const isClickEnabled = $derived(typeof click === 'string' ? click === 'true' : click);
	const isDblClickEnabled = $derived(typeof dblclick === 'string' ? dblclick === 'true' : dblclick);
	const isInnerEdit = $derived(typeof innerEdit === 'string' ? innerEdit === 'true' : innerEdit);
	const isTextPreview = $derived(typeof textPreview === 'string' ? textPreview === 'true' : textPreview);
	const isBgImage = $derived(typeof bgImage === 'string' ? bgImage === 'true' : bgImage);

	// Determine element type - button if redirect exists or element prop is button
	const elementType = $derived(redirect || element === 'button' ? 'button' : 'div');

	function handleClick() {
		if (!isClickEnabled) return;

		// Handle clickAction if specified
		if (clickAction) {
			switch (clickAction) {
				case 'Redirect': {
					const redirectLink = redirect || link;
					if (redirectLink) {
						if (redirectLink.startsWith('http')) {
							window.location.href = redirectLink;
						} else {
							window.open(redirectLink, '_blank');
						}
					}
					break;
				}

				case 'Alert': {
					if (alertContent) {
						alert(alertContent);
					} else {
						alert('No alert content set');
					}
					break;
				}

				case 'VillaLink': {
					if (link && onTileLink) {
						onTileLink(link);
					} else if (link) {
						// Dispatch custom event for VillaLink
						const event = new CustomEvent('tileLink', {
							detail: { name: link },
							bubbles: true,
							composed: true
						});
						window.dispatchEvent(event);
					}
					break;
				}

				case 'Bold':
				case 'Italic':
				case 'Underline':
					applyTextFormatting(clickAction.toLowerCase());
					break;
			}
		} else if (redirect) {
			// Fallback to redirect if no clickAction
			window.open(redirect, '_blank');
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick();
		}
	}

	function handleDoubleClick() {
		if (!isDblClickEnabled) return;
		console.log('Double click detected on tile:', id);
		// Enable text editing on double click if innerEdit is enabled
		if (isInnerEdit && !isEditingText) {
			isEditingText = true;
		}
	}

	function handleLongPress() {
		if (!isHold) return;
		console.log('Long press detected on tile:', id);
	}

	function handleSwipe(direction: 'left' | 'right' | 'up' | 'down') {
		if (!isSwipe) return;
		console.log('Swipe detected:', direction, 'on tile:', id);
		// Dispatch swipe event
		const event = new CustomEvent('tileSwipe', {
			detail: { direction, tileId: id },
			bubbles: true,
			composed: true
		});
		window.dispatchEvent(event);
	}

	function applyTextFormatting(command: string) {
		// Find closest text editing element
		const textElement = tileElement?.querySelector('[contenteditable="true"]') as HTMLElement;
		if (textElement) {
			document.execCommand(command, false);
			textElement.focus();
		}
	}

	function saveText() {
		if (tileElement) {
			const editableElement = tileElement.querySelector('[contenteditable="true"]') as HTMLElement;
			if (editableElement) {
				textContent = editableElement.textContent || '';
			}
		}
		isEditingText = false;
	}

	function handleBackgroundImageUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file && file.type.startsWith('image/')) {
			const reader = new FileReader();
			reader.onload = (e) => {
				currentBgImage = `url("${e.target?.result}")`;
				if (tileElement) {
					tileElement.style.backgroundImage = currentBgImage;
				}
			};
			reader.readAsDataURL(file);
		}
	}

	function removeBackgroundImage() {
		currentBgImage = '';
		if (tileElement) {
			tileElement.style.backgroundImage = '';
		}
	}

	function setupInteractions() {
		if (!tileElement) return;
		const element = tileElement; // Store reference for closures

		// Setup drag
		if (isDrag) {
			let x = 0;
			let y = 0;

			interact(element).draggable({
				startAxis: dragAxis === 'x' || dragAxis === 'y' ? dragAxis : 'xy',
				lockAxis: dragAxis === 'x' || dragAxis === 'y' ? dragAxis : 'xy',
				inertia: true,
				modifiers: [
					interact.modifiers.restrictRect({
						restriction: 'parent',
						endOnly: true
					})
				],
				listeners: {
					start: () => {
						if (!element) return;
						const transform = window.getComputedStyle(element).getPropertyValue('transform');
						const matrix = new DOMMatrix(transform);
						x = matrix.m41;
						y = matrix.m42;
					},
					move: (event) => {
						if (!element || isEditingBg) return;
						x += event.dx;
						y += event.dy;
						element.style.transform = `translate(${x}px, ${y}px)`;
					},
					end: () => {
						if (onPositionUpdate) {
							onPositionUpdate(x, y);
						}
					}
				}
			});
		}

		// Setup resize
		if (isResize) {
			let width = element.offsetWidth;
			let height = element.offsetHeight;
			let x = 0;
			let y = 0;

			interact(element).resizable({
				edges: { left: true, right: true, bottom: true, top: true },
				modifiers: [
					interact.modifiers.restrictSize({
						min: { width: 50, height: 50 }
					})
				],
				listeners: {
					move: (event) => {
						if (!element || isEditingBg) return;
						const currentTransform = new DOMMatrix(element.style.transform);
						x = currentTransform.m41 + event.deltaRect.left;
						y = currentTransform.m42 + event.deltaRect.top;
						width = event.rect.width;
						height = event.rect.height;

						Object.assign(element.style, {
							width: `${width}px`,
							height: `${height}px`,
							transform: `translate(${x}px, ${y}px)`
						});
					},
					end: () => {
						if (onSizeUpdate) {
							onSizeUpdate(width, height);
						}
						if (onPositionUpdate) {
							onPositionUpdate(x, y);
						}
					}
				}
			});
		}

		// Setup swipe
		if (isSwipe) {
			let startX = 0;
			let startY = 0;
			let startTime = 0;

			element.addEventListener('touchstart', (e) => {
				startX = e.touches[0].clientX;
				startY = e.touches[0].clientY;
				startTime = Date.now();
			});

			element.addEventListener('touchend', (e) => {
				const endX = e.changedTouches[0].clientX;
				const endY = e.changedTouches[0].clientY;
				const endTime = Date.now();

				const deltaX = endX - startX;
				const deltaY = endY - startY;
				const absDeltaX = Math.abs(deltaX);
				const absDeltaY = Math.abs(deltaY);
				const deltaTime = endTime - startTime;

				if (deltaTime <= 500 && (absDeltaX >= 60 || absDeltaY >= 60)) {
					let direction: 'left' | 'right' | 'up' | 'down' | null = null;
					if (absDeltaX > absDeltaY) {
						direction = deltaX > 0 ? 'right' : 'left';
					} else {
						direction = deltaY > 0 ? 'down' : 'up';
					}
					if (direction) {
						handleSwipe(direction);
					}
				}
			});
		}

		// Setup hold (long press)
		if (isHold) {
			element.addEventListener('mousedown', () => {
				holdTimeout = setTimeout(() => {
					handleLongPress();
				}, 500);
			});

			element.addEventListener('mouseup', () => {
				if (holdTimeout) {
					clearTimeout(holdTimeout);
					holdTimeout = null;
				}
			});

			element.addEventListener('mouseleave', () => {
				if (holdTimeout) {
					clearTimeout(holdTimeout);
					holdTimeout = null;
				}
			});
		}
	}

	function cleanupInteractions() {
		if (tileElement) {
			interact(tileElement).unset();
		}
		if (holdTimeout) {
			clearTimeout(holdTimeout);
		}
	}

	onMount(() => {
		setupInteractions();
		// Update text content if provided
		if (content) {
			textContent = content;
		}
		// Set background image if provided
		if (backgroundImage && tileElement) {
			tileElement.style.backgroundImage = backgroundImage;
			currentBgImage = backgroundImage;
		}
	});

	onDestroy(() => {
		cleanupInteractions();
	});

	// Update background image when prop changes
	$effect(() => {
		const currentBg = backgroundImage;
		if (currentBg && tileElement) {
			tileElement.style.backgroundImage = currentBg;
			currentBgImage = currentBg;
		} else if (!currentBg && tileElement) {
			tileElement.style.backgroundImage = '';
			currentBgImage = '';
		}
	});
</script>

{#if elementType === 'button'}
	<button
		bind:this={tileElement}
		id={id}
		style={styles}
		onclick={handleClick}
		ondblclick={handleDoubleClick}
		onmouseenter={() => (isHovering = true)}
		onmouseleave={() => (isHovering = false)}
		class="master-tile"
		type="button"
	>
		{#if isInnerEdit && isEditingText}
			<div contenteditable="true" style="width: 100%; height: 100%;" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="textbox" tabindex="0">
				{@html textContent}
			</div>
			<span onclick={(e) => { e.stopPropagation(); saveText(); }} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); saveText(); } }} style="margin-top: 5px; padding: 5px 10px; cursor: pointer; display: inline-block;" role="button" tabindex="0">Save</span>
		{:else if isInnerEdit && !isTextPreview}
			<div contenteditable="true" style="width: 100%; height: 100%;" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="textbox" tabindex="0">
				{@html textContent}
			</div>
			<span onclick={(e) => { e.stopPropagation(); saveText(); }} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); saveText(); } }} style="margin-top: 5px; padding: 5px 10px; cursor: pointer; display: inline-block;" role="button" tabindex="0">Save</span>
		{:else}
			{@html textContent || content}
		{/if}
	</button>
{:else}
	<div
		bind:this={tileElement}
		id={id}
		style={styles}
		onclick={handleClick}
		onkeydown={handleKeyDown}
		ondblclick={handleDoubleClick}
		onmouseenter={() => (isHovering = true)}
		onmouseleave={() => (isHovering = false)}
		class="master-tile"
		class:hover={isHovering && isHoverEnabled}
		role={isClickEnabled ? 'button' : undefined}
	>
		{#if isInnerEdit && isEditingText}
			<div contenteditable="true" style="width: 100%; height: 100%; min-height: 50px;">
				{@html textContent}
			</div>
			<button onclick={(e) => { e.stopPropagation(); saveText(); }} style="margin-top: 5px; padding: 5px 10px; cursor: pointer;" type="button">Save</button>
		{:else if isInnerEdit && !isTextPreview}
			<div contenteditable="true" style="width: 100%; height: 100%; min-height: 50px;">
				{@html textContent}
			</div>
			<button onclick={(e) => { e.stopPropagation(); saveText(); }} style="margin-top: 5px; padding: 5px 10px; cursor: pointer;" type="button">Save</button>
		{:else if isInnerEdit}
			<div
				contenteditable="false"
				onclick={(e) => {
					e.stopPropagation();
					if (!isEditingText) {
						isEditingText = true;
					}
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						if (!isEditingText) {
							isEditingText = true;
						}
					}
				}}
				style="width: 100%; height: 100%; cursor: text;"
				role="textbox"
				tabindex="0"
			>
				{@html textContent || content}
			</div>
		{:else}
			{@html textContent || content}
		{/if}

		{#if isBgImage && isHovering}
			<div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 5px; z-index: 10;">
				{#if isEditingBg}
					{#if currentBgImage}
						<button onclick={(e) => { e.stopPropagation(); removeBackgroundImage(); }} style="padding: 5px 10px; cursor: pointer;" type="button">Remove</button>
						<button onclick={(e) => { e.stopPropagation(); isEditingBg = false; }} style="padding: 5px 10px; cursor: pointer;" type="button">Done</button>
					{:else}
						<label style="padding: 5px 10px; cursor: pointer; background: rgba(0,0,0,0.7); color: white; border-radius: 4px;">
							Upload
							<input
								type="file"
								accept="image/*"
								style="display: none;"
								onchange={(e) => { e.stopPropagation(); handleBackgroundImageUpload(e); }}
							/>
						</label>
						<button onclick={(e) => { e.stopPropagation(); isEditingBg = false; }} style="padding: 5px 10px; cursor: pointer;" type="button">Done</button>
					{/if}
				{:else}
					<button onclick={(e) => { e.stopPropagation(); isEditingBg = true; }} style="padding: 5px 10px; cursor: pointer; background: rgba(0,0,0,0.7); color: white; border-radius: 4px;" type="button">
						Background
					</button>
				{/if}
			</div>
		{/if}

		{#if onDelete && isHovering}
			<button
				onclick={(e) => { e.stopPropagation(); onDelete(); }}
				style="position: absolute; top: 10px; left: 10px; padding: 5px 10px; cursor: pointer; background: rgba(255,0,0,0.7); color: white; border-radius: 4px; z-index: 10;"
				type="button"
			>
				Delete
			</button>
		{/if}
	</div>
{/if}

<style>
	.master-tile {
		position: relative;
		box-sizing: border-box;
	}

	.master-tile.hover {
		transition: filter 0.3s ease, box-shadow 0.3s ease;
		filter: brightness(1.2);
		box-shadow: 0 0 15px rgba(255, 255, 255, 0.7);
	}
</style>
