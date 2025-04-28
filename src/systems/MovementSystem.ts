import { injectable, inject } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { TransformComponent, TransformComponentType } from '../components/TransformComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { IsometricMovementComponent, IsometricMovementComponentType, Direction } from '../components/IsometricMovementComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { GridService } from '../services/GridService';
import { Container } from 'pixi.js';
import { Application } from 'pixi.js';
import { ParticleComponent, ParticleComponentType } from '../components/ParticleComponent';

@injectable()
export class MovementSystem extends BaseSystem {
  public worldContainer: Container | null = null;

  readonly requiredComponents = [
    TransformComponentType,
    VisualComponentType,
    IsometricMovementComponentType,
    GridPositionComponentType
  ];

  constructor(
    @inject(GridService) private gridService: GridService
  ) {
    super();
  }

  public setApp(app: Application): void {
    super.setApp(app);
    if (app) {
      this.initializeWorldContainer();
    }
  }

  private initializeWorldContainer(): void {
    if (!this.app) return;
    
    // Create a world container that will be moved around
    this.worldContainer = new Container();
    this.app.stage.addChild(this.worldContainer);
    this.worldContainer.position.set(0, 0);
  }

  public cleanup(): void {
    if (this.worldContainer && this.app) {
      this.app.stage.removeChild(this.worldContainer);
      this.worldContainer.destroy();
      this.worldContainer = null;
    }
  }

  public reinitialize(): void {
    this.cleanup();
    this.initializeWorldContainer();
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    if (!this.worldContainer || !this.app) return;

    for (const entity of entities) {
      const transform = entity.getComponent<TransformComponent>(TransformComponentType);
      const movement = entity.getComponent<IsometricMovementComponent>(IsometricMovementComponentType);
      const gridPos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);
      const visual = entity.getComponent<VisualComponent>(VisualComponentType);
      const particleComponent = entity.getComponent<ParticleComponent>(ParticleComponentType);
      
      if (transform && movement && gridPos && visual) {
        // Only set new target position if we're not already moving
        if (!gridPos.isMoving && movement.targetDirection !== Direction.None) {
          const nextPosition = this.gridService.getNextGridPosition(
            gridPos.gridX,
            gridPos.gridY,
            movement.targetDirection
          );

          gridPos.setTargetPosition(nextPosition.x, nextPosition.y);
          movement.currentDirection = movement.targetDirection;
          movement.isMoving = true;
          gridPos.isMoving = true;

          // Update particle direction when starting movement
          if (particleComponent) {
            const direction = this.getDirectionVector(movement.targetDirection);
            particleComponent.lastDirection = direction;
            particleComponent.isActive = true;
          }
        }

        if (gridPos.isMoving) {
          // Calculate current and target positions in world space
          const targetWorldPos = this.gridService.gridToWorld(gridPos.targetGridX, gridPos.targetGridY);
          
          // Calculate direction and distance to target
          const dx = targetWorldPos.x - transform.x;
          const dy = targetWorldPos.y - transform.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 1) {
            // Reached target grid position
            transform.x = targetWorldPos.x;
            transform.y = targetWorldPos.y;
            gridPos.gridX = gridPos.targetGridX;
            gridPos.gridY = gridPos.targetGridY;
            gridPos.isMoving = false;
            movement.isMoving = false;
            movement.currentDirection = Direction.None;

            // Stop particles when movement ends
            if (particleComponent) {
              particleComponent.isActive = false;
            }
          } else {
            // Move towards target using the movement component's speed
            const moveDistance = movement.speed * deltaTime;
            const ratio = Math.min(moveDistance / distance, 1);

            transform.x += dx * ratio;
            transform.y += dy * ratio;
          }

          // Update visual position
          visual.container.position.set(transform.x, transform.y);

          // Center camera on character immediately without smoothing
          if (this.worldContainer && this.app) {
            // Calculate the position that will center the character on screen
            const screenCenterX = 0;
            const screenCenterY = 0;
            
            // Move the world container to center the character
            this.worldContainer.position.x = screenCenterX - transform.x;
            this.worldContainer.position.y = screenCenterY - transform.y;
          }
        } else {
          // Even when not moving, ensure the character is centered
          if (this.worldContainer && this.app) {
            const screenCenterX = 0;
            const screenCenterY = 0;
            
            this.worldContainer.position.x = screenCenterX - transform.x;
            this.worldContainer.position.y = screenCenterY - transform.y;
          }
        }
      }
    }
  }

  private getDirectionVector(direction: Direction): { x: number, y: number } {
    switch (direction) {
      case Direction.TopRight:
        return { x: 1, y: -1 };
      case Direction.TopLeft:
        return { x: -1, y: -1 };
      case Direction.DownRight:
        return { x: 1, y: 1 };
      case Direction.DownLeft:
        return { x: -1, y: 1 };
      default:
        return { x: 0, y: 0 };
    }
  }
} 