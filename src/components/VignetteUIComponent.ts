import { Component, Entity } from '../core/Component';
import { Container, Sprite, Assets } from 'pixi.js';

export const VignetteUIComponentType = Symbol('VignetteUIComponent');

export class VignetteUIComponent implements Component {
  public readonly type = VignetteUIComponentType;
  public entity: Entity | null = null;
  public container: Container;
  public sprite: Sprite | null = null;

  constructor() {
    this.container = new Container();
    
    // Load the vignette sprite
    try {
      const texture = Assets.get('/vignette3.png');
      this.sprite = new Sprite(texture);
      
      // Center the sprite's anchor point
      this.sprite.anchor.set(0.5);
      
      // Add some transparency to make it subtle
      this.sprite.alpha = 1;
      
      // Add to container
      this.container.addChild(this.sprite);
      
      // Set high z-index to ensure it's rendered on top
      this.container.zIndex = 19000; // Just below coin counter
    } catch (error) {
      console.warn('[VignetteUIComponent] Failed to load vignette sprite', error);
    }
  }

  public destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    if (this.container) {
      this.container.destroy({ children: true });
    }
  }
} 