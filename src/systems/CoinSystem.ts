import { injectable, inject } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { BaseEntity } from '../core/BaseEntity';
import { TransformComponent, TransformComponentType } from '../components/TransformComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { CoinComponent, CoinComponentType } from '../components/CoinComponent';
import { ZIndexComponent, ZIndexComponentType } from '../components/ZIndexComponent';
import { PlayerComponentType } from '../components/PlayerComponent';
import { GridService } from '../services/GridService';
import { GridOccupancyService, OccupancyType } from '../services/GridOccupancyService';
import { World, GameState } from '../core/World';
import { MovementSystem } from '../systems/MovementSystem';
import { CoinCounterComponent, CoinCounterComponentType } from '../components/CoinCounterComponent';
import { SpeedBoostComponent, SpeedBoostComponentType } from '../components/SpeedBoostComponent';
import { Application } from 'pixi.js';

const Z_INDEX = {
  COIN: 50 // Between tiles and trees
};

interface PooledCoin {
  entity: Entity;
  isInUse: boolean;
  gridX: number;
  gridY: number;
}

@injectable()
export class CoinSystem extends BaseSystem {
  private readonly COIN_DENSITY = 0.01; // 1% chance of a coin on each tile
  private readonly VISIBLE_RADIUS = 12; // Match GridRenderSystem's visible radius
  private readonly POOL_SIZE = 50; // Maximum number of coins that can exist at once
  
  private coinPool: PooledCoin[] = [];
  private activeCoinPositions: Map<string, PooledCoin> = new Map();

  readonly requiredComponents = [
    GridPositionComponentType,
    CoinComponentType
  ];

  constructor(
    @inject(GridService) private gridService: GridService,
    @inject(GridOccupancyService) private gridOccupancyService: GridOccupancyService
  ) {
    super();
  }

  public setWorld(world: World): void {
    this.world = world;
    // Listen for tile creation events
    this.world.on('tileCreated', (data: { gridX: number, gridY: number }) => {
      this.trySpawnCoinAt(data.gridX, data.gridY);
    });

    // Initialize coin pool if app is already set
    if (this.app) {
      this.initializeCoinPool();
    }
  }

  public setApp(app: Application): void {
    this.app = app;
  }

  private initializeCoinPool(): void {
    if (!this.world || !this.app?.stage) return;
    
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const coin = new BaseEntity();
      const transform = new TransformComponent(0, 0);
      const gridPos = new GridPositionComponent(0, 0);
      const visual = new VisualComponent({
        spritePath: '/coin.png',
      });
      const coinComponent = new CoinComponent();
      const zIndex = new ZIndexComponent(Z_INDEX.COIN);

      coin.addComponent(transform);
      coin.addComponent(gridPos);
      coin.addComponent(visual);
      coin.addComponent(coinComponent);
      coin.addComponent(zIndex);

      this.world.addEntity(coin);
      // Add to world container instead of stage
      const movementSystem = this.world.getSystem<MovementSystem>(MovementSystem);
      if (movementSystem && movementSystem.worldContainer) {
        movementSystem.worldContainer.addChild(visual.container);
      }
      visual.container.visible = false;

      this.coinPool.push({
        entity: coin,
        isInUse: false,
        gridX: 0,
        gridY: 0
      });
    }
  }

  private removeCoin(gridX: number, gridY: number): void {
    const key = `${gridX},${gridY}`;
    const coin = this.activeCoinPositions.get(key);
    
    if (coin) {
      const visual = coin.entity.getComponent<VisualComponent>(VisualComponentType);
      if (visual) {
        visual.container.visible = false;
      }
      
      // Mark the coin as not in use in the pool
      coin.isInUse = false;
      coin.gridX = 0;
      coin.gridY = 0;
      
      this.gridOccupancyService.free(gridX, gridY, OccupancyType.Coin);
      this.activeCoinPositions.delete(key);
    }
  }

  public spawnCoin(gridX: number, gridY: number): void {
    const key = `${gridX},${gridY}`;
    if (this.activeCoinPositions.has(key)) {
      return;
    }

    if (this.gridOccupancyService.isOccupied(gridX, gridY)) {
      return;
    }

    // Find an unused coin from the pool
    const unusedCoinIndex = this.coinPool.findIndex(coin => !coin.isInUse);
    if (unusedCoinIndex === -1) {
      console.warn('[CoinSystem] Coin pool exhausted. Active coins:', this.activeCoinPositions.size);
      return;
    }

    const unusedCoin = this.coinPool[unusedCoinIndex];
    const worldPos = this.gridService.gridToWorld(gridX, gridY);
    
    // Update the coin's components
    const transform = unusedCoin.entity.getComponent<TransformComponent>(TransformComponentType);
    const gridPos = unusedCoin.entity.getComponent<GridPositionComponent>(GridPositionComponentType);
    const visual = unusedCoin.entity.getComponent<VisualComponent>(VisualComponentType);
    
    if (!transform || !gridPos || !visual) {
      console.warn('[CoinSystem] Missing required components for coin');
      return;
    }

    // Get the movement system and world container
    const movementSystem = this.world?.getSystem<MovementSystem>(MovementSystem);
    if (!movementSystem?.worldContainer) {
      console.warn('[CoinSystem] Movement system or world container not ready');
      return;
    }

    // Update transform and position
    transform.x = worldPos.x;
    transform.y = worldPos.y;
    gridPos.gridX = gridX;
    gridPos.gridY = gridY;
    visual.container.visible = true;
    visual.container.position.set(transform.x, transform.y);

    // Ensure the visual container is in the world container
    if (!visual.container.parent) {
      movementSystem.worldContainer.addChild(visual.container);
    }

    // Mark the coin as in use in the pool
    unusedCoin.isInUse = true;
    unusedCoin.gridX = gridX;
    unusedCoin.gridY = gridY;
    
    this.activeCoinPositions.set(key, unusedCoin);
    this.gridOccupancyService.occupy(gridX, gridY, OccupancyType.Coin);
  }

  public trySpawnCoinAt(gridX: number, gridY: number): void {
    if (!this.world) return;
    if (this.world.getCurrentState() !== GameState.Playing) return;

    const distanceFromStart = Math.abs(gridX) + Math.abs(gridY);
    
    if (distanceFromStart < 20) {
      return;
    }

    if (this.gridOccupancyService.isOccupied(gridX, gridY)) {
      return;
    }

    const roll = Math.random();
    if (roll < this.COIN_DENSITY) {
      this.spawnCoin(gridX, gridY);
    }
  }

  protected onGameStateChanged(oldState: GameState, newState: GameState): void {
    if (newState === GameState.GameOver) {
      this.reset();
    } else if (newState === GameState.Starting) {
      this.initialize();
    }
  }

  public initialize(): void {
    if (!this.world || !this.app?.stage) {
      return;
    }
  }

  public reset(): void {
    // First remove all active coins from the stage and grid
    for (const [key, coin] of this.activeCoinPositions.entries()) {
      const visual = coin.entity.getComponent<VisualComponent>(VisualComponentType);
      if (visual && visual.container.parent) {
        visual.container.parent.removeChild(visual.container);
      }
      if (this.world) {
        this.world.removeEntity(coin.entity);
      }
      this.gridOccupancyService.free(coin.gridX, coin.gridY, OccupancyType.Coin);
    }

    // Clear active positions map
    this.activeCoinPositions.clear();

    // Clean up the pool
    for (const coin of this.coinPool) {
      if (this.world) {
        this.world.removeEntity(coin.entity);
      }
    }
    this.coinPool = [];

    // Reinitialize the pool
    if (this.app && this.world) {
      this.initializeCoinPool();
    }
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    if (!this.app?.stage || !this.world || this.world.getCurrentState() !== GameState.Playing) return;

    // Get the movement system to access the world container
    const movementSystem = this.world.getSystem<MovementSystem>(MovementSystem);
    if (!movementSystem?.worldContainer) {
      return;
    }

    // Update positions of all coins
    for (const coin of this.activeCoinPositions.values()) {
      this.updateCoinPosition(coin.entity);
    }

    // Check for collisions with players
    const players = this.world.getEntities().filter(entity => 
      entity.hasComponent(PlayerComponentType) &&
      entity.hasComponent(GridPositionComponentType)
    );

    for (const player of players) {
      const playerGridPos = player.getComponent<GridPositionComponent>(GridPositionComponentType);
      if (playerGridPos) {
        // First check grid occupancy service
        if (this.gridOccupancyService.isOccupied(playerGridPos.gridX, playerGridPos.gridY, OccupancyType.Coin)) {
          // Verify against active coins to ensure the coin still exists
          const key = `${playerGridPos.gridX},${playerGridPos.gridY}`;
          if (this.activeCoinPositions.has(key)) {
            const coin = this.activeCoinPositions.get(key);
            if (coin) {
              this.handleCoinCollection(coin.entity);
              this.removeCoin(playerGridPos.gridX, playerGridPos.gridY);
            }
          } else {
            // If we found an occupancy but no active coin, clean up the occupancy
            this.gridOccupancyService.free(playerGridPos.gridX, playerGridPos.gridY, OccupancyType.Coin);
          }
        }
      }
    }

    // Clean up coins that are too far from the center
    const worldContainerPos = movementSystem.worldContainer.position;
    if (!worldContainerPos) {
      return;
    }

    const centerWorldX = -worldContainerPos.x;
    const centerWorldY = -worldContainerPos.y;

    const worldPos = this.gridService.worldToGrid(centerWorldX, centerWorldY);
    const gridCenterX = Math.floor(worldPos.x);
    const gridCenterY = Math.floor(worldPos.y);

    // Remove coins that are too far from view
    for (const [key, coin] of this.activeCoinPositions.entries()) {
      const distance = Math.abs(coin.gridX - gridCenterX) + Math.abs(coin.gridY - gridCenterY);
      if (distance > this.VISIBLE_RADIUS * 1.5) {
        this.removeCoin(coin.gridX, coin.gridY);
      }
    }
  }

  private updateCoinPosition(coin: Entity): void {
    const transform = coin.getComponent<TransformComponent>(TransformComponentType);
    const visual = coin.getComponent<VisualComponent>(VisualComponentType);
    
    if (transform && visual) {
      visual.container.position.set(transform.x, transform.y);
    }
  }

  private handleCoinCollection(coinEntity: Entity): void {
    // Find the coin counter entity
    const entities = this.world?.getEntities() || [];
    const counterEntity = entities.find(entity => entity.hasComponent(CoinCounterComponentType));
    
    if (counterEntity) {
      const counter = counterEntity.getComponent<CoinCounterComponent>(CoinCounterComponentType);
      if (counter) {
        counter.increment();
      }
    }

    // Add speed boost to the player
    const player = entities.find(entity => entity.hasComponent(PlayerComponentType));
    if (player) {
      const speedBoost = player.getComponent<SpeedBoostComponent>(SpeedBoostComponentType);
      if (speedBoost) {
        speedBoost.addBoost();
      }
    }

    // Remove the coin from the pool and world
    const poolItem = this.coinPool.find(item => item.entity === coinEntity);
    if (poolItem) {
      poolItem.isInUse = false;
      const visual = coinEntity.getComponent<VisualComponent>(VisualComponentType);
      if (visual) {
        visual.container.visible = false;
      }
    }
  }
} 