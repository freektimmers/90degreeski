import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { GridOccupancyComponent, GridOccupancyComponentType, OccupancyType } from '../components/GridOccupancyComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { PlayerComponent, PlayerComponentType } from '../components/PlayerComponent';
import { World } from '../core/World';
import { GameState } from '../components/GameStateComponent';

@injectable()
export class GridOccupancySystem extends BaseSystem {
  readonly requiredComponents = [
    GridOccupancyComponentType,
    GridPositionComponentType
  ];

  private occupancyMap: Map<string, GridOccupancyComponent> = new Map();

  private getGridKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  public onEntityAdded(entity: Entity): void {
    const gridPos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);
    const occupancy = entity.getComponent<GridOccupancyComponent>(GridOccupancyComponentType);
    
    if (!gridPos || !occupancy) return;

    const key = this.getGridKey(gridPos.gridX, gridPos.gridY);
    this.occupancyMap.set(key, occupancy);
  }

  public onEntityRemoved(entity: Entity): void {
    const gridPos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);
    const occupancy = entity.getComponent<GridOccupancyComponent>(GridOccupancyComponentType);
    
    if (!gridPos || !occupancy) return;

    const key = this.getGridKey(gridPos.gridX, gridPos.gridY);
    if (this.occupancyMap.get(key)?.entity === entity) {
      this.occupancyMap.delete(key);
    }
  }

  private checkCollisions(entity: Entity): void {
    const gridPos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);
    const player = entity.getComponent<PlayerComponent>(PlayerComponentType);
    
    if (!gridPos || !player || !this.world) return;

    const key = this.getGridKey(gridPos.gridX, gridPos.gridY);
    const occupant = this.occupancyMap.get(key);

    if (occupant && occupant.entity !== entity) {
      switch (occupant.occupancyType) {
        case OccupancyType.Tree:
          const gameState = this.world.getGameState();
          if (gameState) {
            gameState.currentState = GameState.GameOver;
          }
          break;
        case OccupancyType.Coin:
          // The coin system will handle coin collection through its own component updates
          break;
      }
    }
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    entities.forEach(entity => {
      if (entity.hasComponent(PlayerComponentType)) {
        this.checkCollisions(entity);
      }
    });
  }

  public onGameStateChanged(oldState: GameState, newState: GameState): void {
    if (newState === GameState.Starting) {
      // Clear occupancy map when game restarts
      this.occupancyMap.clear();
    }
  }
} 