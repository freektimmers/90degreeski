import { SpawnConfig } from '../components/SpawnRuleComponent';
import { OccupancyType } from '../components/GridOccupancyComponent';
import { getAssetPath } from '../utils/assetPath';

export const TREE_SPAWN_CONFIG: SpawnConfig = {
  spritePath: 'tree.png',
  spawnChance: 0.15,
  minDistanceFromStart: 2,
  occupancyType: OccupancyType.Tree,
  poolSize: 50
};

export const COIN_SPAWN_CONFIG: SpawnConfig = {
  spritePath: 'coin.png',
  spawnChance: 0.1,
  minDistanceFromStart: 2,
  occupancyType: OccupancyType.Coin,
  poolSize: 30
}; 