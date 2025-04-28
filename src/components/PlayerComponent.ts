import { Component, Entity } from '../core/Component';

export const PlayerComponentType = Symbol('PlayerComponent');

export class PlayerComponent implements Component {
  public readonly type = PlayerComponentType;
  public entity: Entity | null = null;

  constructor() {}
} 