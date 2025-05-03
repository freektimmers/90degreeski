import { Entity, Component } from './Component';
import { World } from './World';

export class BaseEntity implements Entity {
  id?: number | undefined;
  private components: Map<symbol, Component> = new Map();
  public world?: World;

  public addComponent(component: Component): void {
    this.components.set(component.type, component);
    component.entity = this;
  }

  public removeComponent(componentType: symbol): void {
    const component = this.components.get(componentType);
    if (component) {
      // Call destroy on component if it exists
      if ('destroy' in component && typeof (component as any).destroy === 'function') {
        (component as any).destroy();
      }
      component.entity = null;
      this.components.delete(componentType);
    }
  }

  public getComponent<T extends Component>(componentType: symbol): T | null {
    return (this.components.get(componentType) as T) || null;
  }

  public hasComponent(componentType: symbol): boolean {
    return this.components.has(componentType);
  }

  public destroy(): void {
    // Clean up each component
    this.components.forEach(component => {
      // Call destroy on component if it exists
      if ('destroy' in component && typeof (component as any).destroy === 'function') {
        (component as any).destroy();
      }
      component.entity = null;
    });
    
    // Clear all components
    this.components.clear();

    // Remove from world if attached
    if (this.world) {
      this.world.removeEntity(this);
      this.world = undefined;
    }
  }
} 