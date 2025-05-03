import { injectable, inject } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { GridService } from '../services/GridService';
import { GridOccupancyService } from '../services/GridOccupancyService';
import { NeedsObjectRecyclingComponent, NeedsObjectRecyclingComponentType } from '../components/NeedsObjectRecyclingComponent';
import { ObjectPoolComponent, ObjectPoolComponentType, PooledObject } from '../components/ObjectPoolComponent';
import { GridOccupancyComponent, GridOccupancyComponentType, OccupancyType } from '../components/GridOccupancyComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';

@injectable()
export class ObjectRecyclingSystem extends BaseSystem {
  readonly requiredComponents = [NeedsObjectRecyclingComponentType];
  readonly optionalComponents = [];

  constructor(
    @inject(GridService) private gridService: GridService,
    @inject(GridOccupancyService) private gridOccupancyService: GridOccupancyService
  ) {
    super();
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    // Process each entity that needs recycling
    for (const entity of entities) {
      this.handleObjectRecycling(entity);
    }
  }

  private handleObjectRecycling(entity: Entity): void {
    const recycling = entity.getComponent<NeedsObjectRecyclingComponent>(NeedsObjectRecyclingComponentType);
    if (!recycling) return;

    const { gridX, gridY } = recycling;

    // Find and recycle any objects at this position
    const occupancyTypes = Object.values(OccupancyType);
    for (const type of occupancyTypes) {
      const objectPool = this.getPoolForType(type);
      if (!objectPool) continue;

      // Check if there's an object at this position
      const obj = this.getActiveObject(objectPool, gridX, gridY, type);
      if (obj) {
        this.deactivateObject(objectPool, gridX, gridY, type);
      }
    }

    // Remove the recycling component since we've processed this tile
    entity.removeComponent(NeedsObjectRecyclingComponentType);
  }

  private getPoolForType(type: OccupancyType): ObjectPoolComponent | null {
    if (!this.world) return null;
    return this.world.getEntities()
      .map(e => e.getComponent<ObjectPoolComponent>(ObjectPoolComponentType))
      .filter(pool => pool !== null && pool.pools.has(type))[0] || null;
  }

  private getActiveObject(objectPool: ObjectPoolComponent, gridX: number, gridY: number, type: OccupancyType): PooledObject | undefined {
    const pool = objectPool.pools.get(type);
    if (!pool) return undefined;
    return pool.activeObjects.get(this.getGridKey(gridX, gridY));
  }

  private getGridKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private deactivateObject(objectPool: ObjectPoolComponent, gridX: number, gridY: number, type: OccupancyType): void {
    const pool = objectPool.pools.get(type);
    if (!pool) return;

    const key = this.getGridKey(gridX, gridY);
    const obj = pool.activeObjects.get(key);
    
    if (obj) {
      const visual = obj.entity.getComponent<VisualComponent>(VisualComponentType);
      if (visual) {
        visual.container.visible = false;
        visual.container.position.set(0, 0); // Reset position when deactivated
      }

      // Remove grid occupancy component and free the cell
      obj.entity.removeComponent(GridOccupancyComponentType);
      this.gridOccupancyService.free(gridX, gridY, type);
      
      obj.isInUse = false;
      obj.gridX = 0;
      obj.gridY = 0;
      
      pool.activeObjects.delete(key);
    }
  }

  public onObjectCollected(entity: Entity): void {
    if (!this.world) return;

    const gridOccupancy = entity.getComponent<GridOccupancyComponent>(GridOccupancyComponentType);
    if (!gridOccupancy) return;

    const gridPos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);
    if (!gridPos) return;

    // Cast the occupancy type to OccupancyType using type assertion
    const occupancyType = gridOccupancy.type as unknown as OccupancyType;
    const objectPool = this.getPoolForType(occupancyType);
    if (!objectPool) return;

    this.deactivateObject(objectPool, gridPos.gridX, gridPos.gridY, occupancyType);
  }
} 