import { World } from './World';

export interface Entity {
  id?: number;
  addComponent(component: Component): void;
  removeComponent(componentType: symbol): void;
  getComponent<T extends Component>(componentType: symbol): T | null;
  hasComponent(componentType: symbol): boolean;
  destroy(): void;
  world?: World;
}

export interface Component {
  readonly type: symbol;
  entity: Entity | null;
} 