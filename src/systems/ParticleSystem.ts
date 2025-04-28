import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { ParticleComponent, ParticleComponentType, ParticleData } from '../components/ParticleComponent';
import { TransformComponent, TransformComponentType } from '../components/TransformComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { World, GameState } from '../core/World';
import { Application, Graphics } from 'pixi.js';
import { MovementSystem } from './MovementSystem';

@injectable()
export class ParticleSystem extends BaseSystem {
  private readonly PARTICLE_LIFETIME = 1; // seconds
  private readonly PARTICLE_SPAWN_RATE = 0.05; // seconds - more frequent spawning
  private readonly PARTICLE_SIZE = 4; // Increased size
  private readonly PARTICLE_COLOR = 0x777777;
  private readonly PARTICLE_ALPHA = 0.5; // Increased alpha
  private readonly PARTICLE_INITIAL_SPEED = 300; // Increased initial speed
  private readonly PARTICLE_DRAG = 0.98; // Reduced drag for longer trails

  private particleContainer: Graphics | null = null;
  private timeSinceLastSpawn: number = 0;

  readonly requiredComponents = [
    ParticleComponentType,
    TransformComponentType,
    VisualComponentType
  ];

  constructor() {
    super();
  }

  public setWorld(world: World): void {
    this.world = world;
  }

  public setApp(app: Application): void {
    super.setApp(app);
    this.initializeParticleContainer();
  }

  private initializeParticleContainer(): void {
    if (!this.app?.stage) return;
    
    // Clean up existing container if it exists
    if (this.particleContainer) {
      this.particleContainer.destroy();
      this.particleContainer = null;
    }

    // Create new container
    this.particleContainer = new Graphics();
    
    // Add to world container instead of stage
    const movementSystem = this.world?.getSystem<MovementSystem>(MovementSystem);
    if (movementSystem?.worldContainer) {
      movementSystem.worldContainer.addChild(this.particleContainer);
    }
  }

  public cleanup(): void {
    if (this.particleContainer) {
      this.particleContainer.destroy();
      this.particleContainer = null;
    }
  }

  public reinitialize(): void {
    this.cleanup();
    this.initializeParticleContainer();
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    if (!this.app || !this.particleContainer) return;

    // Clear previous frame's particles
    this.particleContainer.clear();

    for (const entity of entities) {
      const particleComponent = entity.getComponent<ParticleComponent>(ParticleComponentType);
      if (particleComponent) {
        const transform = entity.getComponent<TransformComponent>(TransformComponentType);
        if (transform && particleComponent.isActive) {
          // Spawn new particles
          this.timeSinceLastSpawn += deltaTime;
          if (this.timeSinceLastSpawn >= this.PARTICLE_SPAWN_RATE) {
            this.spawnParticles(particleComponent, transform);
            this.timeSinceLastSpawn = 0;
          }
        }
        this.updateParticles(particleComponent, deltaTime);
      }
    }
  }

  private updateParticles(particleComponent: ParticleComponent, deltaTime: number): void {
    const transform = particleComponent.entity?.getComponent<TransformComponent>(TransformComponentType);
    if (!transform || !this.particleContainer) return;

    // Update and draw each particle
    for (let i = particleComponent.particles.length - 1; i >= 0; i--) {
      const particle = particleComponent.particles[i];
      particle.lifetime -= deltaTime;

      if (particle.lifetime <= 0) {
        particleComponent.particles.splice(i, 1);
        continue;
      }

      // Update position
      const progress = 1 - (particle.lifetime / this.PARTICLE_LIFETIME);
      const alpha = this.PARTICLE_ALPHA * (1 - progress);
      const size = particle.size * (1 - progress);
      
      // Calculate world position
      const worldX = transform.x + particle.velocityX * progress;
      const worldY = transform.y + particle.velocityY * progress;
      
      // Draw particle using new v8 API
      this.particleContainer
        .circle(worldX, worldY, size)
        .fill({ color: particle.color, alpha: alpha });
    }
  }

  private spawnParticles(particleComponent: ParticleComponent, transform: TransformComponent): void {
    // Spawn particles in the opposite direction of movement
    const direction = particleComponent.lastDirection;
    const angle = Math.atan2(direction.y, direction.x);
    
    // Spawn 2-3 particles
    const count = Math.floor(Math.random() * 2) + 2;
    
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * Math.PI / 4; // Random spread
      const particleAngle = angle + Math.PI + spread;
      
      const particle: ParticleData = {
        color: this.PARTICLE_COLOR,
        size: this.PARTICLE_SIZE,
        lifetime: this.PARTICLE_LIFETIME,
        alpha: this.PARTICLE_ALPHA,
        velocityX: Math.cos(particleAngle) * this.PARTICLE_INITIAL_SPEED,
        velocityY: Math.sin(particleAngle) * this.PARTICLE_INITIAL_SPEED
      };
      
      particleComponent.particles.push(particle);
    }
  }
} 