import { Component, Entity } from '../core/Component';

export class CollisionComponent implements Component {
    static readonly type: symbol = Symbol('Collision');
    readonly type = CollisionComponent.type;
    entity: Entity | null = null;

    // Store the entity that collided with this one
    collidedWith: Entity | null = null;
    
    // Track if this collision is already being handled by a system
    isBeingHandled: boolean = false;
}

export const CollisionComponentType = CollisionComponent.type; 