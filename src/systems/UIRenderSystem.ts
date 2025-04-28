import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { UIComponent, UIComponentType } from '../components/UIComponent';
import { Application, Container } from 'pixi.js';
import { ZIndexComponent } from '../components/ZIndexComponent';

@injectable()
export class UIRenderSystem extends BaseSystem {
  private uiContainer: Container;
  readonly requiredComponents = [UIComponentType];

  constructor() {
    super();
    this.uiContainer = new Container();
    // Set a very high z-index to ensure UI is always on top
    this.uiContainer.zIndex = 10000;
  }

  public setApp(app: Application): void {
    super.setApp(app);
    if (app) {
      app.stage.addChild(this.uiContainer);
    }
  }

  public cleanup(): void {
    if (this.uiContainer && this.app) {
      this.app.stage.removeChild(this.uiContainer);
      this.uiContainer.destroy();
      this.uiContainer = new Container();
      this.uiContainer.zIndex = 10000;
    }
  }

  public reinitialize(): void {
    this.cleanup();
    if (this.app) {
      this.app.stage.addChild(this.uiContainer);
    }
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    if (!this.app) return;

    for (const entity of entities) {
      const ui = entity.getComponent<UIComponent>(UIComponentType);
      if (ui && !this.uiContainer.children.includes(ui.container)) {
        this.uiContainer.addChild(ui.container);
      }
    }
  }
} 