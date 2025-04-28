import { Component } from '../core/Component';
import { Container, Text, TextStyle, TextStyleAlign } from 'pixi.js';
import { Entity } from '../core/Component';

export const UIComponentType = Symbol('UIComponent');

export interface UIConfig {
  text?: string;
  x?: number;
  y?: number;
  style?: Partial<TextStyle>;
  align?: TextStyleAlign;
}

export class UIComponent implements Component {
  public readonly type = UIComponentType;
  public container: Container;
  public text: Text;
  public entity: Entity | null = null;

  constructor(config: UIConfig = {}) {
    this.container = new Container();
    
    // Create text with default style
    const style: Partial<TextStyle> = {
      fontFamily: 'Arial',
      fontSize: 24,
      fill: 0xFFFFFF,
      stroke: {
        color: 0x000000,
        width: 4
      },
      align: 'center',
      ...config.style
    };

    // Use new Text constructor syntax for PixiJS v8
    this.text = new Text({
      text: config.text || '',
      style
    });
    this.container.addChild(this.text);

    // Set position if provided
    if (config.x !== undefined) this.container.x = config.x;
    if (config.y !== undefined) this.container.y = config.y;

    // Center the text within its container
    this.text.anchor.set(0.5);
  }

  public setText(text: string): void {
    this.text.text = text;
  }

  public setPosition(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
  }
} 