import 'reflect-metadata';
import { createContainer } from './di/container';
import { Game } from './core/Game';

// Create container and get the game instance
const container = createContainer();
const game = container.get<Game>(Game);

// Start the game
game.start(); 