import { Component, Entity } from '../core/Component';

export const TransformComponentType = Symbol('TransformComponent');

export class TransformComponent implements Component {
  public readonly type = TransformComponentType;
  public entity: Entity | null = null;
  
  constructor(
    public x: number = 0,
    public y: number = 0,
    public rotation: number = 0
  ) {}
} 