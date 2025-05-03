import { Component, Entity } from '../core/Component';
import { Container } from 'pixi.js';

export const UIContainerComponentType = Symbol('UIContainerComponent');

export class UIContainerComponent implements Component {
  public readonly type = UIContainerComponentType;
  public entity: Entity | null = null;
  
  public container: Container;

  constructor() {
    this.container = new Container();
    this.container.zIndex = 10000;
  }

  public destroy(): void {
    if (this.container) {
      this.container.destroy({ children: true });
    }
  }
} 