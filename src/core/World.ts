import { injectable } from 'inversify';
import { Entity } from './Component';
import { BaseSystem } from './System';
import { EventEmitter } from './EventEmitter';
import { Container } from 'inversify';

export enum GameState {
  Playing = 'Playing',
  GameOver = 'GameOver',
  Starting = 'Starting'
}

@injectable()
export class World extends EventEmitter {
  private systems: BaseSystem[] = [];
  private entities: Set<Entity> = new Set();
  private currentState: GameState = GameState.Starting;
  private _container: Container;

  constructor(container: Container) {
    super();
    this._container = container;
  }

  public addSystem(system: BaseSystem): void {
    this.systems.push(system);
    system.setWorld(this);
  }

  public addEntity(entity: Entity): void {
    this.entities.add(entity);
  }

  public removeEntity(entity: Entity): void {
    this.entities.delete(entity);
  }

  public clearEntities(): void {
    this.entities.clear();
  }

  public getEntities(): Entity[] {
    return Array.from(this.entities);
  }

  public getSystem<T extends BaseSystem>(systemType: new (...args: any[]) => T): T | undefined {
    return this.systems.find(system => system instanceof systemType) as T | undefined;
  }

  public clearSystems(): void {
    this.systems = [];
  }

  public cleanup(): void {
    // Clear all entities
    this.clearEntities();
    
    // Reset all systems
    for (const system of this.systems) {
      system.reset();
    }
    
    // Clear systems
    this.clearSystems();
    
    // Reset game state
    this.currentState = GameState.Starting;
  }

  public getCurrentState(): GameState {
    return this.currentState;
  }

  public setGameState(newState: GameState): void {
    const oldState = this.currentState;
    this.currentState = newState;
    
    // Emit state change event that systems can listen to
    this.emit('gameStateChanged', { oldState, newState });

    if (newState === GameState.GameOver) {
      this.emit('gameOver');
    } else if (newState === GameState.Starting) {
      // Transition to Playing state after a short delay
      setTimeout(() => {
        this.setGameState(GameState.Playing);
      }, 100);
    }
  }

  public update(deltaTime: number): void {
    // Only update systems if we're in Playing state
    if (this.currentState !== GameState.Playing) {
      return;
    }

    const entities = Array.from(this.entities);
    for (const system of this.systems) {
      system.update(entities, deltaTime);
    }
  }

  public get container(): Container {
    return this._container;
  }
} 