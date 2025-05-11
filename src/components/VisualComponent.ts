import { Graphics, Container, Sprite, Texture, Assets } from 'pixi.js';
import { Component, Entity } from '../core/Component';

export const VisualComponentType = Symbol('VisualComponent');

export class VisualComponent implements Component {
  public readonly type = VisualComponentType;
  public entity: Entity | null = null;
  public container: Container;
  public sprite: Sprite | null = null;
  public graphics: Graphics | null = null;

  constructor(options: { radius?: number; color?: number; spritePath?: string } = {}) {
    this.container = new Container();
    let YOffset = - 32;
    
    if (options.spritePath) {
      this.loadSprite(options.spritePath, YOffset);
    } else {
      this.graphics = new Graphics()
        .circle(0, 0, options.radius || 5)
        .fill({ color: options.color || 0xFF0000 });
      this.container.addChild(this.graphics);
    }
  }

  private async loadSprite(spritePath: string, YOffset: number): Promise<void> {
    try {
      await Assets.load(spritePath);
      const texture = Assets.get(spritePath);
      this.sprite = new Sprite(texture);
      this.sprite.anchor.set(0.5);
      
      // Set size to 128x128 (doubled from 64x64)
      const targetSize = 128;
      const scale = targetSize / Math.max(this.sprite.width, this.sprite.height);
      this.sprite.scale.set(scale);
      
      // Start facing right (for DownRight movement)
      this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
      this.sprite.y += YOffset;
      
      this.container.addChild(this.sprite);
    } catch (error) {
      console.warn(`[VisualComponent] Failed to load sprite: ${spritePath}`, error);
      // Fallback to a red circle if sprite loading fails
      this.graphics = new Graphics()
        .circle(0, 0, 5)
        .fill({ color: 0xFF0000 });
      this.container.addChild(this.graphics);
    }
  }

  public flipX(): void {
    if (this.sprite) {
      this.sprite.scale.x = -this.sprite.scale.x;
    }
  }
} 