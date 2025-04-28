import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { CoinCounterComponent, CoinCounterComponentType } from '../components/CoinCounterComponent';
import { UIComponent, UIComponentType } from '../components/UIComponent';
import { GameState } from '../core/World';
import { ZIndexComponent } from '../components/ZIndexComponent';

@injectable()
export class CoinCounterSystem extends BaseSystem {
  readonly requiredComponents = [CoinCounterComponentType, UIComponentType];

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const counter = entity.getComponent<CoinCounterComponent>(CoinCounterComponentType);
      const ui = entity.getComponent<UIComponent>(UIComponentType);
      
      if (counter && ui) {
        const newText = `Coins: ${counter.getCount()} (High: ${counter.getHighscore()})`;
        if (ui.text.text !== newText) {
          ui.setText(newText);
        }
        // Ensure proper z-index
        ui.container.zIndex = ZIndexComponent.UI.COIN_COUNTER;
      }
    }
  }

  protected onGameStateChanged(oldState: GameState, newState: GameState): void {
    if (newState === GameState.Starting) {
      // Reset counter when game restarts
      const entities = this.world?.getEntities() || [];
      for (const entity of entities) {
        const counter = entity.getComponent<CoinCounterComponent>(CoinCounterComponentType);
        if (counter) {
          counter.reset();
          // Force UI update after reset
          const ui = entity.getComponent<UIComponent>(UIComponentType);
          if (ui) {
            ui.setText(`Coins: ${counter.getCount()} (High: ${counter.getHighscore()})`);
            // Ensure proper z-index
            ui.container.zIndex = ZIndexComponent.UI.COIN_COUNTER;
          }
        }
      }
    }
  }
} 