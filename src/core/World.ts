import { injectable } from 'inversify';
import { Entity } from './Component';
import { BaseSystem } from './System';
import { EventEmitter } from './EventEmitter';
import { Container } from 'inversify';
import { BaseEntity } from './BaseEntity';
import { WorldContainerComponent, WorldContainerComponentType } from '../components/WorldContainerComponent';
import { InputStateComponent, InputStateComponentType } from '../components/InputStateComponent';
import { GridRenderStateComponent, GridRenderStateComponentType } from '../components/GridRenderStateComponent';
import { ObjectPoolComponent, ObjectPoolComponentType } from '../components/ObjectPoolComponent';
import { ParticleStateComponent, ParticleStateComponentType } from '../components/ParticleStateComponent';
import { UIContainerComponent, UIContainerComponentType } from '../components/UIContainerComponent';
import { DebugStateComponent, DebugStateComponentType } from '../components/DebugStateComponent';
import { GameStateComponent, GameStateComponentType } from '../components/GameStateComponent';

@injectable()
export class World extends EventEmitter {
  private systems: BaseSystem[] = [];
  private entities: Set<Entity> = new Set();
  private _container: Container;

  // Keep track of manager entities
  private worldEntity: Entity | null = null;
  private playerStateEntity: Entity | null = null;
  private particleManagerEntity: Entity | null = null;
  private uiManagerEntity: Entity | null = null;
  private debugManagerEntity: Entity | null = null;
  private gameStateEntity: Entity | null = null;

  constructor(container: Container) {
    super();
    this._container = container;
  }

  public addSystem(system: BaseSystem): void {
    // console.log(`[World] Adding system: ${system.constructor.name}`);
    this.systems.push(system);
    system.setWorld(this);
  }

  public addEntity(entity: Entity): void {
    // console.log(`[World] Adding entity: ${entity.constructor.name}`);
    this.entities.add(entity);
    if (entity instanceof BaseEntity) {
      entity.world = this;
    }
    this.emit('entityAdded', entity);
  }

  public removeEntity(entity: Entity): void {
    // console.log(`[World] Removing entity: ${entity.constructor.name}`);
    this.entities.delete(entity);
    if (entity instanceof BaseEntity) {
      entity.world = undefined;
    }
    this.emit('entityRemoved', entity);
  }

  public clearEntities(): void {
    console.log('[World] Clearing all entities');
    // Properly destroy all entities
    this.entities.forEach(entity => {
      if (entity instanceof BaseEntity) {
        entity.destroy();
      }
    });
    this.entities.clear();
    
    // Clear manager entity references
    this.worldEntity = null;
    this.playerStateEntity = null;
    this.particleManagerEntity = null;
    this.uiManagerEntity = null;
    this.debugManagerEntity = null;
    this.gameStateEntity = null;
    console.log('[World] All entities cleared');
  }

  public getEntities(): Entity[] {
    return Array.from(this.entities);
  }

  public getSystem<T extends BaseSystem>(systemType: new (...args: any[]) => T): T | undefined {
    return this.systems.find(system => system instanceof systemType) as T | undefined;
  }

  public clearSystems(): void {
    console.log('[World] Clearing all systems');
    this.systems = [];
    console.log('[World] All systems cleared');
  }

  private createWorldEntity(): Entity {
    console.log('[World] Creating world entity');
    const entity = new BaseEntity();
    
    console.log('[World] Adding WorldContainerComponent');
    entity.addComponent(new WorldContainerComponent());
    
    console.log('[World] Adding GridRenderStateComponent');
    entity.addComponent(new GridRenderStateComponent());
    
    console.log('[World] Adding ObjectPoolComponent');
    entity.addComponent(new ObjectPoolComponent());
    
    console.log('[World] Adding world entity to world');
    this.addEntity(entity);
    this.worldEntity = entity;
    
    console.log('[World] World entity creation complete');
    return entity;
  }

  private createPlayerStateEntity(): Entity {
    const entity = new BaseEntity();
    entity.addComponent(new InputStateComponent());
    this.addEntity(entity);
    this.playerStateEntity = entity;
    return entity;
  }

  private createParticleManagerEntity(): Entity {
    const entity = new BaseEntity();
    const particleState = new ParticleStateComponent();
    entity.addComponent(particleState);
    
    // Add particle container to world container
    const worldContainer = this.getWorldContainer();
    if (worldContainer) {
      worldContainer.container.addChild(particleState.container);
    } else {
      console.warn('[World] WorldContainer not available when creating particle manager');
    }
    
    this.addEntity(entity);
    this.particleManagerEntity = entity;
    return entity;
  }

  private createUIManagerEntity(): Entity {
    const entity = new BaseEntity();
    entity.addComponent(new UIContainerComponent());
    this.addEntity(entity);
    this.uiManagerEntity = entity;
    return entity;
  }

  private createDebugManagerEntity(): Entity {
    const entity = new BaseEntity();
    entity.addComponent(new DebugStateComponent(true)); // Start collapsed by default
    this.addEntity(entity);
    this.debugManagerEntity = entity;
    return entity;
  }

  private createGameStateEntity(): Entity {
    const entity = new BaseEntity();
    entity.addComponent(new GameStateComponent());
    this.addEntity(entity);
    this.gameStateEntity = entity;
    return entity;
  }

  public createManagerEntities(): void {
    console.log('[World] Creating manager entities');
    this.createWorldEntity();
    this.createPlayerStateEntity();
    this.createParticleManagerEntity();
    this.createUIManagerEntity();
    this.createDebugManagerEntity();
    this.createGameStateEntity();
    console.log('[World] Manager entities created');
  }

  // Helper methods to get manager components
  public getWorldContainer(): WorldContainerComponent | null {
    return this.worldEntity?.getComponent(WorldContainerComponentType) ?? null;
  }

  public getInputState(): InputStateComponent | null {
    return this.playerStateEntity?.getComponent(InputStateComponentType) ?? null;
  }

  public getGridRenderState(): GridRenderStateComponent | null {
    return this.worldEntity?.getComponent(GridRenderStateComponentType) ?? null;
  }

  public getObjectPool(): ObjectPoolComponent | null {
    return this.worldEntity?.getComponent(ObjectPoolComponentType) ?? null;
  }

  public getParticleState(): ParticleStateComponent | null {
    return this.particleManagerEntity?.getComponent(ParticleStateComponentType) ?? null;
  }

  public getUIContainer(): UIContainerComponent | null {
    return this.uiManagerEntity?.getComponent(UIContainerComponentType) ?? null;
  }

  public getDebugState(): DebugStateComponent | null {
    // return this.debugManagerEntity?.getComponent(DebugStateComponentType) ?? null;
  }

  public getGameState(): GameStateComponent | null {
    return this.gameStateEntity?.getComponent(GameStateComponentType) ?? null;
  }

  public cleanup(): void {
    console.log('[World] Starting cleanup');
    // Destroy all entities
    this.clearEntities();
    
    // Clear all systems
    this.clearSystems();
    console.log('[World] Cleanup complete');
  }

  public restart(): void {
    console.log('[World] Restarting world');
    // Clean up existing state
    this.cleanup();
    
    // Create fresh manager entities
    this.createManagerEntities();
    console.log('[World] World restart complete');
  }

  public update(deltaTime: number): void {
    // Update all systems
    for (const system of this.systems) {
      const relevantEntities = Array.from(this.entities).filter(entity => 
        system.requiredComponents.every(componentType => entity.hasComponent(componentType))
      );
      system.update(relevantEntities, deltaTime);
    }
  }

  public get container(): Container {
    return this._container;
  }
} 