import { Container } from 'inversify';
import { World } from '../core/World';
import { Game } from '../core/Game';
import { MovementSystem } from '../systems/MovementSystem';
import { InputSystem } from '../systems/InputSystem';
import { GridRenderSystem } from '../systems/GridRenderSystem';
import { ZIndexSystem } from '../systems/ZIndexSystem';
import { GridService } from '../services/GridService';
import { GridOccupancyService } from '../services/GridOccupancyService';
import { CoinCounterSystem } from '../systems/CoinCounterSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
// import { DebugOverlaySystem } from '../systems/DebugOverlaySystem';
import { GridOccupancySystem } from '../systems/GridOccupancySystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { CoinCollisionSystem } from '../systems/CoinCollisionSystem';
import { TreeCollisionSystem } from '../systems/TreeCollisionSystem';
import { GridObjectSpawnerSystem } from '../systems/GridObjectSpawnerSystem';
import { BaseEntity } from '../core/BaseEntity';
import { SpawnRuleComponent } from '../components/SpawnRuleComponent';
import { TREE_SPAWN_CONFIG, COIN_SPAWN_CONFIG } from '../config/spawnRules';
import { VignetteUISystem } from '../systems/VignetteUISystem';
import { ObjectRecyclingSystem } from '../systems/ObjectRecyclingSystem';

export function createContainer(): Container {
  const container = new Container();

  // Register services
  container.bind(GridService).toSelf().inSingletonScope();
  container.bind(GridOccupancyService).toSelf().inSingletonScope();
  // container.bind(DebugOverlaySystem).toSelf().inSingletonScope();

  // Create and bind world
  const world = new World(container);

  // Register systems first
  container.bind(MovementSystem).toSelf().inSingletonScope();
  container.bind(InputSystem).toSelf().inSingletonScope();
  container.bind(GridRenderSystem).toSelf().inSingletonScope();
  container.bind(ZIndexSystem).toSelf().inSingletonScope();
  container.bind(CoinCounterSystem).toSelf().inSingletonScope();
  container.bind(ParticleSystem).toSelf().inSingletonScope();
  container.bind(GridOccupancySystem).toSelf().inSingletonScope();
  container.bind(CollisionSystem).toSelf().inSingletonScope();
  container.bind(CoinCollisionSystem).toSelf().inSingletonScope();
  container.bind(TreeCollisionSystem).toSelf().inSingletonScope();
  container.bind(GridObjectSpawnerSystem).toSelf().inSingletonScope();
  container.bind(ObjectRecyclingSystem).toSelf().inSingletonScope();
  container.bind(VignetteUISystem).toSelf().inSingletonScope();

  // Register world
  container.bind(World).toConstantValue(world);

  // Register game
  container.bind(Game).toSelf().inSingletonScope();

  // Create spawn rule entities
  const treeSpawnRuleEntity = new BaseEntity();
  treeSpawnRuleEntity.addComponent(new SpawnRuleComponent(TREE_SPAWN_CONFIG));
  world.addEntity(treeSpawnRuleEntity);

  const coinSpawnRuleEntity = new BaseEntity();
  coinSpawnRuleEntity.addComponent(new SpawnRuleComponent(COIN_SPAWN_CONFIG));
  world.addEntity(coinSpawnRuleEntity);

  // Create manager entities last, after all systems are registered
  console.log('[Container] Creating manager entities...');
  world.createManagerEntities();

  return container;
} 