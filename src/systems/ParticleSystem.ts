import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { ParticleComponent, ParticleComponentType, ParticleData } from '../components/ParticleComponent';
import { TransformComponent, TransformComponentType } from '../components/TransformComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { World } from '../core/World';
import { ParticleStateComponent } from '../components/ParticleStateComponent';

@injectable()
export class ParticleSystem extends BaseSystem {
  readonly requiredComponents = [
    ParticleComponentType,
    TransformComponentType,
    VisualComponentType
  ];

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    const particleState = this.world?.getParticleState();
    if (!particleState) {
      console.error('[ParticleSystem] ParticleStateComponent not available');
      return;
    }

    // Clear previous frame's particles
    particleState.container.clear();

    for (const entity of entities) {
      const particleComponent = entity.getComponent<ParticleComponent>(ParticleComponentType);
      const transform = entity.getComponent<TransformComponent>(TransformComponentType);
      
      if (!particleComponent || !transform) continue;

      // Spawn new particles
      particleState.timeSinceLastSpawn += deltaTime;
      if (particleState.timeSinceLastSpawn >= particleState.PARTICLE_SPAWN_RATE) {
        this.spawnParticles(particleComponent, transform, particleState);
        particleState.timeSinceLastSpawn = 0;
      }

      this.updateParticles(particleComponent, transform, deltaTime, particleState);
    }
  }

  private updateParticles(
    particleComponent: ParticleComponent, 
    transform: TransformComponent,
    deltaTime: number, 
    particleState: ParticleStateComponent
  ): void {
    // Update and draw each particle
    for (let i = particleComponent.particles.length - 1; i >= 0; i--) {
      const particle = particleComponent.particles[i];
      particle.lifetime -= deltaTime;

      if (particle.lifetime <= 0) {
        particleComponent.particles.splice(i, 1);
        continue;
      }

      // Update position
      const progress = 1 - (particle.lifetime / particleState.PARTICLE_LIFETIME);
      const alpha = particleState.PARTICLE_ALPHA * (1 - progress);
      const size = particle.size * (1 - progress);
      
      // Calculate world position
      const worldX = transform.x + particle.velocityX * progress;
      const worldY = transform.y + particle.velocityY * progress;
      
      // Draw particle
      particleState.container
        .circle(worldX, worldY, size)
        .fill({ color: particle.color, alpha: alpha });
    }
  }

  private spawnParticles(
    particleComponent: ParticleComponent, 
    transform: TransformComponent,
    particleState: ParticleStateComponent
  ): void {
    // Spawn particles in the opposite direction of movement
    const direction = particleComponent.lastDirection;
    const angle = Math.atan2(direction.y, direction.x);
    
    // Spawn 2-3 particles
    const count = Math.floor(Math.random() * 2) + 2;
    
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * Math.PI / 4; // Random spread
      const particleAngle = angle + Math.PI + spread; // Opposite direction + spread
      
      const particle: ParticleData = {
        color: particleState.PARTICLE_COLOR,
        size: particleState.PARTICLE_SIZE,
        lifetime: particleState.PARTICLE_LIFETIME,
        alpha: particleState.PARTICLE_ALPHA,
        velocityX: Math.cos(particleAngle) * particleState.PARTICLE_INITIAL_SPEED,
        velocityY: Math.sin(particleAngle) * particleState.PARTICLE_INITIAL_SPEED
      };
      
      particleComponent.particles.push(particle);
    }
  }
} 