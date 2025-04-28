import { Component, Entity } from '../core/Component';

export const GridPositionComponentType = Symbol('GridPositionComponent');

export class GridPositionComponent implements Component {
  public readonly type = GridPositionComponentType;
  public entity: Entity | null = null;
  
  constructor(
    public gridX: number = 0,
    public gridY: number = 0,
    public targetGridX: number = 0,
    public targetGridY: number = 0,
    public isMoving: boolean = false
  ) {
    this.targetGridX = gridX;
    this.targetGridY = gridY;
  }

  public setTargetPosition(x: number, y: number) {
    this.targetGridX = x;
    this.targetGridY = y;
    this.isMoving = true;
  }

  public reachedTarget(): boolean {
    return this.gridX === this.targetGridX && this.gridY === this.targetGridY;
  }
} 