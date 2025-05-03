import { Component, Entity } from '../core/Component';

export const SpawnRuleComponentType = Symbol('SpawnRuleComponent');

export interface SpawnConfig {
  spritePath: string;
  spawnChance: number;
  minDistanceFromStart: number;
  occupancyType: string;
  poolSize?: number;
  onCollect?: (entity: Entity) => void;
}

export class SpawnRuleComponent implements Component {
  public readonly type = SpawnRuleComponentType;
  public entity: Entity | null = null;
  public config: SpawnConfig;

  constructor(config: SpawnConfig) {
    this.config = config;
  }
} 