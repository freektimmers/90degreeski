import { Component, Entity } from '../core/Component';

export class TreeCollisionImminentComponent implements Component {
    static readonly type: symbol = Symbol('TreeCollisionImminent');
    readonly type = TreeCollisionImminentComponent.type;
    entity: Entity | null = null;
}

export const TreeCollisionImminentComponentType = TreeCollisionImminentComponent.type; 