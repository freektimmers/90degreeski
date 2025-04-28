import { Component, Entity } from '../core/Component';

export const IsometricMovementComponentType = Symbol('IsometricMovementComponent');

export enum Direction {
  None = 'none',
  TopRight = 'topRight',
  TopLeft = 'topLeft',
  DownRight = 'downRight',
  DownLeft = 'downLeft'
}

export class IsometricMovementComponent implements Component {
  public readonly type = IsometricMovementComponentType;
  public entity: Entity | null = null;
  public currentDirection: Direction = Direction.None;
  public targetDirection: Direction = Direction.None;
  public isMoving: boolean = false;
  public baseSpeed: number = 200;
  
  constructor(
    public speed: number = this.baseSpeed
  ) {}
} 