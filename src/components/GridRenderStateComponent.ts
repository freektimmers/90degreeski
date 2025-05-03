import { Component, Entity } from '../core/Component';
import { Container, Graphics } from 'pixi.js';

export interface GridTile {
  graphics: Graphics;
  isInUse: boolean;
  gridX: number;
  gridY: number;
  entity: Entity;
}

export const GridRenderStateComponentType = Symbol('GridRenderStateComponent');

export class GridRenderStateComponent implements Component {
  public readonly type = GridRenderStateComponentType;
  public entity: Entity | null = null;
  
  public container: Container;
  public activeTiles: Map<string, GridTile> = new Map();
  public tilePool: GridTile[] = [];
  public tileGraphicsTemplate: Graphics | null = null;
  public isInitialized: boolean = false;

  constructor() {
    this.container = new Container();
  }

  public destroy(): void {
    // Clean up all tiles
    this.tilePool.forEach(tile => {
      if (tile.graphics) {
        tile.graphics.destroy();
      }
    });
    
    // Clean up template if it exists
    if (this.tileGraphicsTemplate) {
      this.tileGraphicsTemplate.destroy();
    }

    // Clean up container
    if (this.container) {
      this.container.destroy({ children: true });
    }

    // Clear collections
    this.activeTiles.clear();
    this.tilePool = [];
    this.isInitialized = false;
  }
} 