import { Component, Entity } from '../core/Component';

export const CoinComponentType = Symbol('CoinComponent');

export class CoinComponent implements Component {
  public readonly type = CoinComponentType;
  public entity: Entity | null = null;
} 