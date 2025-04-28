import { Application, Assets } from 'pixi.js';
import { injectable, inject } from 'inversify';
import { World, GameState } from './World';
import { MovementSystem } from '../systems/MovementSystem';
import { InputSystem } from '../systems/InputSystem';
import { GridRenderSystem } from '../systems/GridRenderSystem';
import { TreeSystem } from '../systems/TreeSystem';
import { ZIndexSystem } from '../systems/ZIndexSystem';
import { CoinSystem } from '../systems/CoinSystem';
import { BaseEntity } from './BaseEntity';
import { TransformComponent } from '../components/TransformComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { IsometricMovementComponent, Direction } from '../components/IsometricMovementComponent';
import { GridPositionComponent } from '../components/GridPositionComponent';
import { ZIndexComponent } from '../components/ZIndexComponent';
import { PlayerComponent } from '../components/PlayerComponent';
import { GridOccupancyService } from '../services/GridOccupancyService';
import { UIRenderSystem } from '../systems/UIRenderSystem';
import { CoinCounterSystem } from '../systems/CoinCounterSystem';
import { UIComponent, UIComponentType } from '../components/UIComponent';
import { CoinCounterComponent } from '../components/CoinCounterComponent';
import { ParticleSystem } from '../systems/ParticleSystem';
import { ParticleComponent } from '../components/ParticleComponent';
import { SpeedBoostComponent } from '../components/SpeedBoostComponent';
import { SpeedBoostSystem } from '../systems/SpeedBoostSystem';
import { VignetteSystem } from '../systems/VignetteSystem';

// Z-index base values for different entity types
const Z_INDEX = {
  TILE: 0,
  TREE: 100,
  CHARACTER: 200
};

@injectable()
export class Game {
  private app!: Application;
  private world: World;
  private lastTime: number;
  private readonly TILE_WIDTH = 128;
  private readonly TILE_HEIGHT = 64;
  private character: BaseEntity | null = null;
  private gridOccupancyService: GridOccupancyService | null = null;
  private coinCounter: BaseEntity | null = null;

  constructor(
    @inject(World) worldFactory: () => World,
    @inject(MovementSystem) private movementSystem: MovementSystem,
    @inject(InputSystem) private inputSystem: InputSystem,
    @inject(GridRenderSystem) private gridRenderSystem: GridRenderSystem,
    @inject(TreeSystem) private treeSystem: TreeSystem,
    @inject(ZIndexSystem) private zIndexSystem: ZIndexSystem,
    @inject(CoinSystem) private coinSystem: CoinSystem,
    @inject(UIRenderSystem) private uiRenderSystem: UIRenderSystem,
    @inject(CoinCounterSystem) private coinCounterSystem: CoinCounterSystem,
    @inject(ParticleSystem) private particleSystem: ParticleSystem,
    @inject(SpeedBoostSystem) private speedBoostSystem: SpeedBoostSystem,
    @inject(VignetteSystem) private vignetteSystem: VignetteSystem
  ) {
    this.world = worldFactory();
    this.world.addSystem(gridRenderSystem);
    this.world.addSystem(movementSystem);
    this.world.addSystem(inputSystem);
    this.world.addSystem(treeSystem);
    this.world.addSystem(zIndexSystem);
    this.world.addSystem(coinSystem);
    this.world.addSystem(uiRenderSystem);
    this.world.addSystem(coinCounterSystem);
    this.world.addSystem(particleSystem);
    this.world.addSystem(speedBoostSystem);
    this.world.addSystem(vignetteSystem);
    this.lastTime = performance.now();
    this.gameLoop = this.gameLoop.bind(this);

    // Listen for game over event
    this.world.on('gameOver', () => {
      setTimeout(() => {
        this.restart();
      }, 1000);
    });

    // Listen for character creation events
    this.world.on('createCharacter', () => {
      this.createCharacter();
    });
  }

  private async initializeSystems(): Promise<void> {
    // Get fresh instances of all systems from the container
    const container = this.world.container;
    this.movementSystem = container.get<MovementSystem>(MovementSystem);
    this.inputSystem = container.get<InputSystem>(InputSystem);
    this.gridRenderSystem = container.get<GridRenderSystem>(GridRenderSystem);
    this.treeSystem = container.get<TreeSystem>(TreeSystem);
    this.zIndexSystem = container.get<ZIndexSystem>(ZIndexSystem);
    this.coinSystem = container.get<CoinSystem>(CoinSystem);
    this.uiRenderSystem = container.get<UIRenderSystem>(UIRenderSystem);
    this.coinCounterSystem = container.get<CoinCounterSystem>(CoinCounterSystem);
    this.particleSystem = container.get<ParticleSystem>(ParticleSystem);
    this.speedBoostSystem = container.get<SpeedBoostSystem>(SpeedBoostSystem);
    this.vignetteSystem = container.get<VignetteSystem>(VignetteSystem);

    // Get a new world instance using the factory
    const worldFactory = container.get<() => World>(World);
    this.world = worldFactory();

    // Set up app references first
    this.movementSystem.setApp(this.app);
    this.inputSystem.setApp(this.app);
    this.gridRenderSystem.setApp(this.app);
    this.treeSystem.setApp(this.app);
    this.zIndexSystem.setApp(this.app);
    this.coinSystem.setApp(this.app);
    this.uiRenderSystem.setApp(this.app);
    this.particleSystem.setApp(this.app);
    this.speedBoostSystem.setApp(this.app);
    this.vignetteSystem.setApp(this.app);

    // Then set up the world references
    this.treeSystem.setWorld(this.world);
    this.coinSystem.setWorld(this.world);
    this.coinCounterSystem.setWorld(this.world);
    this.particleSystem.setWorld(this.world);
    this.speedBoostSystem.setWorld(this.world);
    this.vignetteSystem.setWorld(this.world);

    // Finally add systems to the world
    this.world.addSystem(this.gridRenderSystem);
    this.world.addSystem(this.movementSystem);
    this.world.addSystem(this.inputSystem);
    this.world.addSystem(this.treeSystem);
    this.world.addSystem(this.zIndexSystem);
    this.world.addSystem(this.coinSystem);
    this.world.addSystem(this.uiRenderSystem);
    this.world.addSystem(this.coinCounterSystem);
    this.world.addSystem(this.particleSystem);
    this.world.addSystem(this.speedBoostSystem);
    this.world.addSystem(this.vignetteSystem);

    // Reinitialize all systems
    this.movementSystem.reinitialize();
    this.inputSystem.reinitialize();
    this.gridRenderSystem.reinitialize();
    this.treeSystem.reinitialize();
    this.zIndexSystem.reinitialize();
    this.coinSystem.reinitialize();
    this.uiRenderSystem.reinitialize();
    this.coinCounterSystem.reinitialize();
    this.particleSystem.reinitialize();
    this.speedBoostSystem.reinitialize();
    this.vignetteSystem.reinitialize();

    // Set up event listeners
    this.world.on('gameOver', () => {
      setTimeout(() => {
        this.restart();
      }, 1000);
    });

    // Create initial entities
    this.createCharacter();
    this.createCoinCounter();

    // Start the game
    this.world.setGameState(GameState.Starting);
  }

  public async start(): Promise<void> {
    // Clean up any existing app instance
    if (this.app) {
      this.app.destroy(true);
    }

    // Calculate target resolution (720p)
    const targetWidth = 1280;
    const targetHeight = 720;

    // Calculate scale to fit the window while maintaining aspect ratio
    const scale = Math.min(
      window.innerWidth / targetWidth,
      window.innerHeight / targetHeight
    );

    // Calculate actual dimensions
    const width = Math.floor(targetWidth * scale);
    const height = Math.floor(targetHeight * scale);

    this.app = new Application();
    await this.app.init({
      width,
      height,
      backgroundColor: 0xffffff, // Sky blue background
      resolution: Math.min(window.devicePixelRatio || 1, 2), // Cap resolution at 2x
      autoDensity: true, // Enable auto density for crisp rendering
      resizeTo: window, // Make canvas resize to window
    });

    // Remove any existing canvas
    const existingCanvas = document.querySelector('canvas');
    if (existingCanvas) {
      existingCanvas.remove();
    }

    document.body.appendChild(this.app.canvas);

    // Load assets first
    await Assets.load([
      'character.png',
      'tree.png',
      'coin.png',
      'vignette.png',
      'vignette2.png',
      'vignette3.png'
    ]);
    
    // Reset stage position to center
    this.app.stage.position.set(
      this.app.screen.width / 2,
      this.app.screen.height / 2
    );

    // Initialize systems and start the game
    await this.initializeSystems();

    // Start the game loop
    this.app.ticker.add(this.gameLoop);

    // Add window resize handler
    window.addEventListener('resize', () => {
      const newScale = Math.min(
        window.innerWidth / targetWidth,
        window.innerHeight / targetHeight
      );
      const newWidth = Math.floor(targetWidth * newScale);
      const newHeight = Math.floor(targetHeight * newScale);
      
      this.app.renderer.resize(newWidth, newHeight);
      this.app.stage.position.set(
        this.app.screen.width / 2,
        this.app.screen.height / 2
      );
    });
  }

  private async createCharacter(): Promise<void> {
    // Remove old character if it exists
    if (this.character) {
      const visual = this.character.getComponent<VisualComponent>(VisualComponentType);
      if (visual && visual.container.parent) {
        visual.container.parent.removeChild(visual.container);
      }
      this.world.removeEntity(this.character);
    }

    // Create new character
    this.character = new BaseEntity();
    
    // Calculate initial world position from grid position (0,0)
    const initialGridPos = { x: 0, y: 0 };
    const worldPos = this.gridToWorld(initialGridPos.x, initialGridPos.y);
    const gridPos = new GridPositionComponent(initialGridPos.x, initialGridPos.y);

    // Set transform to the world position
    const transform = new TransformComponent(worldPos.x, worldPos.y);
    const visual = new VisualComponent({ spritePath: 'character.png' });
    const movement = new IsometricMovementComponent(150);
    movement.targetDirection = Direction.DownRight; // Start moving down-right
    const zIndex = new ZIndexComponent(Z_INDEX.CHARACTER);
    const player = new PlayerComponent();
    const particle = new ParticleComponent();
    const speedBoost = new SpeedBoostComponent();

    this.character.addComponent(gridPos);
    this.character.addComponent(transform);
    this.character.addComponent(visual);
    this.character.addComponent(movement);
    this.character.addComponent(zIndex);
    this.character.addComponent(player);
    this.character.addComponent(particle);
    this.character.addComponent(speedBoost);
    this.world.addEntity(this.character);

    // Add the visual to the world container
    const movementSystem = this.world.getSystem<MovementSystem>(MovementSystem);
    if (movementSystem && movementSystem.worldContainer) {
      movementSystem.worldContainer.addChild(visual.container);
    }
    
    // Set the visual position to match the transform
    visual.container.position.set(worldPos.x, worldPos.y);
  }

  private createCoinCounter(): void {
    // Remove old counter if it exists
    if (this.coinCounter) {
      const ui = this.coinCounter.getComponent<UIComponent>(UIComponentType);
      if (ui && ui.container.parent) {
        ui.container.parent.removeChild(ui.container);
      }
      this.world.removeEntity(this.coinCounter);
    }

    // Create new counter
    this.coinCounter = new BaseEntity();
    
    const counter = new CoinCounterComponent();
    const ui = new UIComponent({
      text: 'Coins: 0',
      style: {
        fontSize: 32,
        fill: 0xFFD700, // Gold color
        stroke: {
          color: 0x000000,
          width: 4
        }
      }
    });

    this.coinCounter.addComponent(counter);
    this.coinCounter.addComponent(ui);
    this.world.addEntity(this.coinCounter);

    // Position at top center of screen, accounting for centered stage
    if (this.app) {
      // Since stage is centered at (0,0), we need to position relative to that
      ui.setPosition(0, -this.app.screen.height / 2 + 40);
    }
  }

  private gridToWorld(gridX: number, gridY: number): { x: number, y: number } {
    const isoX = (gridX - gridY) * (this.TILE_WIDTH / 2);
    const isoY = (gridX + gridY) * (this.TILE_HEIGHT / 2);
    return { x: isoX, y: isoY };
  }

  public async restart(): Promise<void> {
    console.log('[Game] Starting game restart');

    // Cleanup current world
    this.world.cleanup();

    // Clear the stage
    while (this.app.stage.children.length > 0) {
      const child = this.app.stage.children[0];
      child.destroy();
      this.app.stage.removeChild(child);
    }

    // Reset stage position
    this.app.stage.position.set(
      this.app.screen.width / 2,
      this.app.screen.height / 2
    );

    // Initialize systems and start the game
    await this.initializeSystems();
  }

  private gameLoop(): void {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.world.update(deltaTime);
  }

  public get pixiApp(): Application {
    return this.app;
  }
} 