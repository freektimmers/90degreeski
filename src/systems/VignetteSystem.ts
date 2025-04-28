import { injectable, inject } from 'inversify';
import { BaseSystem } from '../core/System';
import { Application, Sprite, Assets } from 'pixi.js';
import { GridService } from '../services/GridService';
import { World, GameState } from '../core/World';
import { ZIndexComponent } from '../components/ZIndexComponent';

@injectable()
export class VignetteSystem extends BaseSystem {
  private vignetteSprite: Sprite | null = null;
  readonly requiredComponents: symbol[] = []; // No required components for this system

  constructor(
    @inject(GridService) private gridService: GridService
  ) {
    super();
  }

  public setApp(app: Application): void {
    this.app = app;
    this.initializeVignette();
  }

  public setWorld(world: World): void {
    this.world = world;
  }

  protected onGameStateChanged(oldState: GameState, newState: GameState): void {
    if (newState === GameState.Starting || newState === GameState.Playing) {
      this.initializeVignette();
      this.updateVignetteScale();
    }
  }

  private initializeVignette(): void {
    if (!this.app || !this.world) {
      console.log('[VignetteSystem] Waiting for app and world to be ready');
      return;
    }

    console.log('[VignetteSystem] Initializing vignette');
    
    // Remove old vignette if it exists
    if (this.vignetteSprite && this.vignetteSprite.parent) {
      this.vignetteSprite.parent.removeChild(this.vignetteSprite);
    }
    
    // Create vignette sprite
    const texture = Assets.get('/vignette3.png');
    this.vignetteSprite = new Sprite(texture);
    
    // Center the sprite
    this.vignetteSprite.anchor.set(0.5);
    
    // Set z-index
    this.vignetteSprite.zIndex = ZIndexComponent.UI.VIGNETTE;
    
    // Make it invisible until properly scaled
    this.vignetteSprite.visible = false;
    
    // Add to stage
    this.app.stage.addChild(this.vignetteSprite);
    console.log('[VignetteSystem] Added vignette to stage');
  }

  private updateVignetteScale(): void {
    if (!this.app || !this.vignetteSprite || !this.world) return;

    // Calculate visible area based on grid dimensions
    const { width: tileWidth, height: tileHeight } = this.gridService.getTileDimensions();
    const visibleRadius = 10; // Match GridRenderSystem's visible radius
    
    // Calculate the actual visible area in world coordinates
    const visibleWidth = tileWidth * visibleRadius * 2;
    const visibleHeight = tileHeight * visibleRadius * 2;
    
    // Scale to match the visible grid area exactly
    const scale = Math.max(visibleWidth, visibleHeight) / 512;
    
    this.vignetteSprite.scale.set(scale);
    this.vignetteSprite.visible = true;
  }

  protected updateRelevantEntities(entities: any[], deltaTime: number): void {
    // Update scale whenever we have a vignette and the world is ready
    if (this.vignetteSprite && this.world && this.app && this.gridService) {
      this.updateVignetteScale();
    }
  }
} 