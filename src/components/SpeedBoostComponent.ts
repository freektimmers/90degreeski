import { Component, Entity } from '../core/Component';

export const SpeedBoostComponentType = Symbol('SpeedBoostComponent');

export class SpeedBoostComponent implements Component {
  readonly type = SpeedBoostComponentType;
  entity: Entity | null = null;
  
  public speedMultiplier: number = 1.0;
  public multiplierIncrement: number = 0.05;
} 