import { injectable } from 'inversify';
import { Direction } from '../components/IsometricMovementComponent';

@injectable()
export class GridService {
    private readonly TILE_WIDTH = 128;
    private readonly TILE_HEIGHT = 64;

    /**
     * Converts grid coordinates to world (screen) coordinates
     */
    gridToWorld(gridX: number, gridY: number): { x: number, y: number } {
        const worldX = (gridX - gridY) * (this.TILE_WIDTH / 2);
        const worldY = (gridX + gridY) * (this.TILE_HEIGHT / 2);
        return { x: worldX, y: worldY };
    }

    /**
     * Converts world coordinates to grid coordinates
     */
    worldToGrid(worldX: number, worldY: number): { x: number, y: number } {
        // Using the inverse of the isometric projection
        const gridX = (worldX / this.TILE_WIDTH + worldY / this.TILE_HEIGHT);
        const gridY = (worldY / this.TILE_HEIGHT - worldX / this.TILE_WIDTH);
        return { 
            x: Math.round(gridX), 
            y: Math.round(gridY) 
        };
    }

    /**
     * Get the dimensions of a tile
     */
    getTileDimensions(): { width: number, height: number } {
        return {
            width: this.TILE_WIDTH,
            height: this.TILE_HEIGHT
        };
    }

    /**
     * Get the next grid position based on direction
     */
    getNextGridPosition(currentX: number, currentY: number, direction: Direction): { x: number, y: number } {
        switch (direction) {
            case Direction.DownRight:
                return { x: currentX + 1, y: currentY };
            case Direction.DownLeft:
                return { x: currentX, y: currentY + 1 };
            case Direction.TopRight:
                return { x: currentX, y: currentY - 1 };
            case Direction.TopLeft:
                return { x: currentX - 1, y: currentY };
            default:
                return { x: currentX, y: currentY };
        }
    }

    /**
     * Check if a grid position is valid
     */
    isValidGridPosition(x: number, y: number): boolean {
        // Add any grid boundary checks here if needed
        return true;
    }
} 