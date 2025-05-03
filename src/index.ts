import 'reflect-metadata';
import { createContainer } from './di/container';
import { Game } from './core/Game';

async function main() {
  const container = createContainer();
  const game = container.get(Game);
  
  await game.initialize();
  game.start();

  // Handle window resize
  window.addEventListener('resize', () => {
    game.resize(window.innerWidth, window.innerHeight);
  });
}

main().catch(console.error); 