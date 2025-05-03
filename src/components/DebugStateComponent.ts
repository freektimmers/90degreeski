import { Component, Entity } from '../core/Component';

export const DebugStateComponentType = Symbol('DebugStateComponent');

export interface SystemStats {
  name: string;
  entities: number;
  executionTime?: number;
  peakExecutionTime?: number;
  poolSize?: number;
  activePoolItems?: number;
  totalCoinsCollected?: number;
}

export class DebugStateComponent implements Component {
  public readonly type = DebugStateComponentType;
  public entity: Entity | null = null;
  
  // Container and state
  public container: HTMLDivElement | null = null;
  public stats: Map<string, SystemStats> = new Map();
  public frameCount: number = 0;
  public fps: number = 0;
  public lastFpsUpdate: number = performance.now();
  private isCollapsed: boolean;
  
  // Configuration
  public readonly FPS_UPDATE_INTERVAL = 1000; // Update FPS every second
  public static readonly DEFAULT_START_COLLAPSED = true;

  constructor(startCollapsed: boolean = DebugStateComponent.DEFAULT_START_COLLAPSED) {
    this.isCollapsed = startCollapsed;
    this.createOverlay();
    // Add keyboard listener for F3 key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        this.isCollapsed = !this.isCollapsed;
        this.updateDisplay();
      }
    });
  }

  public createOverlay(): void {
    // Remove existing overlay if it exists
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.top = '10px';
    this.container.style.right = '10px';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.container.style.color = 'white';
    this.container.style.padding = '10px';
    this.container.style.fontFamily = 'monospace';
    this.container.style.fontSize = '12px';
    this.container.style.borderRadius = '5px';
    this.container.style.zIndex = '1000';
    document.body.appendChild(this.container);

    // Clear stats when creating new overlay
    this.stats.clear();
    this.frameCount = 0;
    this.fps = 0;
    this.lastFpsUpdate = performance.now();
  }

  public updateStats(systemName: string, stats: Partial<SystemStats>): void {
    // Create overlay if it doesn't exist
    if (!this.container) {
      this.createOverlay();
    }

    const currentStats = this.stats.get(systemName) || { name: systemName, entities: 0 };
    
    // Update peak execution time if current time is higher
    if (stats.executionTime !== undefined) {
      const peak = Math.max(stats.executionTime, currentStats.peakExecutionTime || 0);
      stats = { ...stats, peakExecutionTime: peak };
    }
    
    this.stats.set(systemName, { ...currentStats, ...stats });
    this.updateDisplay();
  }

  public updateFps(): void {
    this.frameCount++;
    
    const currentTime = performance.now();
    
    // Update FPS every second
    if (currentTime - this.lastFpsUpdate >= this.FPS_UPDATE_INTERVAL) {
      this.fps = (this.frameCount * 1000) / (currentTime - this.lastFpsUpdate);
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
      this.updateDisplay();
    }
  }

  private updateDisplay(): void {
    if (!this.container) {
      this.createOverlay();
      return;
    }

    let html = '<div style="font-weight: bold; margin-bottom: 5px;">Debug Stats (F3)</div>';
    
    // Add FPS at the top
    html += '<div style="border-bottom: 1px solid rgba(255,255,255,0.2); padding: 2px 0; color: #00ff00;">';
    html += `FPS: ${Math.round(this.fps)}`;
    html += '</div>';

    // Only show detailed stats if not collapsed
    if (!this.isCollapsed) {
      html += '<div style="display: grid; grid-template-columns: auto auto; gap: 5px;">';

      // Convert stats map to array and sort by peak execution time
      const sortedStats = Array.from(this.stats.entries())
        .sort((a, b) => {
          const peakA = a[1].peakExecutionTime || 0;
          const peakB = b[1].peakExecutionTime || 0;
          return peakB - peakA; // Sort in descending order
        });

      for (const [name, stats] of sortedStats) {
        html += `<div style="border-bottom: 1px solid rgba(255,255,255,0.2); padding: 2px 0;">${name}:</div>`;
        html += '<div style="border-bottom: 1px solid rgba(255,255,255,0.2); padding: 2px 0;">';
        html += `Entities: ${stats.entities}`;
        if (stats.executionTime !== undefined) {
          const color = stats.executionTime > 16 ? '#ff6b6b' : '#ffffff';
          html += `<br><span style="color: ${color}">Time: ${stats.executionTime.toFixed(2)}ms`;
          if (stats.peakExecutionTime !== undefined) {
            html += ` (peak: ${stats.peakExecutionTime.toFixed(2)}ms)</span>`;
          }
        }
        if (stats.poolSize !== undefined) {
          html += `<br>Pool: ${stats.activePoolItems}/${stats.poolSize}`;
        }
        if (stats.totalCoinsCollected !== undefined) {
          html += `<br>Coins: ${stats.totalCoinsCollected}`;
        }
        html += '</div>';
      }

      html += '</div>';
    }

    this.container.innerHTML = html;
  }

  public destroy(): void {
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
      this.container = null;
    }
    this.stats.clear();
    this.frameCount = 0;
    this.fps = 0;
  }
} 