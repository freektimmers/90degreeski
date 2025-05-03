import { injectable } from 'inversify';
import { Container } from 'pixi.js';
import { Direction } from '../components/IsometricMovementComponent';

@injectable()
export class GridService {
    // Centralized constants
    public readonly TILE_WIDTH = 128;
    public readonly TILE_HEIGHT = 64;
    public readonly MOVEMENT_SPEED = 250; // pixels per second
    public readonly GRID_ARRIVAL_THRESHOLD = 2;
    
    // Isometric direction vectors (normalized for grid movement)
    private readonly DIRECTION_VECTORS = {
        [Direction.DownRight]: { x: 1, y: 0 },    // Move one tile right (appears diagonal in isometric)
        [Direction.DownLeft]: { x: 0, y: 1 },     // Move one tile down (appears diagonal in isometric)
        [Direction.TopRight]: { x: 0, y: -1 },    // Move one tile up (appears diagonal in isometric)
        [Direction.TopLeft]: { x: -1, y: 0 },     // Move one tile left (appears diagonal in isometric)
        [Direction.None]: { x: 0, y: 0 }
    };

    /**
     * Get the dimensions of a tile
     */
    public getTileDimensions(): { width: number, height: number } {
        return {
            width: this.TILE_WIDTH,
            height: this.TILE_HEIGHT
        };
    }

    /**
     * Converts grid coordinates to world (screen) coordinates
     */
    public gridToWorld(gridX: number, gridY: number): { x: number, y: number } {
        // Convert grid coordinates to isometric world coordinates
        const worldX = (gridX - gridY) * (this.TILE_WIDTH / 2);
        const worldY = (gridX + gridY) * (this.TILE_HEIGHT / 2);
        return { x: worldX, y: worldY };
    }

    /**
     * Converts world coordinates to grid coordinates
     */
    public worldToGrid(worldX: number, worldY: number): { x: number, y: number } {
        // Convert isometric world coordinates back to grid coordinates
        const gridX = (worldX / this.TILE_WIDTH + worldY / this.TILE_HEIGHT);
        const gridY = (-worldX / this.TILE_WIDTH + worldY / this.TILE_HEIGHT);
        return { x: gridX, y: gridY };
    }

    /**
     * Converts world coordinates to screen coordinates considering camera position
     */
    public worldToScreenSpace(worldX: number, worldY: number, worldContainer: Container): { x: number, y: number } {
        return {
            x: worldX + worldContainer.position.x,
            y: worldY + worldContainer.position.y
        };
    }

    /**
     * Converts screen coordinates to world coordinates considering camera position
     */
    public screenToWorldSpace(screenX: number, screenY: number, worldContainer: Container): { x: number, y: number } {
        return {
            x: screenX - worldContainer.position.x,
            y: screenY - worldContainer.position.y
        };
    }

    /**
     * Gets the movement vector for a given direction
     */
    public getDirectionVector(direction: Direction): { x: number, y: number } {
        return this.DIRECTION_VECTORS[direction] || this.DIRECTION_VECTORS[Direction.None];
    }

    /**
     * Calculates the next grid position based on current position and direction
     */
    public getNextGridPosition(currentX: number, currentY: number, direction: Direction): { x: number, y: number } {
        const vector = this.getDirectionVector(direction);
        return {
            x: currentX + vector.x,
            y: currentY + vector.y
        };
    }

    /**
     * Checks if a grid position is valid (within bounds)
     */
    public isValidGridPosition(x: number, y: number): boolean {
        // Add your grid boundary logic here
        // For now, allowing all positions
        return true;
    }

    /**
     * Calculates the distance between two grid positions
     */
    public getGridDistance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    /**
     * Rounds world coordinates to nearest grid position
     */
    public snapToGrid(worldX: number, worldY: number): { x: number, y: number } {
        const gridPos = this.worldToGrid(worldX, worldY);
        return this.gridToWorld(Math.round(gridPos.x), Math.round(gridPos.y));
    }
} 