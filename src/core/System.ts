import { Entity } from './Component';
import { Application } from 'pixi.js';
import { World } from './World';
import { GameState } from '../components/GameStateComponent';

export interface System {
  readonly requiredComponents: symbol[];
  setApp(app: Application): void;
  setWorld(world: World): void;
  update(entities: Entity[], deltaTime: number): void;
  onEntityAdded?(entity: Entity): void;
  onEntityRemoved?(entity: Entity): void;
  onGameStateChanged?(oldState: GameState, newState: GameState): void;
  reset?(): void;
}

export abstract class BaseSystem implements System {
  protected app: Application | null = null;
  protected world: World | null = null;
  protected lastExecutionTime: number = 0;

  abstract readonly requiredComponents: symbol[];

  setApp(app: Application): void {
    // console.log(`[${this.constructor.name}] Setting up PIXI application`);
    this.app = app;
  }

  setWorld(world: World): void {
    // console.log(`[${this.constructor.name}] Setting up world reference`);
    this.world = world;
    // Listen for entity lifecycle events
    world.on('entityAdded', (entity: Entity) => {
      if (this.requiredComponents.every(componentType => entity.hasComponent(componentType))) {
        // console.log(`[${this.constructor.name}] Entity added with required components: ${entity.constructor.name}`);
        this.onEntityAdded?.(entity);
      }
    });

    // Listen for game state changes
    world.on('gameStateChanged', ({ oldState, newState }) => {
      // console.log(`[${this.constructor.name}] Game state changed: ${oldState} -> ${newState}`);
      this.onGameStateChanged?.(oldState, newState);
    });
  }

  /**
   * Called when the game state changes
   */
  onGameStateChanged?(oldState: GameState, newState: GameState): void {
    // console.log(`[${this.constructor.name}] Handling game state change: ${oldState} -> ${newState}`);
  }

  /**
   * Called when the system needs to reset its state
   */
  reset?(): void {
    console.log(`[${this.constructor.name}] Resetting system state`);
  }

  onEntityAdded?(entity: Entity): void {
    // console.log(`[${this.constructor.name}] Entity added: ${entity.constructor.name}`);
  }

  onEntityRemoved?(entity: Entity): void {
    // console.log(`[${this.constructor.name}] Entity removed: ${entity.constructor.name}`);
  }

  update(entities: Entity[], deltaTime: number): void {
    if (!this.world) return;

    const gameState = this.world.getGameState();
    if (!gameState || gameState.currentState !== GameState.Playing) {
      return;
    }

    const startTime = performance.now();
    
    const relevantEntities = entities.filter(entity => 
      this.requiredComponents.every(componentType => entity.hasComponent(componentType))
    );
    this.updateRelevantEntities(relevantEntities, deltaTime);

    this.lastExecutionTime = performance.now() - startTime;

    // Update debug stats if debug state is available
    const debugState = this.world.getDebugState();
    if (debugState) {
      debugState.updateStats(this.constructor.name, {
        entities: relevantEntities.length,
        executionTime: this.lastExecutionTime
      });
    }
  }

  protected abstract updateRelevantEntities(entities: Entity[], deltaTime: number): void;
} 