import { Component, Entity } from './Component';

export class BaseEntity implements Entity {
  private static nextId = 0;
  public readonly id: number;
  public components: Map<symbol, Component>;

  constructor() {
    this.id = BaseEntity.nextId++;
    this.components = new Map();
  }

  public addComponent(component: Component): void {
    this.components.set(component.type, component);
    component.entity = this;
  }

  public removeComponent(componentType: symbol): void {
    const component = this.components.get(componentType);
    if (component) {
      component.entity = null;
      this.components.delete(componentType);
    }
  }

  public getComponent<T extends Component>(componentType: symbol): T | undefined {
    return this.components.get(componentType) as T;
  }

  public hasComponent(componentType: symbol): boolean {
    return this.components.has(componentType);
  }
} 