import { injectable, inject } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { TransformComponent, TransformComponentType } from '../components/TransformComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { IsometricMovementComponent, IsometricMovementComponentType, Direction } from '../components/IsometricMovementComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { GridService } from '../services/GridService';
import { GridOccupancyService, OccupancyType } from '../services/GridOccupancyService';
import { PlayerComponent, PlayerComponentType } from '../components/PlayerComponent';
import { GameState } from '../components/GameStateComponent';
import { SpeedBoostComponent, SpeedBoostComponentType } from '@/components/SpeedBoostComponent';
import { TreeComponent, TreeComponentType } from '../components/TreeComponent';
import { CollisionComponent, CollisionComponentType } from '../components/CollisionComponent';
import { TreeCollisionImminentComponentType } from '../components/TreeCollisionImminent';

@injectable()
export class MovementSystem extends BaseSystem {
    private readonly MIN_DELTA = 1/120; // Increased precision for smoother movement
    private readonly MAX_DELTA = 1/30; // Cap delta time to prevent large jumps
    private readonly INTERPOLATION_FACTOR = 0.85; // Smoothing factor for movement
    private readonly SPEED_ADAPTATION_RATE = 0.1; // How quickly to adapt to frame rate changes
    private readonly MIN_SPEED_MULTIPLIER = 0.8;
    private readonly MAX_SPEED_MULTIPLIER = 1.2;
    private speedMultiplier = 1.0; // Dynamic speed multiplier

    readonly requiredComponents = [
        TransformComponentType,
        VisualComponentType,
        IsometricMovementComponentType,
        GridPositionComponentType,
        SpeedBoostComponentType
    ];

    constructor(
        @inject(GridService) private gridService: GridService,
        @inject(GridOccupancyService) private gridOccupancyService: GridOccupancyService
    ) {
        super();
    }

    private updateSpeedMultiplier(deltaTime: number): void {
        // Adapt speed based on frame rate
        const targetMultiplier = (1/60) / deltaTime; // Target 60 FPS
        const clampedTarget = Math.max(
            this.MIN_SPEED_MULTIPLIER,
            Math.min(this.MAX_SPEED_MULTIPLIER, targetMultiplier)
        );
        
        // Smoothly interpolate to target
        this.speedMultiplier += (clampedTarget - this.speedMultiplier) * this.SPEED_ADAPTATION_RATE;
    }

    private isTreeCollisionBeingHandled(): boolean {
        if (!this.world) return false;
        
        // Check all entities with TreeComponent and CollisionComponent
        const collidingTree = this.world.getEntities().find(entity => 
            entity.hasComponent(TreeComponentType) &&
            entity.hasComponent(CollisionComponentType) &&
            entity.getComponent<CollisionComponent>(CollisionComponentType)?.isBeingHandled
        );

        if (!collidingTree) return false;

        // Only stop movement if we've reached the tree's position
        const collision = collidingTree.getComponent<CollisionComponent>(CollisionComponentType);
        if (!collision || !collision.collidedWith) return false;

        const playerPos = collision.collidedWith.getComponent<GridPositionComponent>(GridPositionComponentType);
        const treePos = collidingTree.getComponent<GridPositionComponent>(GridPositionComponentType);

        if (!playerPos || !treePos) return false;

        // Only stop movement if we're at the tree's position
        return playerPos.gridX === treePos.gridX && playerPos.gridY === treePos.gridY;
    }

    private updateCamera(x: number, y: number): void {
        const worldContainer = this.world?.getWorldContainer();
        if (!worldContainer) return;

        // Directly set camera position to center on character
        worldContainer.container.position.x = -x;
        worldContainer.container.position.y = -y;

        // Update stored camera position
        worldContainer.cameraX = worldContainer.container.position.x;
        worldContainer.cameraY = worldContainer.container.position.y;
    }

    private canMoveToPosition(x: number, y: number): boolean {
        // Only check if the position is valid on the grid
        return this.gridService.isValidGridPosition(x, y);
    }

    private updateEntityMovement(entity: Entity, deltaTime: number): void {
        // If a tree collision is being handled, don't allow any movement
        if (this.isTreeCollisionBeingHandled()) return;

        const transform = entity.getComponent<TransformComponent>(TransformComponentType);
        const gridPos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);
        const visual = entity.getComponent<VisualComponent>(VisualComponentType);
        const movement = entity.getComponent<IsometricMovementComponent>(IsometricMovementComponentType);
        const speedBoost = entity.getComponent<SpeedBoostComponent>(SpeedBoostComponentType);

        if (!transform || !gridPos || !visual || !movement) return;

        // Handle movement direction changes
        if (movement.targetDirection !== movement.currentDirection) {
            // If tree collision is imminent, ignore direction changes
            if (entity.hasComponent(TreeCollisionImminentComponentType)) {
                movement.targetDirection = movement.currentDirection;
                return;
            }

            // Only change direction when close enough to a grid position
            const currentWorldPos = { x: transform.x, y: transform.y };
            const currentGridPos = this.gridService.worldToGrid(currentWorldPos.x, currentWorldPos.y);
            const snappedWorldPos = this.gridService.snapToGrid(currentWorldPos.x, currentWorldPos.y);
            
            // More forgiving grid point detection during frame drops
            const threshold = this.gridService.GRID_ARRIVAL_THRESHOLD * 
                Math.min(2.0, Math.max(1.0, 1/deltaTime/30));
            
            const isOnGridPoint = 
                Math.abs(currentWorldPos.x - snappedWorldPos.x) < threshold &&
                Math.abs(currentWorldPos.y - snappedWorldPos.y) < threshold;

            if (isOnGridPoint) {

                const nextPos = this.gridService.getNextGridPosition(
                    Math.round(currentGridPos.x),
                    Math.round(currentGridPos.y),
                    movement.targetDirection
                );

                if (this.canMoveToPosition(nextPos.x, nextPos.y)) {
                    gridPos.setTargetPosition(nextPos.x, nextPos.y);
                    movement.currentDirection = movement.targetDirection;
                } else {
                    movement.targetDirection = Direction.None;
                    movement.currentDirection = Direction.None;
                }
            }
        }

        // Handle movement
        if (movement.currentDirection !== Direction.None) {
            const targetWorldPos = this.gridService.gridToWorld(gridPos.targetGridX, gridPos.targetGridY);
            const dx = targetWorldPos.x - transform.x;
            const dy = targetWorldPos.y - transform.y;
            const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

            // Update speed multiplier based on frame rate
            this.updateSpeedMultiplier(deltaTime);

            if (distanceToTarget < this.gridService.GRID_ARRIVAL_THRESHOLD) {
                // Store our exact current position before any updates
                const exactCurrentPos = { x: transform.x, y: transform.y };
                
                // Update logical grid position
                gridPos.gridX = gridPos.targetGridX;
                gridPos.gridY = gridPos.targetGridY;

                // Get next position in current direction
                const nextPos = this.gridService.getNextGridPosition(
                    gridPos.gridX,
                    gridPos.gridY,
                    movement.currentDirection
                );

                if (this.canMoveToPosition(nextPos.x, nextPos.y)) {
                    gridPos.setTargetPosition(nextPos.x, nextPos.y);
                } else {
                    movement.currentDirection = Direction.None;
                }
            } else {
                // Calculate adaptive movement speed
                const baseSpeed = (this.gridService.MOVEMENT_SPEED) * deltaTime * this.speedMultiplier;
                const boostMultiplier = speedBoost ? speedBoost.speedMultiplier : 1.0;
                const speed = baseSpeed * boostMultiplier;
                
                // Calculate smooth movement with interpolation
                const ratio = Math.min(speed / distanceToTarget, 1);
                const smoothRatio = 1 - Math.pow(1 - ratio, this.INTERPOLATION_FACTOR);
                
                // Update position with interpolation
                transform.x += dx * smoothRatio;
                transform.y += dy * smoothRatio;
                
                // Update visual position
                visual.container.position.set(transform.x, transform.y);
            }
        }
    }

    protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
        if (!this.world) return;

        const gameState = this.world.getGameState();
        if (!gameState || gameState.currentState !== GameState.Playing) return;

        // Cap delta time to prevent large jumps
        deltaTime = Math.max(Math.min(deltaTime, this.MAX_DELTA), this.MIN_DELTA);

        for (const entity of entities) {
            this.updateEntityMovement(entity, deltaTime);

            // Update camera for player entity
            if (entity.hasComponent(PlayerComponentType)) {
                const transform = entity.getComponent<TransformComponent>(TransformComponentType);
                if (transform) {
                    this.updateCamera(transform.x, transform.y);
                }
            }
        }
    }
} 