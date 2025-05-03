import { injectable } from 'inversify';
import { BaseSystem } from '../core/System';
import { Entity } from '../core/Component';
import { CoinCounterComponent, CoinCounterComponentType } from '../components/CoinCounterComponent';
import { UIComponent, UIComponentType } from '../components/UIComponent';
import { ZIndexComponent } from '../components/ZIndexComponent';

@injectable()
export class CoinCounterSystem extends BaseSystem {
  readonly requiredComponents = [CoinCounterComponentType, UIComponentType];

  protected updateRelevantEntities(entities: Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const counter = entity.getComponent<CoinCounterComponent>(CoinCounterComponentType);
      const ui = entity.getComponent<UIComponent>(UIComponentType);
      
      if (counter && ui) {
        const newText = `Coins: ${counter.count} (High: ${counter.highscore})`;
        if (ui.text.text !== newText) {
          ui.setText(newText);
        }
        // Ensure proper z-index
        ui.container.zIndex = ZIndexComponent.UI.COIN_COUNTER;
      }
    }
  }

  public onEntityAdded(entity: Entity): void {
    const counter = entity.getComponent<CoinCounterComponent>(CoinCounterComponentType);
    if (counter) {
      // Initialize counter state
      counter.count = 0;
      // Load highscore from localStorage
      const savedHighscore = localStorage.getItem('coinHighscore');
      if (savedHighscore) {
        counter.highscore = parseInt(savedHighscore, 10);
      }
    }
  }

  public onEntityRemoved(entity: Entity): void {
    const counter = entity.getComponent<CoinCounterComponent>(CoinCounterComponentType);
    if (counter && counter.count > counter.highscore) {
      // Save highscore when entity is removed
      localStorage.setItem('coinHighscore', counter.highscore.toString());
    }
  }

  public incrementCounter(entity: Entity): void {
    const counter = entity.getComponent<CoinCounterComponent>(CoinCounterComponentType);
    if (counter) {
      counter.count++;
      // Update highscore if current count is higher
      if (counter.count > counter.highscore) {
        counter.highscore = counter.count;
        localStorage.setItem('coinHighscore', counter.highscore.toString());
      }
    }
  }
} 