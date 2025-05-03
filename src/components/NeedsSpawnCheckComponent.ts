import { Component, Entity } from '../core/Component';

export class NeedsSpawnCheckComponent implements Component {
    static readonly type: symbol = Symbol('NeedsSpawnCheck');
    readonly type = NeedsSpawnCheckComponent.type;
    entity: Entity | null = null;
}

export const NeedsSpawnCheckComponentType = NeedsSpawnCheckComponent.type; 