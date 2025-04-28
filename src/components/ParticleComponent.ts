import { Component } from '../core/Component';
import { Entity } from '../core/Component';

export const ParticleComponentType = Symbol('ParticleComponent');

export interface ParticleData {
  color: number;
  size: number;
  lifetime: number;
  alpha: number;
  velocityX: number;
  velocityY: number;
}

export class ParticleComponent implements Component {
  public readonly type = ParticleComponentType;
  public particles: ParticleData[] = [];
  public isActive: boolean = false;
  public lastDirection: { x: number, y: number } = { x: 0, y: 0 };
  public entity: Entity | null = null;
} 