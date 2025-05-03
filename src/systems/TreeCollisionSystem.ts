import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { CollisionComponent, CollisionComponentType } from '../components/CollisionComponent';
import { TreeComponent, TreeComponentType } from '../components/TreeComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { GameState } from '../components/GameStateComponent';
import { gsap } from 'gsap';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { IsometricMovementComponent, IsometricMovementComponentType } from '../components/IsometricMovementComponent';

@injectable()
export class TreeCollisionSystem extends BaseSystem {
    private readonly SHAKE_DURATION = 0.3; // seconds
    private readonly SHAKE_STRENGTH = 10; // pixels
    private readonly GAME_OVER_DELAY = 0.5; // seconds
    public static isCollisionAnimationPlaying: boolean = false;

    readonly requiredComponents = [
        CollisionComponentType,
        TreeComponentType,
        VisualComponentType
    ];

    constructor() {
        super();
        console.log('[TreeCollisionSystem] Initialized');
    }

    protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
        if (!this.world) return;

        const gameState = this.world.getGameState();
        if (!gameState || gameState.currentState !== GameState.Playing) return;
        
        for (const entity of entities) {
            const collision = entity.getComponent<CollisionComponent>(CollisionComponentType);
            const visual = entity.getComponent<VisualComponent>(VisualComponentType);

            if (!collision || !visual || !collision.collidedWith) continue;

            // Skip if this collision is already being handled
            if (collision.isBeingHandled) {
                continue;
            }

            // Get player's movement and position components
            const playerMovement = collision.collidedWith.getComponent<IsometricMovementComponent>(IsometricMovementComponentType);
            const playerPos = collision.collidedWith.getComponent<GridPositionComponent>(GridPositionComponentType);
            const treePos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);

            if (!playerMovement || !playerPos || !treePos) continue;

            // Only trigger collision when player has reached the tree's position
            if (playerPos.gridX !== treePos.gridX || playerPos.gridY !== treePos.gridY) {
                continue;
            }

            // Mark this collision as being handled
            collision.isBeingHandled = true;
            TreeCollisionSystem.isCollisionAnimationPlaying = true;

            // Shake animation for both tree and player
            const playerVisual = collision.collidedWith.getComponent<VisualComponent>(VisualComponentType);
            if (playerVisual) {
                // Shake the player
                gsap.to(playerVisual.container, {
                    x: "+=" + this.SHAKE_STRENGTH,
                    duration: this.SHAKE_DURATION / 4,
                    repeat: 3,
                    yoyo: true,
                    ease: "power1.inOut"
                });
            }

            // Shake the tree
            gsap.to(visual.container, {
                x: "+=" + this.SHAKE_STRENGTH,
                duration: this.SHAKE_DURATION / 4,
                repeat: 3,
                yoyo: true,
                ease: "power1.inOut",
                onComplete: () => {
                    TreeCollisionSystem.isCollisionAnimationPlaying = false;
                    // Set game over after shake animation
                    setTimeout(() => {
                        if (this.world) {
                            const gameState = this.world.getGameState();
                            if (gameState) {
                                gameState.currentState = GameState.GameOver;
                            }
                        }
                    }, this.GAME_OVER_DELAY * 1000);
                }
            });
        }
    }
} 