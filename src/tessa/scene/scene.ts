import { Camera } from '../camera/camera';
import { EventBus } from '../events/event-bus';
import { SceneEvents } from '../events/event-types';
import { SceneNode } from './scene-node';

/**
 * Represents a complete scene graph
 */
export class Scene {
  private readonly _root: SceneNode;
  private _activeCamera: Camera | null = null;
  private readonly _cameras: Map<string, Camera> = new Map();

  /**
   * Create a new scene
   * @param id Unique identifier for the scene
   * @param eventBus Event bus for dispatching scene events
   */
  constructor(
    public readonly id: string,
    private readonly eventBus: EventBus,
  ) {
    // Create root node for scene graph
    this._root = new SceneNode('root');
  }

  /**
   * Get the root node of the scene graph
   */
  get root(): SceneNode {
    return this._root;
  }

  /**
   * Get the active camera for this scene
   */
  get activeCamera(): Camera | null {
    return this._activeCamera;
  }

  /**
   * Create a new node in the scene
   * @param name The name of the node
   * @param parent Optional parent node, defaults to root if not provided
   * @returns The newly created scene node
   */
  createNode(name: string, parent?: SceneNode): SceneNode {
    const node = new SceneNode(name);

    // Add to parent or root if no parent specified
    (parent || this._root).addChild(node);

    return node;
  }

  /**
   * Register a camera with the scene
   * @param name Unique name for the camera
   * @param camera The camera component to register
   */
  registerCamera(name: string, camera: Camera): void {
    if (this._cameras.has(name)) {
      throw new Error(`Camera with name "${name}" already exists in scene`);
    }

    this._cameras.set(name, camera);

    // Set as active camera if no active camera exists
    if (!this._activeCamera) {
      this.setActiveCamera(camera);
    }
  }

  /**
   * Set the active camera for the scene
   * @param cameraOrName Camera instance or name of a registered camera
   */
  setActiveCamera(cameraOrName: Camera | string): void {
    let camera: Camera | null = null;

    if (typeof cameraOrName === 'string') {
      camera = this._cameras.get(cameraOrName) ?? null;
      if (!camera) {
        throw new Error(`Camera with name "${cameraOrName}" not found in scene`);
      }
    } else {
      camera = cameraOrName;

      // Register camera if not already registered
      if (!Array.from(this._cameras.values()).includes(camera)) {
        const name = `camera_${this._cameras.size}`;

        this._cameras.set(name, camera);
      }
    }

    this._activeCamera = camera;
    this.eventBus.emit(SceneEvents.CameraChanged, this.id, camera);
  }

  /**
   * Find a node by name in the scene
   * @param name The name of the node to find
   * @returns The node or null if not found
   */
  findNode(name: string): SceneNode | null {
    return this.findNodeRecursive(this._root, name);
  }

  /**
   * Update the scene
   * @param deltaTime Time elapsed since last update in milliseconds
   */
  update(deltaTime: number): void {
    // Update entire scene graph
    this._root.update(deltaTime);
  }

  /**
   * Recursively find a node by name
   * @param node The current node to check
   * @param name The name to search for
   * @returns The found node or null
   */
  private findNodeRecursive(node: SceneNode, name: string): SceneNode | null {
    if (node.name === name) {
      return node;
    }

    for (const child of node.children) {
      const found = this.findNodeRecursive(child, name);

      if (found) {
        return found;
      }
    }

    return null;
  }
}
