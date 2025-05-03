import { injectable, inject } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { GridOccupancyComponent, GridOccupancyComponentType } from '../components/GridOccupancyComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { PlayerComponent, PlayerComponentType } from '../components/PlayerComponent';
import { World } from '../core/World';
import { GameState } from '../components/GameStateComponent';
import { CollisionComponent } from '../components/CollisionComponent';
import { IsometricMovementComponent, IsometricMovementComponentType, Direction } from '../components/IsometricMovementComponent';
import { TreeComponent, TreeComponentType } from '../components/TreeComponent';
import { TreeCollisionImminentComponent, TreeCollisionImminentComponentType } from '../components/TreeCollisionImminent';

@injectable()
export class CollisionSystem extends BaseSystem {
  // We only need GridPosition and Player components to track the player
  readonly requiredComponents = [
    GridPositionComponentType,
    PlayerComponentType
  ];


  private handleCollision(playerEntity: Entity): void {
    if (!this.world) return;

    const playerPos = playerEntity.getComponent<GridPositionComponent>(GridPositionComponentType);
    const movement = playerEntity.getComponent<IsometricMovementComponent>(IsometricMovementComponentType);
    if (!playerPos || !movement) return;

    // Always check current position
    const positions = [{ x: playerPos.gridX, y: playerPos.gridY }];

    // Check target position if we're moving there
    if (movement.currentDirection !== Direction.None) {
      positions.push({ x: playerPos.targetGridX, y: playerPos.targetGridY });
    }

    let hasTreeCollision = false;

    // First check if there's a tree at the current or target position
    const treeAtPositions = this.world.getEntities().some(entity => {
      if (!entity.hasComponent(TreeComponentType)) return false;

      const gridPos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);
      if (!gridPos) return false;

      // Check both current position and target position (if changing direction)
      return (gridPos.gridX === playerPos.gridX && gridPos.gridY === playerPos.gridY) ||
             (movement.targetDirection !== movement.currentDirection && 
              gridPos.gridX === playerPos.targetGridX && gridPos.gridY === playerPos.targetGridY);
    });

    // If there's a tree, mark it for collision prevention
    if (treeAtPositions) {
      hasTreeCollision = true;
    }

    // Now handle actual collisions for all entities
    for (const pos of positions) {
      // Check all entities for collisions at this position
      const collidingEntities = this.world.getEntities().filter(entity => {
        if (entity === playerEntity) return false;

        const gridPos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);
        const occupancy = entity.getComponent<GridOccupancyComponent>(GridOccupancyComponentType);
        
        return gridPos && occupancy && 
               gridPos.gridX === pos.x && 
               gridPos.gridY === pos.y;
      });

      // Add collision component to each colliding entity
      for (const entity of collidingEntities) {
        // Only add if not already colliding
        if (!entity.hasComponent(CollisionComponent.type)) {
          const collision = new CollisionComponent();
          collision.collidedWith = playerEntity;
          entity.addComponent(collision);

          // If this is a tree collision during movement, mark it
          if (entity.hasComponent(TreeComponentType) && movement.currentDirection !== Direction.None) {
            hasTreeCollision = true;
          }
        }
      }
    }

    // Update TreeCollisionImminent component based on tree collisions
    if (hasTreeCollision && !playerEntity.hasComponent(TreeCollisionImminentComponentType)) {
      playerEntity.addComponent(new TreeCollisionImminentComponent());
    } else if (!hasTreeCollision && playerEntity.hasComponent(TreeCollisionImminentComponentType)) {
      playerEntity.removeComponent(TreeCollisionImminentComponentType);
    }
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    if (!this.world) return;

    const gameState = this.world.getGameState();
    if (!gameState || gameState.currentState !== GameState.Playing) return;

    // Process collisions for each player entity
    for (const entity of entities) {
      this.handleCollision(entity);
    }
  }

  public onGameStateChanged(oldState: GameState, newState: GameState): void {
    if (newState === GameState.Starting) {
      // Reset any collision-related state if needed
    }
  }
} 