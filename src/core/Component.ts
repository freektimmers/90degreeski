export interface Component {
  readonly type: symbol;
  entity: Entity | null;
}

export interface Entity {
  id: number;
  components: Map<symbol, Component>;
  addComponent(component: Component): void;
  removeComponent(componentType: symbol): void;
  getComponent<T extends Component>(componentType: symbol): T | undefined;
  hasComponent(componentType: symbol): boolean;
} 