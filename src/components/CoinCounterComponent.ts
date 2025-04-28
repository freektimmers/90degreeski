import { Component } from '../core/Component';
import { Entity } from '../core/Component';

export const CoinCounterComponentType = Symbol('CoinCounterComponent');

export class CoinCounterComponent implements Component {
  public readonly type = CoinCounterComponentType;
  public entity: Entity | null = null;
  private count: number = 0;
  private highscore: number = 0;

  constructor() {
    // Load highscore from localStorage
    const savedHighscore = localStorage.getItem('coinHighscore');
    if (savedHighscore) {
      this.highscore = parseInt(savedHighscore, 10);
    }
  }

  public increment(): void {
    this.count++;
    // Update highscore if current count is higher
    if (this.count > this.highscore) {
      this.highscore = this.count;
      localStorage.setItem('coinHighscore', this.highscore.toString());
    }
  }

  public getCount(): number {
    return this.count;
  }

  public getHighscore(): number {
    return this.highscore;
  }

  public reset(): void {
    this.count = 0;
  }
} 