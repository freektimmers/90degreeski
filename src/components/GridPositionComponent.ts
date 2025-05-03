import { Component, Entity } from '../core/Component';

export const GridPositionComponentType = Symbol('GridPositionComponent');

export class GridPositionComponent implements Component {
  public readonly type = GridPositionComponentType;
  public entity: Entity | null = null;
  private _gridX: number;
  private _gridY: number;
  private _previousGridX: number;
  private _previousGridY: number;

  constructor(
    gridX: number,
    gridY: number,
    public targetGridX: number = 0,
    public targetGridY: number = 0,
    public isMoving: boolean = false
  ) {
    this._gridX = gridX;
    this._gridY = gridY;
    this._previousGridX = gridX;
    this._previousGridY = gridY;
    this.targetGridX = gridX;
    this.targetGridY = gridY;
  }

  get gridX(): number {
    return this._gridX;
  }

  set gridX(value: number) {
    this._previousGridX = this._gridX;
    this._gridX = value;
  }

  get gridY(): number {
    return this._gridY;
  }

  set gridY(value: number) {
    this._previousGridY = this._gridY;
    this._gridY = value;
  }

  get previousGridX(): number {
    return this._previousGridX;
  }

  get previousGridY(): number {
    return this._previousGridY;
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