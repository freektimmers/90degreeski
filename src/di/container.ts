import { Container } from 'inversify';
import { World } from '../core/World';
import { Game } from '../core/Game';
import { MovementSystem } from '../systems/MovementSystem';
import { InputSystem } from '../systems/InputSystem';
import { GridRenderSystem } from '../systems/GridRenderSystem';
import { TreeSystem } from '../systems/TreeSystem';
import { ZIndexSystem } from '../systems/ZIndexSystem';
import { CoinSystem } from '../systems/CoinSystem';
import { GridService } from '../services/GridService';
import { GridOccupancyService } from '../services/GridOccupancyService';
import { UIRenderSystem } from '../systems/UIRenderSystem';
import { CoinCounterSystem } from '../systems/CoinCounterSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { SpeedBoostSystem } from '../systems/SpeedBoostSystem';
import { VignetteSystem } from '../systems/VignetteSystem';

export function createContainer(): Container {
  const container = new Container();

  // Create a factory function for World that takes the container
  const worldFactory = (c: Container) => {
    return new World(c);
  };

  // Bind World as a factory to ensure fresh instances
  container.bind<World>(World).toFactory<World>((context) => {
    return () => worldFactory(container);
  });

  // Bind Game as a singleton
  container.bind<Game>(Game).toSelf().inSingletonScope();

  // Bind all systems as singletons
  container.bind<MovementSystem>(MovementSystem).toSelf().inSingletonScope();
  container.bind<InputSystem>(InputSystem).toSelf().inSingletonScope();
  container.bind<GridRenderSystem>(GridRenderSystem).toSelf().inSingletonScope();
  container.bind<TreeSystem>(TreeSystem).toSelf().inSingletonScope();
  container.bind<ZIndexSystem>(ZIndexSystem).toSelf().inSingletonScope();
  container.bind<CoinSystem>(CoinSystem).toSelf().inSingletonScope();
  container.bind<UIRenderSystem>(UIRenderSystem).toSelf().inSingletonScope();
  container.bind<CoinCounterSystem>(CoinCounterSystem).toSelf().inSingletonScope();
  container.bind<ParticleSystem>(ParticleSystem).toSelf().inSingletonScope();
  container.bind<SpeedBoostSystem>(SpeedBoostSystem).toSelf().inSingletonScope();
  container.bind<VignetteSystem>(VignetteSystem).toSelf().inSingletonScope();

  // Bind services as singletons
  container.bind<GridService>(GridService).toSelf().inSingletonScope();
  container.bind<GridOccupancyService>(GridOccupancyService).toSelf().inSingletonScope();

  return container;
} 