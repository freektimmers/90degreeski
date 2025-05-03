import { Component, Entity } from '../core/Component';

export class NeedsObjectRecyclingComponent implements Component {
    static readonly type: symbol = Symbol('NeedsObjectRecycling');
    readonly type = NeedsObjectRecyclingComponent.type;
    entity: Entity | null = null;

    // Store the grid position that needs recycling
    gridX: number = 0;
    gridY: number = 0;
}

export const NeedsObjectRecyclingComponentType = NeedsObjectRecyclingComponent.type; 