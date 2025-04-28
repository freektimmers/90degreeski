import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { SpeedBoostComponent, SpeedBoostComponentType } from '../components/SpeedBoostComponent';
import { IsometricMovementComponent, IsometricMovementComponentType } from '../components/IsometricMovementComponent';
import { World, GameState } from '../core/World';

@injectable()
export class SpeedBoostSystem extends BaseSystem {
  readonly requiredComponents = [
    SpeedBoostComponentType,
    IsometricMovementComponentType
  ];

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    if (!this.world || this.world.getCurrentState() !== GameState.Playing) return;

    for (const entity of entities) {
      const speedBoost = entity.getComponent<SpeedBoostComponent>(SpeedBoostComponentType);
      const movement = entity.getComponent<IsometricMovementComponent>(IsometricMovementComponentType);
      
      if (speedBoost && movement) {
        // Apply the speed multiplier to the movement speed
        movement.speed = movement.baseSpeed * speedBoost.getSpeedMultiplier();
      }
    }
  }

  protected onGameStateChanged(oldState: GameState, newState: GameState): void {
    if (newState === GameState.Starting) {
      // Reset speed boosts when game restarts
      const entities = this.world?.getEntities() || [];
      for (const entity of entities) {
        const speedBoost = entity.getComponent<SpeedBoostComponent>(SpeedBoostComponentType);
        if (speedBoost) {
          speedBoost.reset();
        }
      }
    }
  }
} 