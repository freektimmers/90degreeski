import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { CollisionComponent, CollisionComponentType } from '../components/CollisionComponent';
import { CoinComponent, CoinComponentType } from '../components/CoinComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { SpeedBoostComponent, SpeedBoostComponentType } from '../components/SpeedBoostComponent';
import { World } from '../core/World';
import { GameState } from '../components/GameStateComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { NeedsObjectRecyclingComponent } from '../components/NeedsObjectRecyclingComponent';
import { gsap } from 'gsap';
import { CoinCounterComponent, CoinCounterComponentType } from '../components/CoinCounterComponent';

@injectable()
export class CoinCollisionSystem extends BaseSystem {
    private readonly ANIMATION_DURATION = 0.5; // seconds
    private readonly FLOAT_DISTANCE = 50; // pixels

    readonly requiredComponents = [
        CollisionComponentType,
        CoinComponentType,
        VisualComponentType
    ];

    constructor() {
        super();
        console.log('[CoinCollisionSystem] Initialized');
    }

    protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
        if (!this.world) return;

        const gameState = this.world.getGameState();
        if (!gameState || gameState.currentState !== GameState.Playing) return;
        
        for (const entity of entities) {
            const collision = entity.getComponent<CollisionComponent>(CollisionComponentType);
            const visual = entity.getComponent<VisualComponent>(VisualComponentType);
            const gridPos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);

            if (!collision || !visual || !collision.collidedWith || !gridPos) continue;

            // Skip if this collision is already being handled
            if (collision.isBeingHandled) {
                continue;
            }

            // Mark this collision as being handled
            collision.isBeingHandled = true;

            // Find and increment the coin counter
            const allEntities = this.world.getEntities();
            const counterEntity = allEntities.find(e => e.hasComponent(CoinCounterComponentType));
            if (counterEntity) {
                const counter = counterEntity.getComponent<CoinCounterComponent>(CoinCounterComponentType);
                if (counter) {
                    counter.count++;
                    if (counter.count > counter.highscore) {
                        counter.highscore = counter.count;
                        localStorage.setItem('coinHighscore', counter.highscore.toString());
                    }
                }
            }

            // Apply speed boost to the player
            const playerSpeedBoost = collision.collidedWith.getComponent<SpeedBoostComponent>(SpeedBoostComponentType);
            if (playerSpeedBoost) {
                playerSpeedBoost.speedMultiplier += playerSpeedBoost.multiplierIncrement;
                console.log('[CoinCollisionSystem] Applied speed boost to player');
            }

            // Start GSAP animation for floating up and fading out
            const startY = visual.container.position.y;
            gsap.to(visual.container, {
                y: startY - this.FLOAT_DISTANCE,
                alpha: 0,
                duration: this.ANIMATION_DURATION,
                ease: "power1.out",
                onComplete: () => {
                    console.log('[CoinCollisionSystem] Animation complete, marking coin for recycling');
                    const recycling = new NeedsObjectRecyclingComponent();
                    recycling.gridX = gridPos.gridX;
                    recycling.gridY = gridPos.gridY;
                    entity.addComponent(recycling);
                    entity.removeComponent(CollisionComponentType);
                }
            });
        }
    }
} 