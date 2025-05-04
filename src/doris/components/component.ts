import { SceneNode } from '../scene/scene-node';
import { UUID } from '../utils/uuid';

export abstract class Component {
  readonly id: string = UUID.generate();

  // Component type (to be set by derived classes)
  type: string = 'Component';

  // Reference to the node this component is attached to
  private _node: SceneNode | null = null;

  // Lifecycle flags
  private _isEnabled: boolean = true;
  private _isInitialized: boolean = false;

  // Type getter for component lookup
  getType(): string {
    return this.type;
  }

  // Node getter/setter with proper typing
  get node(): SceneNode {
    if (!this._node) {
      throw new Error('Component is not attached to a node');
    }

    return this._node;
  }

  set node(value: SceneNode) {
    if (this._node && this._node !== value) {
      this.onDetach();
    }

    this._node = value;

    if (this._node && !this._isInitialized) {
      this.initialize();
      this._isInitialized = true;
    }

    if (this._node) {
      this.onAttach();
    }
  }

  // Enable/disable the component
  get isEnabled(): boolean {
    return this._isEnabled;
  }

  set isEnabled(value: boolean) {
    if (this._isEnabled !== value) {
      this._isEnabled = value;

      if (this._isEnabled) {
        this.onEnable();
      } else {
        this.onDisable();
      }
    }
  }

  // Lifecycle methods that derived classes can override

  // Called when the component is first initialized
  protected initialize(): void {
    // Derived classes should override this
  }

  // Called when the component is attached to a node
  protected onAttach(): void {
    // Derived classes should override this
  }

  // Called when the component is detached from a node
  protected onDetach(): void {
    // Derived classes should override this
  }

  // Called when the component is enabled
  protected onEnable(): void {
    // Derived classes should override this
  }

  // Called when the component is disabled
  protected onDisable(): void {
    // Derived classes should override this
  }

  // Update method called every frame when the component is enabled
  abstract update(deltaTime?: number): void;

  // Utility method to get another component from the same node
  getComponent<T extends Component>(type: string): T | null {
    if (!this._node) {
      return null;
    }

    return this._node.getComponent<T>(type) ?? null;
  }

  // Clean up resources when the component is destroyed
  destroy(): void {
    if (this._node) {
      // Remove from node (implementation depends on SceneNode)
      this.onDetach();
      this._node = null;
    }

    this._isEnabled = false;
    this._isInitialized = false;
  }
}
