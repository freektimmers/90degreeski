import { injectable, inject } from 'inversify';
import { Application, Assets } from 'pixi.js';
import { World } from './World';
import { MovementSystem } from '../systems/MovementSystem';
import { InputSystem } from '../systems/InputSystem';
import { GridRenderSystem } from '../systems/GridRenderSystem';
import { ZIndexSystem } from '../systems/ZIndexSystem';
import { BaseEntity } from './BaseEntity';
import { TransformComponent } from '../components/TransformComponent';
import { VisualComponent, VisualComponentType } from '../components/VisualComponent';
import { IsometricMovementComponent, Direction } from '../components/IsometricMovementComponent';
import { GridPositionComponent } from '../components/GridPositionComponent';
import { ZIndexComponent } from '../components/ZIndexComponent';
import { PlayerComponent } from '../components/PlayerComponent';
import { CoinCounterSystem } from '../systems/CoinCounterSystem';
import { UIComponent, UIComponentType } from '../components/UIComponent';
import { CoinCounterComponent } from '../components/CoinCounterComponent';
import { ParticleSystem } from '../systems/ParticleSystem';
import { ParticleComponent } from '../components/ParticleComponent';
import { SpeedBoostComponent } from '../components/SpeedBoostComponent';
// import { DebugOverlaySystem } from '../systems/DebugOverlaySystem';
import { GridOccupancyComponent, OccupancyType } from '../components/GridOccupancyComponent';
import { GridOccupancySystem } from '../systems/GridOccupancySystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { CoinCollisionSystem } from '../systems/CoinCollisionSystem';
import { TreeCollisionSystem } from '../systems/TreeCollisionSystem';
import { GridObjectSpawnerSystem } from '../systems/GridObjectSpawnerSystem';
import { GridService } from '@/services/GridService';
import { GameState } from '../components/GameStateComponent';
import { VignetteUISystem } from '../systems/VignetteUISystem';
import { VignetteUIComponent } from '../components/VignetteUIComponent';
import { ObjectRecyclingSystem } from '../systems/ObjectRecyclingSystem';
import { getAssetPath } from '@/utils/assetPath';

@injectable()
export class Game {
  private app!: Application;
  private world: World;
  private lastTime: number = 0;
  private character: BaseEntity | null = null;
  private coinCounter: BaseEntity | null = null;
  private vignette: BaseEntity | null = null;
  private isRunning: boolean = false;

  constructor(
    @inject(World) world: World,
    @inject(MovementSystem) private movementSystem: MovementSystem,
    @inject(InputSystem) private inputSystem: InputSystem,
    @inject(GridRenderSystem) private gridRenderSystem: GridRenderSystem,
    @inject(ZIndexSystem) private zIndexSystem: ZIndexSystem,
    @inject(CoinCounterSystem) private coinCounterSystem: CoinCounterSystem,
    @inject(ParticleSystem) private particleSystem: ParticleSystem,
    // @inject(DebugOverlaySystem) private debugOverlaySystem: DebugOverlaySystem,
    @inject(GridOccupancySystem) private gridOccupancySystem: GridOccupancySystem,
    @inject(CollisionSystem) private collisionSystem: CollisionSystem,
    @inject(CoinCollisionSystem) private coinCollisionSystem: CoinCollisionSystem,
    @inject(TreeCollisionSystem) private treeCollisionSystem: TreeCollisionSystem,
    @inject(GridObjectSpawnerSystem) private gridObjectSpawnerSystem: GridObjectSpawnerSystem,
    @inject(GridService) private gridService: GridService,
    @inject(VignetteUISystem) private vignetteUISystem: VignetteUISystem,
    @inject(ObjectRecyclingSystem) private objectRecyclingSystem: ObjectRecyclingSystem,
  ) {
    this.world = world;
    this.gameLoop = this.gameLoop.bind(this);

    // Listen for game state changes
    this.world.on('gameStateChanged', ({ newState }) => {
      if (newState === GameState.GameOver) {
        setTimeout(() => {
          this.restart();
        }, 1000);
      }
    });

    // Listen for character creation events
    this.world.on('createCharacter', () => {
      this.createCharacter();
    });
  }

  private setupStage(): void {
    // Center the stage
    this.app.stage.position.set(this.app.screen.width / 2, this.app.screen.height / 2);

    // Get world container and add to stage
    const worldContainer = this.world.getWorldContainer();
    if (worldContainer) {
      this.app.stage.addChild(worldContainer.container);
      worldContainer.container.position.set(0, 0);
    }

    // Get UI container and add to stage
    const uiContainer = this.world.getUIContainer();
    if (uiContainer) {
      this.app.stage.addChild(uiContainer.container);
      uiContainer.container.position.set(0, 0);
    }
  }

  public async initialize(): Promise<void> {
    console.log('[Game] Initializing game...');
    // Initialize PIXI Application
    this.app = new Application();
    await this.app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0xffffff,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });

    document.body.appendChild(this.app.canvas);

    // Load all required assets first
    console.log('[Game] Loading assets...');
    try {
        const assets = [
          getAssetPath('character.png'),
          getAssetPath('tree.png'),
          getAssetPath('coin.png'),
          getAssetPath('vignette3.png')
        ];
        console.log('[Game] Loading assets:', assets);
        await Assets.load(assets);
        
        
        console.log('[Game] Assets loaded successfully');
    } catch (error) {
        console.error('[Game] Failed to load assets:', error);
        throw error;
    }

    // Setup stage with WorldContainerComponent
    this.setupStage();

    console.log('[Game] Setting up systems...');
    // Set up systems with PIXI app
    this.movementSystem.setApp(this.app);
    this.inputSystem.setApp(this.app);
    this.gridRenderSystem.setApp(this.app);
    this.zIndexSystem.setApp(this.app);
    this.coinCounterSystem.setApp(this.app);
    this.particleSystem.setApp(this.app);
    // this.debugOverlaySystem.setApp(this.app);
    this.gridOccupancySystem.setApp(this.app);
    this.collisionSystem.setApp(this.app);
    this.coinCollisionSystem.setApp(this.app);
    this.treeCollisionSystem.setApp(this.app);
    this.gridObjectSpawnerSystem.setApp(this.app);
    this.objectRecyclingSystem.setApp(this.app);
    this.vignetteUISystem.setApp(this.app);

    console.log('[Game] Adding systems to world...');
    // Add systems to world in correct order
    this.world.addSystem(this.movementSystem);
    this.world.addSystem(this.inputSystem);
    this.world.addSystem(this.gridRenderSystem);
    this.world.addSystem(this.zIndexSystem);
    this.world.addSystem(this.coinCounterSystem);
    this.world.addSystem(this.particleSystem);
    // this.world.addSystem(this.debugOverlaySystem);
    this.world.addSystem(this.gridOccupancySystem);
    this.world.addSystem(this.collisionSystem);
    this.world.addSystem(this.coinCollisionSystem);
    this.world.addSystem(this.treeCollisionSystem);
    this.world.addSystem(this.gridObjectSpawnerSystem);
    this.world.addSystem(this.objectRecyclingSystem);
    this.world.addSystem(this.vignetteUISystem);

    console.log('[Game] Creating game entities...');
    // Create game-specific entities
    await this.createCharacter();
    this.createCoinCounter();
    this.createVignette();

    // Set initial game state
    const gameState = this.world.getGameState();
    if (gameState) {
        console.log('[Game] Setting initial game state to Starting');
        gameState.currentState = GameState.Starting;
    }
    
    console.log('[Game] Initialization complete');
  }

  public start(): void {
    if (this.isRunning) return;
    console.log('[Game] Starting game loop');
    this.isRunning = true;
    this.lastTime = performance.now();
    this.app.ticker.add(this.gameLoop);

    // Set game state to Playing through the GameStateComponent
    const gameState = this.world.getGameState();
    if (gameState) {
      console.log('[Game] Setting game state to Playing');
      gameState.currentState = GameState.Playing;
    } else {
      console.error('[Game] Failed to get game state component');
    }

    // Add window resize handler
    window.addEventListener('resize', () => {
      console.log('[Game] Handling window resize');
      // Update renderer size
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
      
      // Re-center the stage and update world container
      this.setupStage();
    });
  }

  private async createCharacter(): Promise<void> {
    console.log('[Game] Creating character entity');
    // Remove old character if it exists
    if (this.character) {
      console.log('[Game] Removing old character entity');
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
    const worldPos = this.gridService.gridToWorld(initialGridPos.x, initialGridPos.y);

    const gridPos = new GridPositionComponent(initialGridPos.x, initialGridPos.y);

    // Set transform to the world position
    const transform = new TransformComponent(worldPos.x, worldPos.y);
    const visual = new VisualComponent({ spritePath: 'character.png' });
    const movement = new IsometricMovementComponent(150);
    
    // Set initial movement direction and target
    movement.currentDirection = Direction.DownRight;
    movement.targetDirection = Direction.DownRight;
    
    // Set initial grid target position
    const nextPos = { x: initialGridPos.x + 1, y: initialGridPos.y + 1 };
    gridPos.setTargetPosition(nextPos.x, nextPos.y);

    const zIndex = new ZIndexComponent();
    const player = new PlayerComponent();
    // const particle = new ParticleComponent();
    const speedBoost = new SpeedBoostComponent();
    const gridOccupancy = new GridOccupancyComponent(OccupancyType.Character);

    this.character.addComponent(gridPos);
    this.character.addComponent(transform);
    this.character.addComponent(visual);
    this.character.addComponent(movement);
    this.character.addComponent(zIndex);
    this.character.addComponent(player);
    // this.character.addComponent(particle);
    this.character.addComponent(speedBoost);
    this.character.addComponent(gridOccupancy);
    this.world.addEntity(this.character);

    // Add the visual to the world container
    const worldContainer = this.world.getWorldContainer();
    if (worldContainer) {
      worldContainer.container.addChild(visual.container);
    }
    
    // Set the visual position to match the transform
    visual.container.position.set(worldPos.x, worldPos.y);
  }

  private createCoinCounter(): void {
    console.log('[Game] Creating coin counter entity');
    // Remove old counter if it exists
    if (this.coinCounter) {
      console.log('[Game] Removing old coin counter entity');
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
          width: 2
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
      
      // Add the UI component to the UI container
      const uiContainer = this.world.getUIContainer();
      if (uiContainer) {
        uiContainer.container.addChild(ui.container);
      }
    }
  }

  private createVignette(): void {
    console.log('[Game] Creating vignette entity');
    // Remove old vignette if it exists
    if (this.vignette) {
      console.log('[Game] Removing old vignette entity');
      this.world.removeEntity(this.vignette);
    }

    // Create new vignette
    this.vignette = new BaseEntity();
    const vignetteComponent = new VignetteUIComponent();
    this.vignette.addComponent(vignetteComponent);
    this.world.addEntity(this.vignette);
  }

  public async restart(): Promise<void> {
    console.log('[Game] Starting game restart');

    // Stop the game loop
    this.stop();

    window.location.reload();
    return;

  }

  private gameLoop(): void {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    const gameState = this.world.getGameState();
    if (gameState) {
      const state = gameState.currentState;
      if (state === GameState.Playing) {
        this.world.update(deltaTime);
      }
    }
  }

  public get pixiApp(): Application {
    return this.app;
  }

  public stop(): void {
    if (!this.isRunning) return;
    console.log('[Game] Stopping game loop');
    this.isRunning = false;
    this.app.ticker.remove(this.gameLoop);
  }

  public cleanup(): void {
    console.log('[Game] Starting cleanup');
    this.stop();
    this.world.cleanup();
    this.app.destroy(true, { children: true });
    console.log('[Game] Cleanup complete');
  }

  public resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }
} 