import { injectable, inject } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { VignetteUIComponent, VignetteUIComponentType } from '../components/VignetteUIComponent';
import { Application } from 'pixi.js';
import { GridService } from '../services/GridService';

@injectable()
export class VignetteUISystem extends BaseSystem {
  readonly requiredComponents = [VignetteUIComponentType];
  private readonly VISIBLE_RADIUS = 10;

  constructor(
    @inject(GridService) private gridService: GridService
  ) {
    super();
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    // Commented out since we handle scaling in onEntityAdded
  }

  public onEntityAdded(entity: Entity): void {
    const vignette = entity.getComponent<VignetteUIComponent>(VignetteUIComponentType);
    if (vignette && vignette.sprite && this.app) {
      const uiContainer = this.world?.getUIContainer();
      if (uiContainer) {
        console.log('[VignetteUISystem] onEntityAdded', uiContainer);
        uiContainer.container.addChild(vignette.container);
      }

      // Calculate the size of the visible grid area
      const { width, height } = this.gridService.getTileDimensions();
      const visibleGridWidth = width * this.VISIBLE_RADIUS * 2;
      const visibleGridHeight = height * this.VISIBLE_RADIUS * 2;

      console.log('[VignetteUISystem] visibleGridWidth', visibleGridWidth)
      // Scale the vignette to cover the visible grid area plus some padding
      const scale = Math.max(
        visibleGridWidth / vignette.sprite.width,
        visibleGridHeight / vignette.sprite.height
      ) * 0.8; // Add 50% padding to ensure it covers the edges well

      vignette.sprite.scale.set(scale);
    }
  }

  public onEntityRemoved(entity: Entity): void {
    const vignette = entity.getComponent<VignetteUIComponent>(VignetteUIComponentType);
    if (vignette && vignette.container.parent) {
      vignette.container.parent.removeChild(vignette.container);
    }
  }
} 