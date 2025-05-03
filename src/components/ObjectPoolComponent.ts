import { Component, Entity } from '../core/Component';
import { OccupancyType } from './GridOccupancyComponent';
import { SpawnRuleComponent } from './SpawnRuleComponent';

export interface PooledObject {
  entity: Entity;
  isInUse: boolean;
  gridX: number;
  gridY: number;
  spawnRule: SpawnRuleComponent;
}

export interface ObjectPool {
  pool: PooledObject[];
  activeObjects: Map<string, PooledObject>;
}

export const ObjectPoolComponentType = Symbol('ObjectPoolComponent');

export class ObjectPoolComponent implements Component {
  public readonly type = ObjectPoolComponentType;
  public entity: Entity | null = null;
  
  public pools: Map<OccupancyType, ObjectPool> = new Map();
  public readonly DEFAULT_POOL_SIZE = 50;
} 