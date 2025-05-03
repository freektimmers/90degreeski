import { Component, Entity } from '../core/Component';
import { Graphics } from 'pixi.js';

export const ParticleStateComponentType = Symbol('ParticleStateComponent');

export class ParticleStateComponent implements Component {
  public readonly type = ParticleStateComponentType;
  public entity: Entity | null = null;
  
  // Particle container
  public container: Graphics;
  public timeSinceLastSpawn: number = 0;

  // Configuration
  public readonly PARTICLE_LIFETIME = 1; // seconds
  public readonly PARTICLE_SPAWN_RATE = 0.05; // seconds
  public readonly PARTICLE_SIZE = 4;
  public readonly PARTICLE_COLOR = 0x777777;
  public readonly PARTICLE_ALPHA = 0.5;
  public readonly PARTICLE_INITIAL_SPEED = 300;
  public readonly PARTICLE_DRAG = 0.98;

  constructor() {
    this.container = new Graphics();
  }

  public destroy(): void {
    if (this.container) {
      this.container.destroy();
    }
  }
} 