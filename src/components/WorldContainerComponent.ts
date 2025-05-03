import { Component, Entity } from '../core/Component';
import { Container } from 'pixi.js';

export const WorldContainerComponentType = Symbol('WorldContainerComponent');

export class WorldContainerComponent implements Component {
  public readonly type = WorldContainerComponentType;
  public entity: Entity | null = null;
  public container: Container;
  public cameraX: number = 0;
  public cameraY: number = 0;

  constructor() {
    this.container = new Container();
  }

  public destroy(): void {
    if (this.container) {
      this.container.destroy({ children: true });
    }
  }
} 