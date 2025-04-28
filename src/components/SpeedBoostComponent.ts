import { Component } from '../core/Component';

export const SpeedBoostComponentType = Symbol('SpeedBoostComponent');

export class SpeedBoostComponent implements Component {
  readonly type = SpeedBoostComponentType;
  entity: Component['entity'] = null;
  private speedMultiplier: number = 1.0;
  private readonly BOOST_PER_COIN = 0.1; // 10% speed increase per coin
  private readonly MAX_MULTIPLIER = Infinity; // Maximum 2x speed

  public addBoost(): void {
    this.speedMultiplier = Math.min(this.speedMultiplier + this.BOOST_PER_COIN, this.MAX_MULTIPLIER);
  }

  public getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  public reset(): void {
    this.speedMultiplier = 1.0;
  }
} 