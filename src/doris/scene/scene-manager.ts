import { EventBus } from '../events/event-bus';
import { CoreEngineEvents, SceneEvents } from '../events/event-types';
import { Scene } from './scene';

/**
 * Manages all scenes in the engine and handles switching between them
 */
export class SceneManager {
  private readonly scenes: Map<string, Scene> = new Map();
  private _activeScene: Scene | null = null;

  constructor(private readonly eventBus: EventBus) {
    // Listen for update events to propagate to active scene
    this.eventBus.on(CoreEngineEvents.Update, this.update.bind(this));
  }

  /**
   * Initialize the scene manager
   */
  initialize(): void {
    // Create default scene if none exists
    if (this.scenes.size === 0) {
      this.createScene('default');
      this.setActiveScene('default');
    }
  }

  /**
   * Creates a new scene with the given id
   * @param id Unique identifier for the scene
   * @returns The newly created scene
   * @throws Error if a scene with the given id already exists
   */
  createScene(id: string): Scene {
    if (this.scenes.has(id)) {
      throw new Error(`Scene with id "${id}" already exists`);
    }

    const scene = new Scene(id, this.eventBus);

    this.scenes.set(id, scene);

    return scene;
  }

  /**
   * Gets a scene by its id
   * @param id The id of the scene to get
   * @returns The scene with the given id or undefined if not found
   */
  getScene(id: string): Scene | undefined {
    return this.scenes.get(id);
  }

  /**
   * Removes a scene by its id
   * @param id The id of the scene to remove
   */
  removeScene(id: string): void {
    if (this._activeScene?.id === id) {
      throw new Error(`Cannot remove active scene "${id}"`);
    }

    this.scenes.delete(id);
  }

  /**
   * Sets the active scene by id
   * @param id The id of the scene to set as active
   * @throws Error if no scene with the given id exists
   */
  setActiveScene(id: string): void {
    const scene = this.scenes.get(id);

    if (!scene) {
      throw new Error(`Scene with id "${id}" not found`);
    }

    // Deactivate old scene
    if (this._activeScene) {
      this.eventBus.emit(SceneEvents.Deactivate, this._activeScene.id);
    }

    this._activeScene = scene;
    this.eventBus.emit(SceneEvents.Activate, scene.id);
  }

  /**
   * Gets the currently active scene
   */
  get activeScene(): Scene | null {
    return this._activeScene;
  }

  /**
   * Updates the active scene
   * @param realDelta Time elapsed since last update in milliseconds
   */
  private update(_scaledDelta: number, realDelta: number): void {
    if (this._activeScene) {
      this._activeScene.update(realDelta);
    }
  }
}
