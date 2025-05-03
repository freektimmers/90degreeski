import { Component, Entity } from '../core/Component';

export const TileComponentType = Symbol('TileComponent');

export class TileComponent implements Component {
  public readonly type = TileComponentType;
  public entity: Entity | null = null;
  public gridX: number;
  public gridY: number;
  private processedBy: Set<string> = new Set();

  constructor(gridX: number, gridY: number) {
    this.gridX = gridX;
    this.gridY = gridY;
  }

  public isProcessedBy(occupancyType: string): boolean {
    return this.processedBy.has(occupancyType);
  }

  public markProcessedBy(occupancyType: string): void {
    this.processedBy.add(occupancyType);
  }
} 