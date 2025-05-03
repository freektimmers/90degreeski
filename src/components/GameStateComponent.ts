import { Component, Entity } from '../core/Component';

export enum GameState {
  Playing = 'Playing',
  GameOver = 'GameOver',
  Starting = 'Starting'
}

export const GameStateComponentType = Symbol('GameStateComponent');

export class GameStateComponent implements Component {
  public readonly type = GameStateComponentType;
  public entity: Entity | null = null;
  
  private _currentState: GameState = GameState.Starting;

  public get currentState(): GameState {
    return this._currentState;
  }

  public set currentState(newState: GameState) {
    const oldState = this._currentState;
    this._currentState = newState;
    
    // Emit state change event through the entity if available
    if (this.entity?.world) {
      this.entity.world.emit('gameStateChanged', { 
        oldState, 
        newState,
        entity: this.entity 
      });
    }
  }

  public destroy(): void {
    this.entity = null;
  }
} 