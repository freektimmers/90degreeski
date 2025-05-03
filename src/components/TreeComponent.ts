import { Component, Entity } from '../core/Component';

export const TreeComponentType = Symbol('TreeComponent');

export class TreeComponent implements Component {
  readonly type = TreeComponentType;
  entity: Entity | null = null;
} 