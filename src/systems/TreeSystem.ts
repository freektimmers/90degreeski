import { injectable, inject } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { BaseEntity } from '../core/BaseEntity';
import { TransformComponent, TransformComponentType } from '../components/TransformComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { TreeComponent, TreeComponentType } from '../components/TreeComponent';
import { ZIndexComponent, ZIndexComponentType } from '../components/ZIndexComponent';
import { PlayerComponent, PlayerComponentType } from '../components/PlayerComponent';
import { GridService } from '../services/GridService';
import { GridOccupancyService, OccupancyType } from '../services/GridOccupancyService';
import { World, GameState } from '../core/World';
import { Application } from 'pixi.js';
import { MovementSystem } from '../systems/MovementSystem';

// Z-index base values for different entity types
const Z_INDEX = {
  TREE: 100
};

interface PooledTree {
  entity: Entity;
  isInUse: boolean;
  gridX: number;
  gridY: number;
}

@injectable()
export class TreeSystem extends BaseSystem {
  private readonly TREE_DENSITY = 0.05; // 5% chance of a tree on each tile
  private readonly VISIBLE_RADIUS = 12; // Match GridRenderSystem's visible radius
  private readonly POOL_SIZE = 100; // Maximum number of trees that can exist at once
  
  private treePool: PooledTree[] = [];
  private activeTreePositions: Map<string, PooledTree> = new Map();
  private pendingTileEvents: { gridX: number, gridY: number }[] = [];
  private isInitialized = false;

  readonly requiredComponents = [
    GridPositionComponentType,
    TreeComponentType
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
      if (!this.isInitialized) {
        this.pendingTileEvents.push(data);
      } else {
        this.trySpawnTreeAt(data.gridX, data.gridY);
      }
    });

    // Initialize tree pool if app is already set
    if (this.app) {
      const movementSystem = this.world.getSystem<MovementSystem>(MovementSystem);
      if (movementSystem?.worldContainer) {
        this.initializeTreePool();
      }
    }
  }

  public setApp(app: Application): void {
    this.app = app;
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
    // First remove all active trees from the stage and grid
    for (const [key, tree] of this.activeTreePositions.entries()) {
      const visual = tree.entity.getComponent<VisualComponent>(VisualComponentType);
      if (visual && visual.container.parent) {
        visual.container.parent.removeChild(visual.container);
      }
      if (this.world) {
        this.world.removeEntity(tree.entity);
      }
      this.gridOccupancyService.free(tree.gridX, tree.gridY, OccupancyType.Tree);
    }

    // Clear active positions map
    this.activeTreePositions.clear();

    // Clean up the pool
    for (const tree of this.treePool) {
      if (this.world) {
        this.world.removeEntity(tree.entity);
      }
    }
    this.treePool = [];
    this.isInitialized = false;

    // Reinitialize the pool
    if (this.app && this.world) {
      const movementSystem = this.world.getSystem<MovementSystem>(MovementSystem);
      if (movementSystem?.worldContainer) {
        this.initializeTreePool();
      }
    }
  }

  private initializeTreePool(): void {
    if (!this.world || !this.app?.stage) return;
    
    // Get the movement system first
    const movementSystem = this.world.getSystem<MovementSystem>(MovementSystem);
    if (!movementSystem?.worldContainer) {
      console.warn('[TreeSystem] Movement system not ready, delaying pool initialization');
      return;
    }
    
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const tree = new BaseEntity();
      const transform = new TransformComponent(0, 0);
      const gridPos = new GridPositionComponent(0, 0);
      const visual = new VisualComponent({
        spritePath: '/tree.png',
      });
      const treeComponent = new TreeComponent();
      const zIndex = new ZIndexComponent(Z_INDEX.TREE);

      tree.addComponent(transform);
      tree.addComponent(gridPos);
      tree.addComponent(visual);
      tree.addComponent(treeComponent);
      tree.addComponent(zIndex);

      this.world.addEntity(tree);
      
      // Add to world container
      movementSystem.worldContainer.addChild(visual.container);
      visual.container.visible = false;

      this.treePool.push({
        entity: tree,
        isInUse: false,
        gridX: 0,
        gridY: 0
      });
    }
    
    // Mark as initialized and process any pending tile events
    this.isInitialized = true;
    this.processPendingTileEvents();
  }

  private processPendingTileEvents(): void {
    if (!this.isInitialized) return;
    
    // Process all pending tile events
    for (const event of this.pendingTileEvents) {
      this.trySpawnTreeAt(event.gridX, event.gridY);
    }
    this.pendingTileEvents = [];
  }

  private removeTree(gridX: number, gridY: number): void {
    const key = `${gridX},${gridY}`;
    const tree = this.activeTreePositions.get(key);
    
    if (tree) {
      const visual = tree.entity.getComponent<VisualComponent>(VisualComponentType);
      if (visual) {
        visual.container.visible = false;
      }
      
      // Mark the tree as not in use in the pool
      tree.isInUse = false;
      tree.gridX = 0;
      tree.gridY = 0;
      
      this.gridOccupancyService.free(gridX, gridY, OccupancyType.Tree);
      this.activeTreePositions.delete(key);
    }
  }

  public spawnTree(gridX: number, gridY: number): void {
    const key = `${gridX},${gridY}`;
    if (this.activeTreePositions.has(key)) {
      return;
    }

    if (this.gridOccupancyService.isOccupied(gridX, gridY)) {
      return;
    }

    // Find an unused tree from the pool
    const unusedTreeIndex = this.treePool.findIndex(tree => !tree.isInUse);
    if (unusedTreeIndex === -1) {
      console.warn('[TreeSystem] Tree pool exhausted. Active trees:', this.activeTreePositions.size);
      return;
    }

    const unusedTree = this.treePool[unusedTreeIndex];
    const worldPos = this.gridService.gridToWorld(gridX, gridY);
    
    // Update the tree's components
    const transform = unusedTree.entity.getComponent<TransformComponent>(TransformComponentType);
    const gridPos = unusedTree.entity.getComponent<GridPositionComponent>(GridPositionComponentType);
    const visual = unusedTree.entity.getComponent<VisualComponent>(VisualComponentType);
    
    if (!transform || !gridPos || !visual) {
      console.warn('[TreeSystem] Missing required components for tree');
      return;
    }

    // Get the movement system and world container
    const movementSystem = this.world?.getSystem<MovementSystem>(MovementSystem);
    if (!movementSystem?.worldContainer) {
      console.warn('[TreeSystem] Movement system or world container not ready');
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

    // Mark the tree as in use in the pool
    unusedTree.isInUse = true;
    unusedTree.gridX = gridX;
    unusedTree.gridY = gridY;
    
    this.activeTreePositions.set(key, unusedTree);
    this.gridOccupancyService.occupy(gridX, gridY, OccupancyType.Tree);
  }

  public trySpawnTreeAt(gridX: number, gridY: number): void {
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
    if (roll < this.TREE_DENSITY) {
      this.spawnTree(gridX, gridY);
    }
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    if (!this.app?.stage || this.world?.getCurrentState() !== GameState.Playing) return;

    // Get the movement system to access the world container
    const movementSystem = this.world.getSystem<MovementSystem>(MovementSystem);
    if (!movementSystem?.worldContainer) {
      return;
    }

    // Update positions of all trees
    for (const tree of this.activeTreePositions.values()) {
      this.updateTreePosition(tree.entity);
    }

    // Check for collisions with players
    const players = this.world?.getEntities().filter(entity => 
      entity.hasComponent(PlayerComponentType) &&
      entity.hasComponent(GridPositionComponentType)
    );

    if (players) {
      for (const player of players) {
        const playerGridPos = player.getComponent<GridPositionComponent>(GridPositionComponentType);
        if (playerGridPos) {
          // First check grid occupancy service
          if (this.gridOccupancyService.isOccupied(playerGridPos.gridX, playerGridPos.gridY, OccupancyType.Tree)) {
            // Verify against active trees to ensure the tree still exists
            const key = `${playerGridPos.gridX},${playerGridPos.gridY}`;
            if (this.activeTreePositions.has(key)) {
              this.world?.setGameState(GameState.GameOver);
              return;
            } else {
              // If we found an occupancy but no active tree, clean up the occupancy
              this.gridOccupancyService.free(playerGridPos.gridX, playerGridPos.gridY, OccupancyType.Tree);
            }
          }
        }
      }
    }

    // Clean up trees that are too far from the center
    const worldContainerPos = movementSystem.worldContainer.position;
    if (!worldContainerPos) {
      return;
    }

    const centerWorldX = -worldContainerPos.x;
    const centerWorldY = -worldContainerPos.y;

    const worldPos = this.gridService.worldToGrid(centerWorldX, centerWorldY);
    const gridCenterX = Math.floor(worldPos.x);
    const gridCenterY = Math.floor(worldPos.y);

    // Remove trees that are too far from view
    for (const [key, tree] of this.activeTreePositions.entries()) {
      const gridPos = tree.entity.getComponent<GridPositionComponent>(GridPositionComponentType);
      if (gridPos) {
        const distance = Math.abs(gridPos.gridX - gridCenterX) + Math.abs(gridPos.gridY - gridCenterY);
        if (distance > this.VISIBLE_RADIUS * 1.5) {
          this.removeTree(gridPos.gridX, gridPos.gridY);
        }
      }
    }
  }

  private updateTreePosition(tree: Entity): void {
    const transform = tree.getComponent<TransformComponent>(TransformComponentType);
    const visual = tree.getComponent<VisualComponent>(VisualComponentType);
    
    if (transform && visual) {
      visual.container.position.set(transform.x, transform.y);
    }
  }
} 