import type { RS1 } from "./RS";
import * as components from "../components/tiles/index";
import { mount, unmount } from "svelte";

export class Plotter {
  container: HTMLDivElement;
  list: RS1.TileList;
  private mountedComponents: Map<number, any> = new Map(); // Store mounted component instances

  constructor(List: RS1.TileList, container: HTMLDivElement) {
    this.list = List;
    this.container = container;
  }

  // Directly mount component instead of converting to HTML
  private MountComponent(comp: any, props: object, target: HTMLElement): any {
    return mount(comp, { target, props });
  }

  private CheckNum(str: string) {
    return /^\d+$/.test(str);
  }

  private CreateTile(tile: RS1.TDE): { element: HTMLElement; index: number } | undefined {
    if (!tile.aList || tile.Lists.length < 1) {
      console.error("Error: Invalid Tile");
      return undefined;
    }

    let styles = ``;
    let index = this.list.tiles.indexOf(tile);
    const cssProperties = tile.sList?.qToVIDs;
    cssProperties?.forEach((property) => {
      if (property.Name !== "row" && property.Name !== "column") {
        if (this.CheckNum(property.Desc)) {
          styles += `${property.Name}:${property.Desc}px;`;
        } else styles += `${property.Name}:${property.Desc};`;
      } else {
        if (tile.sList?.qNum(property.Name) === 1) {
          styles += `flex-direction:${property.Name};`;
        }
      }
    });

    // Get tile type to pass to component
    const tileType = tile.tileID?.tname || 'T';

    // Map TDE attributes to component props - just translate properties, don't make decisions
    const props: any = {
      id: `tile-${index}`,
      styles: styles,
      content: tile.aList?.qDescByName("inner") || "",
      tileType: tileType, // Pass tile type so T.svelte can determine element type
    };

    // Click actions
    const clickAction = tile.aList?.qDescByName("clickAction");
    if (clickAction) {
      props.clickAction = clickAction;
    }

    const redirect = tile.aList?.qDescByName("redirect");
    if (redirect) {
      props.redirect = redirect;
    }

    const alertContent = tile.aList?.qDescByName("alertContent");
    if (alertContent) {
      props.alertContent = alertContent;
    }

    const link = tile.aList?.qDescByName("link");
    if (link) {
      props.link = link;
    }

    const element = tile.aList?.qDescByName("element");
    if (element === "button" || element === "div") {
      props.element = element;
    }

    // Interactions - convert string 'true'/'false' to boolean
    const drag = tile.aList?.qDescByName("drag");
    if (drag !== undefined && drag !== '') {
      props.drag = drag === 'true' || String(drag).toLowerCase() === 'true';
    }

    const dragAxis = tile.aList?.qDescByName("dragAxis");
    if (dragAxis) {
      props.dragAxis = dragAxis as 'x' | 'y' | 'xy';
    }

    const resize = tile.aList?.qDescByName("resize");
    if (resize !== undefined && resize !== '') {
      props.resize = resize === 'true' || String(resize).toLowerCase() === 'true';
    }

    const swipe = tile.aList?.qDescByName("swipe");
    if (swipe !== undefined && swipe !== '') {
      props.swipe = swipe === 'true' || String(swipe).toLowerCase() === 'true';
    }

    const hold = tile.aList?.qDescByName("hold");
    if (hold !== undefined && hold !== '') {
      props.hold = hold === 'true' || String(hold).toLowerCase() === 'true';
    }

    const hover = tile.aList?.qDescByName("hover");
    if (hover !== undefined && hover !== '') {
      props.hover = hover === 'true' || String(hover).toLowerCase() === 'true';
    }

    const click = tile.aList?.qDescByName("click");
    if (click !== undefined && click !== '') {
      props.click = click === 'true' || String(click).toLowerCase() === 'true';
    }

    const dblclick = tile.aList?.qDescByName("dblclick");
    if (dblclick !== undefined && dblclick !== '') {
      props.dblclick = dblclick === 'true' || String(dblclick).toLowerCase() === 'true';
    }

    // Text editing
    const innerEdit = tile.aList?.qDescByName("innerEdit");
    if (innerEdit !== undefined && innerEdit !== '') {
      props.innerEdit = innerEdit === 'true' || String(innerEdit).toLowerCase() === 'true';
    }

    const textPreview = tile.aList?.qDescByName("textPreview");
    if (textPreview !== undefined && textPreview !== '') {
      props.textPreview = textPreview === 'true' || String(textPreview).toLowerCase() === 'true';
    }

    // Background image
    const bgImage = tile.aList?.qDescByName("BgImage");
    if (bgImage !== undefined && bgImage !== '') {
      props.bgImage = bgImage === 'true' || String(bgImage).toLowerCase() === 'true';
    }

    const backgroundImage = tile.sList?.qDescByName("background-image");
    if (backgroundImage && backgroundImage !== 'url("")') {
      props.backgroundImage = backgroundImage;
    }

    // Always use T_TC - it handles all tile types including buttons
    const component = components["T_TC" as keyof typeof components];
    
    // Create a temporary container to mount the component
    // Svelte will mount the component's root element as a child of this container
    const tempContainer = document.createElement("div");
    
    // Mount the component directly to preserve functionality
    const mountedComponent = this.MountComponent(component, props, tempContainer);
    
    // Store the mounted component for potential cleanup
    this.mountedComponents.set(index, mountedComponent);
    
    // Get the actual root element that the component created (first child of tempContainer)
    // This is the actual tile element (div or button) with the id we provided
    const tileElement = tempContainer.firstElementChild;
    
    if (!tileElement || !(tileElement instanceof HTMLElement)) {
      console.error("Failed to mount tile component");
      return undefined;
    }
    
    // Return the actual tile element, not the wrapper
    return { element: tileElement, index };
  }

  public PlotTiles() {
    this.list.tiles.forEach((tile: RS1.TDE, index: number) => {
      const result = this.CreateTile(tile);
      if (!result) return;
      
      if (!tile.parent) {
        // Top-level tile - append to container
        this.container.appendChild(result.element);
      } else if (tile.parent !== undefined && tile.parent !== -1) {
        // Child tile - find parent and append
        let parent = this.container.querySelector(`#tile-${tile.parent}`);
        if (parent) {
          parent.appendChild(result.element);
        } else {
          // Fallback: append to container if parent not found
          this.container.appendChild(result.element);
        }
      }
    });
  }

  // Cleanup method to destroy all mounted components
  public destroy() {
    this.mountedComponents.forEach((component) => {
      try {
        unmount(component);
      } catch (_) {
        // already unmounted or invalid
      }
    });
    this.mountedComponents.clear();
  }
}
