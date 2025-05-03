import { Component } from '../core/Component';
import { Entity } from '../core/Component';

export const CoinCounterComponentType = Symbol('CoinCounterComponent');

export class CoinCounterComponent implements Component {
  public readonly type = CoinCounterComponentType;
  public entity: Entity | null = null;
  
  public count: number = 0;
  public highscore: number = 0;
} 