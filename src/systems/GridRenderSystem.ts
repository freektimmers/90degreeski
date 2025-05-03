import { injectable, inject, optional } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { BaseEntity } from '../core/BaseEntity';
import { Application, Graphics } from 'pixi.js';
import { GridService } from '../services/GridService';
import { TransformComponentType } from '../components/TransformComponent';
import { World } from '../core/World';
import { TransformComponent } from '../components/TransformComponent';
import { DebugOverlaySystem } from './DebugOverlaySystem';
import { GridRenderStateComponent, GridTile, GridRenderStateComponentType } from '../components/GridRenderStateComponent';
import { GameState, GameStateComponentType } from '../components/GameStateComponent';
import { PlayerComponent, PlayerComponentType } from '../components/PlayerComponent';
import { NeedsSpawnCheckComponent, NeedsSpawnCheckComponentType } from '../components/NeedsSpawnCheckComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { NeedsObjectRecyclingComponent } from '../components/NeedsObjectRecyclingComponent';

@injectable()
export class GridRenderSystem extends BaseSystem {
  private readonly VISIBLE_RADIUS = 10;
  private readonly POOL_SIZE = 800;
  private debugOverlay: DebugOverlaySystem | null = null;

  readonly requiredComponents = [
    GridRenderStateComponentType
  ];

  constructor(
    @inject(GridService) private gridService: GridService,
    @optional() @inject(DebugOverlaySystem) debugOverlay?: DebugOverlaySystem
  ) {
    super();
    this.debugOverlay = debugOverlay || null;
  }

  public onGameStateChanged(oldState: GameState, newState: GameState): void {
    console.log(`[GridRenderSystem] Game state changed from ${oldState} to ${newState}`);
    
    if (newState === GameState.Starting) {
      this.initializeGrid();
    }
  }

  private initializeGrid(): void {
    if (!this.world) {
      console.error('[GridRenderSystem] World not available during initialization');
      return;
    }

    if (!this.app?.stage) {
      console.error('[GridRenderSystem] App stage not available during initialization');
      return;
    }

    const gridState = this.world.getGridRenderState();
    if (!gridState) {
      console.error('[GridRenderSystem] Grid state not available');
      return;
    }

    if (gridState.isInitialized) {
      console.log('[GridRenderSystem] Grid already initialized');
      return;
    }

    console.log('[GridRenderSystem] Initializing grid');

    // Create graphics template and initialize pool
    this.createTileGraphicsTemplate(gridState);
    this.initializeTilePool(gridState);
    
    // Center the grid container
    gridState.container.position.set(0, 0);
    
    // Add to world container
    const worldContainer = this.world.getWorldContainer();
    if (worldContainer) {
      console.log('[GridRenderSystem] Adding grid container to world container');
      worldContainer.container.addChildAt(gridState.container, 0);
    } else {
      console.error('[GridRenderSystem] World container not available');
      return;
    }
    
    gridState.tilePool.forEach(tile => gridState.container.addChild(tile.graphics));
    
    // Show initial grid centered at 0,0
    this.updateVisibleTiles(0, 0);
    gridState.isInitialized = true;
    this.updateDebugStats();
    console.log('[GridRenderSystem] Grid initialization complete');
  }

  private updateDebugStats(): void {
    if (!this.debugOverlay || !this.world) return;
    
    const gridState = this.world.getGridRenderState();
    if (!gridState) return;

    this.debugOverlay.updateStats('GridRenderSystem', {
      entities: gridState.activeTiles.size,
      poolSize: this.POOL_SIZE,
      activePoolItems: gridState.activeTiles.size
    });
  }

  private createTileGraphicsTemplate(gridState: GridRenderStateComponent): void {
    if (!this.gridService) {
      throw new Error('[GridRenderSystem] GridService not available');
    }

    const { width, height } = this.gridService.getTileDimensions();
    if (!width || !height) {
      throw new Error('[GridRenderSystem] Invalid tile dimensions');
    }

    gridState.tileGraphicsTemplate = new Graphics();
    
    // Draw filled shape
    gridState.tileGraphicsTemplate
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
    gridState.tileGraphicsTemplate
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

  private initializeTilePool(gridState: GridRenderStateComponent): void {
    if (!gridState.tileGraphicsTemplate) {
      throw new Error('[GridRenderSystem] Tile graphics template not created');
    }

    if (!this.gridService) {
      throw new Error('[GridRenderSystem] GridService not available');
    }

    const { width, height } = this.gridService.getTileDimensions();
    if (!width || !height) {
      throw new Error('[GridRenderSystem] Invalid tile dimensions');
    }

    for (let i = 0; i < this.POOL_SIZE; i++) {
      const graphics = new Graphics();
      // Clone the template graphics by copying its commands
      graphics.clear();
      graphics
        .setFillStyle({
          color: 0xffffff,
          alpha: 1
        })
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
        .fill()
        .stroke();
      graphics.visible = false;
      
      // Create an entity for this tile
      const entity = new BaseEntity();
      if (this.world) {
        this.world.addEntity(entity);
      }

      gridState.tilePool.push({
        graphics,
        isInUse: false,
        gridX: 0,
        gridY: 0,
        entity
      });
    }
  }

  private getTileKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private getFreeTile(gridState: GridRenderStateComponent): GridTile | null {
    return gridState.tilePool.find(tile => !tile.isInUse) || null;
  }

  private recycleTile(gridState: GridRenderStateComponent, tile: GridTile): void {
    // Store current position before recycling
    const currentGridX = tile.gridX;
    const currentGridY = tile.gridY;

    // Add recycling component with current position
    const recycling = new NeedsObjectRecyclingComponent();
    recycling.gridX = currentGridX;
    recycling.gridY = currentGridY;
    tile.entity.addComponent(recycling);

    tile.graphics.visible = false;
    tile.isInUse = false;
    gridState.activeTiles.delete(this.getTileKey(tile.gridX, tile.gridY));
    
    // Reset position and remove grid position component
    tile.gridX = 0;
    tile.gridY = 0;
    tile.entity.removeComponent(GridPositionComponentType);
  }

  private placeTile(gridState: GridRenderStateComponent, gridX: number, gridY: number, centerX: number, centerY: number): void {
    const tile = this.getFreeTile(gridState);
    if (!tile) return;

    const worldPos = this.gridService.gridToWorld(gridX, gridY);
    tile.graphics.position.set(worldPos.x, worldPos.y);
    tile.graphics.visible = true;
    tile.isInUse = true;
    tile.gridX = gridX;
    tile.gridY = gridY;

    gridState.activeTiles.set(this.getTileKey(gridX, gridY), tile);

    // Update tile entity with grid position and mark for spawn checking
    // Remove any existing components first to ensure clean state
    tile.entity.removeComponent(GridPositionComponentType);
    tile.entity.removeComponent(NeedsSpawnCheckComponentType);
    
    const gridPos = new GridPositionComponent(gridX, gridY);
    tile.entity.addComponent(gridPos);
    tile.entity.addComponent(new NeedsSpawnCheckComponent());
  }

  private updateVisibleTiles(centerX: number, centerY: number): void {
    const gridState = this.world?.getGridRenderState();
    if (!gridState) return;

    // Recycle tiles that are too far from center
    for (const tile of gridState.activeTiles.values()) {
      const dx = Math.abs(tile.gridX - centerX);
      const dy = Math.abs(tile.gridY - centerY);
      // Simple square visibility area
      if (dx > this.VISIBLE_RADIUS || dy > this.VISIBLE_RADIUS) {
        this.recycleTile(gridState, tile);
      }
    }

    // Place new tiles within visible square radius
    for (let y = centerY - this.VISIBLE_RADIUS; y <= centerY + this.VISIBLE_RADIUS; y++) {
      for (let x = centerX - this.VISIBLE_RADIUS; x <= centerX + this.VISIBLE_RADIUS; x++) {
        const key = this.getTileKey(x, y);
        if (!gridState.activeTiles.has(key)) {
          this.placeTile(gridState, x, y, centerX, centerY);
        }
      }
    }

    this.updateDebugStats();
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    if (!this.world) return;

    const gameState = this.world.getGameState();
    if (!gameState || gameState.currentState !== GameState.Playing) return;

    // Find player position to center grid around
    const playerEntities = this.world.getEntities().filter(entity => 
      entity.hasComponent(TransformComponentType) && entity.hasComponent(PlayerComponentType)
    );

    for (const entity of playerEntities) {
      const transform = entity.getComponent<TransformComponent>(TransformComponentType);
      if (transform) {
        const gridPos = this.gridService.worldToGrid(transform.x, transform.y);
        this.updateVisibleTiles(Math.round(gridPos.x), Math.round(gridPos.y));
        break; // Only use first player entity
      }
    }
  }
}