import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { IsometricMovementComponent, IsometricMovementComponentType, Direction } from '../components/IsometricMovementComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { Application } from 'pixi.js';

@injectable()
export class InputSystem extends BaseSystem {
  private queuedDirectionChange = false;
  private isMovingDownRight = true; // Start with down-right direction
  private needsFlip = false; // Track if we need to flip the sprite

  readonly requiredComponents = [
    IsometricMovementComponentType,
    VisualComponentType,
    GridPositionComponentType
  ];

  public reset(): void {
    // Reset input state
    this.queuedDirectionChange = false;
    this.isMovingDownRight = true; // Reset to initial direction (down-right)
    this.needsFlip = false;
  }

  setApp(app: Application): void {
    super.setApp(app);
    if (app.canvas) {
      app.canvas.addEventListener('click', () => this.handleTap());
      app.canvas.addEventListener('touchstart', () => this.handleTap());
    }
  }

  private handleTap() {
    // Only accept new input if we're not already processing a direction change
    if (!this.queuedDirectionChange) {
      this.queuedDirectionChange = true;
      this.needsFlip = true;
    }
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    if (!this.queuedDirectionChange && !this.needsFlip) return;

    for (const entity of entities) {
      const movement = entity.getComponent<IsometricMovementComponent>(IsometricMovementComponentType);
      const gridPos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);
      const visual = entity.getComponent<VisualComponent>(VisualComponentType);
      
      if (movement && gridPos && visual) {
        // Handle sprite flipping immediately on input
        if (this.needsFlip) {
          visual.flipX();
          this.needsFlip = false;
        }

        // Handle movement direction change when reaching tile center
        if (this.queuedDirectionChange && !gridPos.isMoving) {
          this.isMovingDownRight = !this.isMovingDownRight;
          movement.targetDirection = this.isMovingDownRight ? Direction.DownRight : Direction.DownLeft;
          this.queuedDirectionChange = false;
        }
      }
    }
  }
} 