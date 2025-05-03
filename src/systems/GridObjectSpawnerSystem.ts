import { injectable, inject, optional } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { BaseEntity } from '../core/BaseEntity';
import { TransformComponent, TransformComponentType } from '../components/TransformComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { ZIndexComponent } from '../components/ZIndexComponent';
import { GridOccupancyComponent, GridOccupancyComponentType, OccupancyType } from '../components/GridOccupancyComponent';
import { SpawnRuleComponent, SpawnRuleComponentType } from '../components/SpawnRuleComponent';
import { GridService } from '../services/GridService';
import { GridOccupancyService } from '../services/GridOccupancyService';
import { DebugOverlaySystem } from './DebugOverlaySystem';
import { ObjectPoolComponent, ObjectPoolComponentType, PooledObject } from '../components/ObjectPoolComponent';
import { GameState } from '../components/GameStateComponent';
import { NeedsSpawnCheckComponent, NeedsSpawnCheckComponentType } from '../components/NeedsSpawnCheckComponent';
import { CoinComponent } from '../components/CoinComponent';
import { TreeComponent } from '../components/TreeComponent';
import { PlayerComponent, PlayerComponentType } from '../components/PlayerComponent';

@injectable()
export class GridObjectSpawnerSystem extends BaseSystem {
  private debugOverlay: DebugOverlaySystem | null = null;

  // Now we require NeedsSpawnCheckComponent
  readonly requiredComponents = [NeedsSpawnCheckComponentType];
  readonly optionalComponents = [];

  constructor(
    @inject(GridService) private gridService: GridService,
    @inject(GridOccupancyService) private gridOccupancyService: GridOccupancyService,
    @optional() @inject(DebugOverlaySystem) debugOverlay?: DebugOverlaySystem
  ) {
    super();
    this.debugOverlay = debugOverlay || null;
  }

  public onGameStateChanged(oldState: GameState, newState: GameState): void {
    console.log(`[GridObjectSpawnerSystem] Game state changed from ${oldState} to ${newState}`);
    
    if (newState === GameState.Starting && this.world) {
      // Reset grid occupancy service
      this.gridOccupancyService.reset();

      // Create a pool entity for each spawn rule
      const spawnRules = this.world.getEntities()
        .filter(e => e.hasComponent(SpawnRuleComponentType))
        .map(e => e.getComponent<SpawnRuleComponent>(SpawnRuleComponentType)!)
        .filter(rule => rule !== null);

      for (const rule of spawnRules) {
        console.log(`[GridObjectSpawnerSystem] Creating pool for ${rule.config.occupancyType}`);
        const poolEntity = new BaseEntity();
        const objectPool = new ObjectPoolComponent();
        poolEntity.addComponent(objectPool);
        this.world.addEntity(poolEntity);
        this.initializePool(objectPool, rule);
      }
    }
  }

  private initializePool(objectPool: ObjectPoolComponent, spawnRule: SpawnRuleComponent): void {
    const poolSize = spawnRule.config.poolSize || objectPool.DEFAULT_POOL_SIZE;
    const pool: PooledObject[] = [];
    
    for (let i = 0; i < poolSize; i++) {
      const entity = new BaseEntity();
      const transform = new TransformComponent(0, 0);
      const gridPos = new GridPositionComponent(0, 0);
      const visual = new VisualComponent({ spritePath: spawnRule.config.spritePath });
      const zIndex = new ZIndexComponent();

      entity.addComponent(transform);
      entity.addComponent(gridPos);
      entity.addComponent(visual);
      entity.addComponent(zIndex);

      // Add specific components based on type
      if (spawnRule.config.occupancyType === OccupancyType.Coin) {
        entity.addComponent(new CoinComponent());
      } else if (spawnRule.config.occupancyType === OccupancyType.Tree) {
        entity.addComponent(new TreeComponent());
      }

      // Add to world but keep invisible
      if (this.world) {
        this.world.addEntity(entity);
        visual.container.visible = false;

        // Add visual container to world container
        const worldContainer = this.world.getWorldContainer();
        if (worldContainer) {
          worldContainer.container.addChild(visual.container);
          visual.container.position.set(0, 0);
        }
      }

      pool.push({
        entity,
        isInUse: false,
        gridX: 0,
        gridY: 0,
        spawnRule
      });
    }

    objectPool.pools.set(spawnRule.config.occupancyType as OccupancyType, {
      pool,
      activeObjects: new Map()
    });
  }

  private getPoolForType(type: OccupancyType): ObjectPoolComponent | null {
    if (!this.world) return null;
    return this.world.getEntities()
      .map(e => e.getComponent<ObjectPoolComponent>(ObjectPoolComponentType))
      .filter(pool => pool !== null && pool.pools.has(type))[0] || null;
  }

  private getFreeObject(objectPool: ObjectPoolComponent, type: OccupancyType): PooledObject | undefined {
    const pool = objectPool.pools.get(type);
    if (!pool) return undefined;
    return pool.pool.find(obj => !obj.isInUse);
  }

  private activateObject(objectPool: ObjectPoolComponent, obj: PooledObject, gridX: number, gridY: number): void {
    const pool = objectPool.pools.get(obj.spawnRule.config.occupancyType as OccupancyType);
    if (!pool) return;

    obj.isInUse = true;
    obj.gridX = gridX;
    obj.gridY = gridY;
    
    // Add grid occupancy component and mark the cell as occupied
    const occupancyType = obj.spawnRule.config.occupancyType as OccupancyType;
    const gridOccupancy = new GridOccupancyComponent(occupancyType);
    obj.entity.addComponent(gridOccupancy);
    this.gridOccupancyService.occupy(gridX, gridY, occupancyType);

    pool.activeObjects.set(this.getGridKey(gridX, gridY), obj);
  }

  private getGridKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private shouldSpawnObject(x: number, y: number, rule: SpawnRuleComponent): boolean {
    // Check spawn chance
    if (Math.random() > rule.config.spawnChance) {
      return false;
    }

    // Check minimum distance from start (0,0)
    const distanceFromStart = Math.sqrt(x * x + y * y);
    if (distanceFromStart < rule.config.minDistanceFromStart) {
      return false;
    }

    // Check if tile is already occupied
    if (this.gridOccupancyService.isOccupied(x, y)) {
      return false;
    }

    // Find player position and check minimum distance
    if (this.world) {
      const playerEntity = this.world.getEntities().find(entity => 
        entity.hasComponent(PlayerComponentType)
      );

      if (playerEntity) {
        const playerPos = playerEntity.getComponent<GridPositionComponent>(GridPositionComponentType);
        if (playerPos) {
          // Calculate distance from player
          const dx = x - playerPos.gridX;
          const dy = y - playerPos.gridY;
          const distanceFromPlayer = Math.sqrt(dx * dx + dy * dy);

          // Don't spawn within 5 tiles of the player
          const MIN_PLAYER_DISTANCE = 5;
          if (distanceFromPlayer < MIN_PLAYER_DISTANCE) {
            return false;
          }

          // For coins, prevent spawning at lower Y positions than the player
          if (rule.config.occupancyType === OccupancyType.Coin && y < playerPos.gridY) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private spawnObjectAtPosition(
    objectPool: ObjectPoolComponent,
    rule: SpawnRuleComponent,
    gridX: number,
    gridY: number
  ): void {
    const type = rule.config.occupancyType as OccupancyType;
    const pool = objectPool.pools.get(type);
    if (!pool) return;

    const key = this.getGridKey(gridX, gridY);
    if (pool.activeObjects.has(key)) return;

    const obj = this.getFreeObject(objectPool, type);
    if (!obj) return;

    this.activateObject(objectPool, obj, gridX, gridY);
    
    // Set up components
    const visual = obj.entity.getComponent<VisualComponent>(VisualComponentType);
    const transform = obj.entity.getComponent<TransformComponent>(TransformComponentType);
    const gridPos = obj.entity.getComponent<GridPositionComponent>(GridPositionComponentType);
    
    if (!visual || !transform || !gridPos) {
      console.error(`[GridObjectSpawnerSystem] Missing required components for ${type}`);
      return;
    }

    // Update grid position
    gridPos.gridX = gridX;
    gridPos.gridY = gridY;
    
    // Convert to world position using grid service
    const worldPos = this.gridService.gridToWorld(gridPos.gridX, gridPos.gridY);
    transform.x = worldPos.x;
    transform.y = worldPos.y;
    
    // Set visual position
    visual.container.position.set(worldPos.x, worldPos.y);
    visual.container.visible = true;
  }

  private updateDebugStats(): void {
    if (!this.debugOverlay || !this.world) return;

    // Get all object pools
    const pools = this.world.getEntities()
      .map(e => e.getComponent<ObjectPoolComponent>(ObjectPoolComponentType))
      .filter((pool): pool is ObjectPoolComponent => pool !== null);

    // Track stats for each type separately
    const statsByType = new Map<OccupancyType, { active: number, total: number }>();

    // Collect stats by type
    pools.forEach(objectPool => {
      objectPool.pools.forEach((pool, type) => {
        const stats = statsByType.get(type) || { active: 0, total: 0 };
        stats.active += pool.activeObjects.size;
        stats.total += pool.pool.length;
        statsByType.set(type, stats);
      });
    });

    // Update debug overlay for each type
    statsByType.forEach((stats, type) => {
      this.debugOverlay?.updateStats(`${type}Pool`, {
        entities: stats.active,
        poolSize: stats.total,
        activePoolItems: stats.active
      });
    });
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    // Now entities will only be those with NeedsSpawnCheckComponent
    for (const entity of entities) {
      this.handleSpawnCheck(entity);
    }
    this.updateDebugStats();
  }

  private handleSpawnCheck(entity: Entity): void {
    // Get the grid position from the tile
    const gridX = entity.getComponent<GridPositionComponent>(GridPositionComponentType)?.gridX;
    const gridY = entity.getComponent<GridPositionComponent>(GridPositionComponentType)?.gridY;

    if (gridX === undefined || gridY === undefined) {
      console.warn('[GridObjectSpawnerSystem] Tile entity missing grid position');
      return;
    }

    // Get all spawn rules
    const spawnRules = this.world?.getEntities()
      .filter(e => e.hasComponent(SpawnRuleComponentType))
      .map(e => e.getComponent<SpawnRuleComponent>(SpawnRuleComponentType)!)
      .filter(rule => rule !== null) || [];

    // Try to spawn objects for each rule
    for (const rule of spawnRules) {
      const type = rule.config.occupancyType as OccupancyType;
      const objectPool = this.getPoolForType(type);
      if (!objectPool) continue;

      // Check if we should spawn an object at this position
      if (this.shouldSpawnObject(gridX, gridY, rule)) {
        this.spawnObjectAtPosition(objectPool, rule, gridX, gridY);
      }
    }

    // Remove the NeedsSpawnCheckComponent since we've processed this tile
    entity.removeComponent(NeedsSpawnCheckComponentType);
  }
} 