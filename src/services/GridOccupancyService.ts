import { injectable } from 'inversify';

export enum OccupancyType {
  Tree = 'tree',
  Coin = 'coin',
  Character = 'character'
}

@injectable()
export class GridOccupancyService {
  private occupiedCells: Map<string, Set<OccupancyType>> = new Map();

  private getKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  public isOccupied(x: number, y: number, type?: OccupancyType): boolean {
    const key = this.getKey(x, y);
    const cell = this.occupiedCells.get(key);
    
    if (!cell) return false;
    if (!type) return cell.size > 0;
    return cell.has(type);
  }

  public occupy(x: number, y: number, type: OccupancyType): void {
    const key = this.getKey(x, y);
    if (!this.occupiedCells.has(key)) {
      this.occupiedCells.set(key, new Set());
    }
    const cell = this.occupiedCells.get(key)!;
    if (cell.has(type)) {
      return;
    }
    cell.add(type);
  }

  public free(x: number, y: number, type: OccupancyType): void {
    const key = this.getKey(x, y);
    const cell = this.occupiedCells.get(key);
    if (cell) {
      if (!cell.has(type)) {
        return;
      }
      cell.delete(type);
      if (cell.size === 0) {
        this.occupiedCells.delete(key);
      }
    } else {
      console.warn(`[GridOccupancyService] Attempting to free non-existent cell at ${x},${y} with type ${type}`);
    }
  }

  public reset(): void {
    this.occupiedCells.clear();
  }

  public getOccupancyTypes(x: number, y: number): Set<OccupancyType> | undefined {
    const key = this.getKey(x, y);
    return this.occupiedCells.get(key);
  }
} 