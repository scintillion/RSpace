import type { RS1 } from "./RS";
import * as components from "../components/tiles/index";
import type { SvelteComponent } from "svelte";
import { mount } from "svelte";

export class Plotter {
  container: HTMLDivElement;
  list: RS1.TileList;

  constructor(List: RS1.TileList, container: HTMLDivElement) {
    this.list = List;
    this.container = container;
  }

  public PlotTiles() {
    this.list.tiles.forEach((tile: RS1.TDE, index: number) => {
      let HTMLTile = this.CreateTile(tile);
      if (!tile.parent) {
        this.container.innerHTML += HTMLTile;
      } else if (tile.parent) {
        let parent = this.container.querySelector(`#tile-${tile.parent}`);
        if (parent) {
          parent.innerHTML += HTMLTile;
        }
      }
    });
  }

  private GetHTML(comp: any, props: object): string {
    const div = document.createElement("div");
    mount(comp, { target: div, props }); // new svelte 5 api for mounting a component into a div
    return div.innerHTML;
  }

  private CheckNum(str: string) {
    return /^\d+$/.test(str);
  }

  private throwInvalidTile() {
    console.error("Error: Invalid Tile");
    return "<p>Invalid Tile</p>";
  }

  private CreateTile(tile: RS1.TDE) {
    if (!tile.aList || tile.Lists.length < 1) {
      return this.throwInvalidTile(); // throws error for invalid tile & renders html for it
    }

    let styles = ``;
    let index = this.list.tiles.indexOf(tile);
    const cssProperties = tile.sList.toVIDs;
    cssProperties.forEach((property) => {
      if (property.Name !== "row" && property.Name !== "column") {
        if (this.CheckNum(property.Desc)) {
          styles += `${property.Name}:${property.Desc}px;`;
        } else styles += `${property.Name}:${property.Desc};`;
      } else {
        if (tile.sList?.num(property.Name) === 1) {
          styles += `flex-direction:${property.Name};`;
        }
      }
    });

    const properties = tile.aList.toVIDs;
    let attributes: any = {};
    properties.forEach((property) => {
      attributes[property.Name] = property.Desc;
    });

    let content =
      tile.aList?.descByName("inner") !== undefined
        ? tile.aList?.descByName("inner")
        : "";

    const componentName = "T_TC"; // this is going to be a constant until we develop other tiles, uses master/magic-tile until further updates
    const component = components[componentName as keyof typeof components];
    let html = this.GetHTML(component, {
      styles: styles,
      id: `tile-${index}`,
      content: content,
      ...attributes,
    });
    return html;
  }
}
