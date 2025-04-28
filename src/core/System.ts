import { Entity } from './Component';
import { Application } from 'pixi.js';
import { World, GameState } from './World';

export interface System {
  readonly requiredComponents: symbol[];
  setApp(app: Application): void;
  setWorld(world: World): void;
  update(entities: Entity[], deltaTime: number): void;
}

export abstract class BaseSystem implements System {
  protected app: Application | null = null;
  protected world: World | null = null;

  abstract readonly requiredComponents: symbol[];

  setApp(app: Application): void {
    this.app = app;
  }

  setWorld(world: World): void {
    this.world = world;
    // Listen for game state changes
    world.on('gameStateChanged', ({ oldState, newState }) => {
      this.onGameStateChanged(oldState, newState);
    });
  }

  /**
   * Called when the game state changes
   */
  protected onGameStateChanged(oldState: GameState, newState: GameState): void {
    // Base implementation does nothing, systems can override
  }

  /**
   * Called when the system needs to reset its state
   */
  public reset(): void {
    // Base implementation does nothing, systems can override
  }

  /**
   * Called when the system needs to initialize or re-initialize
   */
  public initialize(): void {
    // Base implementation does nothing, systems can override
  }

  /**
   * Called when the system needs to cleanup its resources
   */
  public cleanup(): void {
    // Base implementation does nothing, systems can override
  }

  /**
   * Called when the system needs to be fully reinitialized
   */
  public reinitialize(): void {
    this.cleanup();
    this.reset();
    this.initialize();
  }

  update(entities: Entity[], deltaTime: number): void {
    const relevantEntities = entities.filter(entity => 
      this.requiredComponents.every(componentType => entity.hasComponent(componentType))
    );
    this.updateRelevantEntities(relevantEntities, deltaTime);
  }

  protected abstract updateRelevantEntities(entities: Entity[], deltaTime: number): void;
} 