import { Component, Entity } from '../core/Component';

export const CoinComponentType = Symbol('CoinComponent');

export class CoinComponent implements Component {
  public readonly type = CoinComponentType;
  public entity: Entity | null = null;
  private isCollected: boolean = false;

  public collect(): void {
    this.isCollected = true;
    // Remove the entity from the world when collected
    if (this.entity && this.entity.world) {
      this.entity.world.removeEntity(this.entity);
    }
  }

  public hasBeenCollected(): boolean {
    return this.isCollected;
  }
} 