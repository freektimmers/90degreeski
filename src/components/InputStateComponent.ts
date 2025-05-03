import { Component, Entity } from '../core/Component';

export const InputStateComponentType = Symbol('InputStateComponent');

export class InputStateComponent implements Component {
  public readonly type = InputStateComponentType;
  public entity: Entity | null = null;
  
  public queuedDirectionChange: boolean = false;
  public isMovingDownRight: boolean = true;
  public lastTapTime: number = 0;
  public readonly TAP_DEBOUNCE: number = 1;

  constructor() {}
} 