import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { ZIndexComponent, ZIndexComponentType } from '../components/ZIndexComponent';
import { GridPositionComponent, GridPositionComponentType } from '../components/GridPositionComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';

@injectable()
export class ZIndexSystem extends BaseSystem {
  readonly requiredComponents = [
    ZIndexComponentType,
    GridPositionComponentType,
    VisualComponentType
  ];

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    if (!this.app?.stage) return;

    // Sort entities by their Z-index
    const sortedEntities = [...entities].sort((a, b) => {
      const aZIndex = this.getEntityZIndex(a);
      const bZIndex = this.getEntityZIndex(b);
      return aZIndex - bZIndex;
    });

    // Update display object z-index (which is determined by the order in the container's children array)
    sortedEntities.forEach(entity => {
      const visual = entity.getComponent<VisualComponent>(VisualComponentType);
      if (visual?.container) {
        // Remove and re-add to update position in children array
        const parent = visual.container.parent;
        if (parent) {
          parent.removeChild(visual.container);
          parent.addChild(visual.container);
        }
      }
    });
  }

  private getEntityZIndex(entity: Entity): number {
    const zIndex = entity.getComponent<ZIndexComponent>(ZIndexComponentType);
    const gridPos = entity.getComponent<GridPositionComponent>(GridPositionComponentType);
    
    if (!zIndex || !gridPos) return 0;
    return zIndex.calculateZ(gridPos);
  }
} 