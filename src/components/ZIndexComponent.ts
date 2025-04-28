import { Component, Entity } from '../core/Component';
import { VisualComponent } from './VisualComponent';
import { GridPositionComponent } from './GridPositionComponent';

export const ZIndexComponentType = Symbol('ZIndexComponent');

export class ZIndexComponent implements Component {
  public readonly type = ZIndexComponentType;
  public entity: Entity | null = null;
  
  // Base Z-index for different types of entities
  // This allows us to group entities and ensure certain types are always above others
  public baseZ: number;

  // UI z-index constants
  static readonly UI = {
    VIGNETTE: 1000,
    COIN_COUNTER: 2000
  };

  constructor(baseZ: number = 0) {
    this.baseZ = baseZ;
  }

  // Calculate final Z-index based on grid position
  // Objects lower on the screen (higher Y) should appear in front
  public calculateZ(gridPos: GridPositionComponent): number {
    // Use Y position as main factor, higher Y means higher Z-index (appears in front)
    // Use X position as secondary factor to maintain consistent ordering for objects on same Y
    return this.baseZ + (gridPos.gridY * 1000) + gridPos.gridX;
  }
} 