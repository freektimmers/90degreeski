import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { IsometricMovementComponent, IsometricMovementComponentType, Direction } from '../components/IsometricMovementComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { Application } from 'pixi.js';
import { World } from '../core/World';

@injectable()
export class InputSystem extends BaseSystem {
  readonly requiredComponents = [
    IsometricMovementComponentType,
    VisualComponentType,
    GridPositionComponentType
  ];

  public setApp(app: Application): void {
    super.setApp(app);
    if (app) {
      app.stage.eventMode = 'static';
      app.stage.on('pointerdown', () => this.handleTap());
    }
  }

  private handleTap(): void {
    if (!this.world) return;
    
    const inputState = this.world.getInputState();
    if (!inputState) return;

    const now = Date.now();
    if (now - inputState.lastTapTime < inputState.TAP_DEBOUNCE) return;
    inputState.lastTapTime = now;
    
    // Queue the direction change for next grid cell
    inputState.queuedDirectionChange = true;
  }

  private updateVisualDirection(visual: VisualComponent, isMovingRight: boolean): void {
    if (!visual.sprite) return;

    const desiredScale = isMovingRight ? -Math.abs(visual.sprite.scale.x) : Math.abs(visual.sprite.scale.x);
    if (visual.sprite.scale.x !== desiredScale) {
        visual.sprite.scale.x = desiredScale;
    }
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    if (!this.world) return;
    
    const inputState = this.world.getInputState();
    if (!inputState) return;

    for (const entity of entities) {
      const movement = entity.getComponent<IsometricMovementComponent>(IsometricMovementComponentType);
      const gridPos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);
      const visual = entity.getComponent<VisualComponent>(VisualComponentType);
      
      if (movement && gridPos && visual) {
        // Queue direction change
        if (inputState.queuedDirectionChange) {
          // Toggle direction immediately for visuals
          inputState.isMovingDownRight = !inputState.isMovingDownRight;
          
          // Update visual direction immediately
          this.updateVisualDirection(visual, inputState.isMovingDownRight);
          
          // Queue the actual movement direction change
          const newDirection = inputState.isMovingDownRight ? Direction.DownRight : Direction.DownLeft;
          movement.targetDirection = newDirection;
          
          // Clear the queue
          inputState.queuedDirectionChange = false;
        }
      }
    }
  }
} 