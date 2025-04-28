import { injectable, inject } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { Application, Graphics, Container } from 'pixi.js';
import { GridService } from '../services/GridService';
import { TransformComponentType } from '../components/TransformComponent';
import { World, GameState } from '../core/World';
import { MovementSystem } from '../systems/MovementSystem';

interface GridTile {
  graphics: Graphics;
  isInUse: boolean;
  gridX: number;
  gridY: number;
}

@injectable()
export class GridRenderSystem extends BaseSystem {
  private gridContainer: Container;
  private tilePool: GridTile[] = [];
  private activeTiles: Map<string, GridTile> = new Map();
  private readonly VISIBLE_RADIUS = 12;
  private readonly POOL_SIZE = 600;
  private lastCenterX = 0;
  private lastCenterY = 0;
  private isInitialized = false;

  readonly requiredComponents = [
    TransformComponentType
  ];

  constructor(
    @inject(GridService) private gridService: GridService
  ) {
    super();
    this.gridContainer = new Container();
  }

  protected onGameStateChanged(oldState: GameState, newState: GameState): void {
    if (newState === GameState.GameOver) {
      // Stop processing updates (handled by World)
    } else if (newState === GameState.Starting) {
      this.initialize();
    }
  }

  public initialize(): void {
    if (!this.world || !this.app?.stage) return;

    this.initializeTilePool();
    
    // Center the grid container on screen
    this.gridContainer.position.set(0, 0);
    // Add to world container instead of stage
    const movementSystem = this.world.getSystem<MovementSystem>(MovementSystem);
    if (movementSystem && movementSystem.worldContainer) {
      movementSystem.worldContainer.addChildAt(this.gridContainer, 0);
    }
    this.tilePool.forEach(tile => this.gridContainer.addChild(tile.graphics));
    
    // Show initial grid
    this.updateVisibleTiles(0, 0);
    this.isInitialized = true;
  }

  public reset(): void {
    // Return all tiles to the pool
    for (const [key, tile] of this.activeTiles) {
      this.recycleTile(tile);
    }

    // Clear active tiles map
    this.activeTiles.clear();

    // Reset the visible area tracking
    this.lastCenterX = 0;
    this.lastCenterY = 0;
  }

  private initializeTilePool(): void {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const graphics = new Graphics();
      this.createTileGraphics(graphics);
      graphics.visible = false;
      
      this.tilePool.push({
        graphics,
        isInUse: false,
        gridX: 0,
        gridY: 0
      });
    }
  }

  private createTileGraphics(graphics: Graphics): void {
    const { width, height } = this.gridService.getTileDimensions();
    graphics.clear();
    
    // Draw filled shape
    graphics
      .setFillStyle({
        color: 0xffffff,
        alpha: 1
      })
      .moveTo(0, -height/2)
      .lineTo(width/2, 0)
      .lineTo(0, height/2)
      .lineTo(-width/2, 0)
      .lineTo(0, -height/2)
      .fill();

    // Draw outline
    graphics
      .setStrokeStyle({
        width: 1,
        color: 0xCCCCCC,
        alpha: 1
      })
      .moveTo(0, -height/2)
      .lineTo(width/2, 0)
      .lineTo(0, height/2)
      .lineTo(-width/2, 0)
      .lineTo(0, -height/2)
      .stroke();
  }

  private getTileKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private getFreeTile(): GridTile | null {
    return this.tilePool.find(tile => !tile.isInUse) || null;
  }

  private placeTile(gridX: number, gridY: number, centerX: number, centerY: number): void {
    if (!this.world || this.world.getCurrentState() !== GameState.Playing) return;

    const key = this.getTileKey(gridX, gridY);
    if (this.activeTiles.has(key)) return;

    const tile = this.getFreeTile();
    if (!tile) return;

    // Use GridService for consistent world position calculation
    const worldPos = this.gridService.worldToGrid(centerX, centerY);
    
    this.createTileGraphics(tile.graphics);
    const tileWorldPos = this.gridService.gridToWorld(gridX, gridY);
    tile.graphics.position.set(tileWorldPos.x, tileWorldPos.y);
    tile.graphics.visible = true;
    tile.isInUse = true;
    tile.gridX = gridX;
    tile.gridY = gridY;
    
    this.activeTiles.set(key, tile);

    // Emit an event for tile creation that TreeSystem can listen to
    if (this.world) {
      this.world.emit('tileCreated', { gridX, gridY });
    }
  }

  private recycleTile(tile: GridTile): void {
    const key = this.getTileKey(tile.gridX, tile.gridY);
    tile.graphics.visible = false;
    tile.isInUse = false;
    this.activeTiles.delete(key);
  }

  private updateVisibleTiles(centerX: number, centerY: number): void {
    if (!this.app || !this.world || this.world.getCurrentState() !== GameState.Playing) return;

    // Get the movement system to access the world container
    const movementSystem = this.world.getSystem<MovementSystem>(MovementSystem);
    if (!movementSystem?.worldContainer) {
      // If the world container isn't ready yet, just return
      return;
    }

    // Use the world container's position to determine the center
    const worldContainerPos = movementSystem.worldContainer.position;
    if (!worldContainerPos) {
      return;
    }
    
    // Calculate the center in world coordinates
    const centerWorldX = -worldContainerPos.x;
    const centerWorldY = -worldContainerPos.y;

    const worldPos = this.gridService.worldToGrid(centerWorldX, centerWorldY);
    const gridCenterX = Math.floor(worldPos.x);
    const gridCenterY = Math.floor(worldPos.y);

    // Calculate visible area bounds
    const minX = gridCenterX - this.VISIBLE_RADIUS;
    const maxX = gridCenterX + this.VISIBLE_RADIUS;
    const minY = gridCenterY - this.VISIBLE_RADIUS;
    const maxY = gridCenterY + this.VISIBLE_RADIUS;

    // Calculate which tiles should be visible
    const neededTiles = new Set<string>();
    
    // Use symmetric bounds for tile placement
    for (let gridX = minX; gridX <= maxX; gridX++) {
      for (let gridY = minY; gridY <= maxY; gridY++) {
        // Calculate Manhattan distance to center to create a more circular visible area
        const distance = Math.abs(gridX - gridCenterX) + Math.abs(gridY - gridCenterY);
        if (distance <= this.VISIBLE_RADIUS * 1.5) {
          const key = this.getTileKey(gridX, gridY);
          neededTiles.add(key);

          // Place new tiles if needed
          if (!this.activeTiles.has(key)) {
            this.placeTile(gridX, gridY, centerWorldX, centerWorldY);
          }
        }
      }
    }

    // Recycle tiles that are no longer visible
    for (const [key, tile] of this.activeTiles) {
      if (!neededTiles.has(key)) {
        this.recycleTile(tile);
      }
    }
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    if (!this.app?.stage || !this.isInitialized) return;
    if (!this.world || this.world.getCurrentState() !== GameState.Playing) return;

    // Get the movement system to access the world container
    const movementSystem = this.world.getSystem<MovementSystem>(MovementSystem);
    if (!movementSystem?.worldContainer) {
      // If the world container isn't ready yet, just return
      return;
    }

    // Use the world container's position
    const worldContainerPos = movementSystem.worldContainer.position;
    if (!worldContainerPos) {
      return;
    }

    this.updateVisibleTiles(worldContainerPos.x, worldContainerPos.y);
  }
}