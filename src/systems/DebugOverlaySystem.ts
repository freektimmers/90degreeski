import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { DebugStateComponent, DebugStateComponentType, SystemStats } from '../components/DebugStateComponent';

@injectable()
export class DebugOverlaySystem extends BaseSystem {
  readonly requiredComponents = [];

  public updateStats(systemName: string, stats: Partial<SystemStats>): void {
    const debugState = this.world?.getDebugState();
    if (!debugState) {
      console.error('[DebugOverlaySystem] DebugStateComponent not available');
      return;
    }

    debugState.updateStats(systemName, stats);
  }

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    const debugState = this.world?.getDebugState();
    if (!debugState) return;

    debugState.updateFps();
  }
} 