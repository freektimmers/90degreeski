import { Component, Entity } from '../core/Component';
import { VisualComponent } from './VisualComponent';
import { GridPositionComponent } from './GridPositionComponent';

export const ZIndexComponentType = Symbol('ZIndexComponent');

export class ZIndexComponent implements Component {
  public readonly type = ZIndexComponentType;
  public entity: Entity | null = null;

  // UI elements are always on top regardless of position
  static readonly UI = {
    COIN_COUNTER: 20000
  };

  constructor() {
    // No base Z needed - ordering is purely position based
  }

  // Calculate final Z-index based on grid position
  // Objects lower on the screen (higher Y) should appear in front
  public calculateZ(gridPos: GridPositionComponent): number {
    // Y position is the primary factor
    // X position breaks ties for objects on same Y for consistent ordering
    return (gridPos.gridY * 100) + (gridPos.gridX * 0.1);
  }
} 