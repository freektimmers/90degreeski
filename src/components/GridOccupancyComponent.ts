import { Component, Entity } from '../core/Component';

export const GridOccupancyComponentType = Symbol('GridOccupancyComponent');

export enum OccupancyType {
  Character = 'character',
  Tree = 'tree',
  Coin = 'coin'
}

export class GridOccupancyComponent implements Component {
  public readonly type = GridOccupancyComponentType;
  public entity: Entity | null = null;

  constructor(
    public occupancyType: OccupancyType,
    public currentGridX: number = 0,
    public currentGridY: number = 0,
    public isOccupying: boolean = false
  ) {}

  public occupy(gridX: number, gridY: number): void {
    this.currentGridX = gridX;
    this.currentGridY = gridY;
    this.isOccupying = true;
  }

  public free(): void {
    this.isOccupying = false;
  }
} 