import { SceneNode } from '../scene/scene-node';
import { UUID } from '../utils/uuid';

export abstract class Component {
  readonly id: string = UUID.generate();

  // Component type (to be set by derived classes)
  type: string = 'Component';

  // Reference to the node this component is attached to
  private node_: SceneNode | null = null;

  // Lifecycle flags
  private isEnabled_: boolean = true;
  protected isInitialized_: boolean = false;

  // Type getter for component lookup
  getType(): string {
    return this.type;
  }

  // Node getter/setter with proper typing
  get node(): SceneNode {
    if (!this.node_) {
      throw new Error('Component is not attached to a node');
    }

    return this.node_;
  }

  set node(value: SceneNode) {
    if (this.node_ && this.node_ !== value) {
      this.onDetach();
    }

    this.node_ = value;

    if (this.node_ && !this.isInitialized_) {
      const initPromise = this.initialize();

      if (initPromise instanceof Promise) {
        initPromise
          .then(() => {
            this.isInitialized_ = true;
          })
          .catch((error) => {
            console.error('Error initializing component:', error);
          });
      } else {
        this.isInitialized_ = true;
      }
    }

    if (this.node_) {
      this.onAttach();
    }
  }

  // Enable/disable the component
  get isEnabled(): boolean {
    return this.isEnabled_;
  }

  set isEnabled(value: boolean) {
    if (this.isEnabled_ !== value) {
      this.isEnabled_ = value;

      if (this.isEnabled_) {
        this.onEnable();
      } else {
        this.onDisable();
      }
    }
  }

  get isInitialized(): boolean {
    return this.isInitialized_;
  }

  set isInitialized(value: boolean) {
    if (value) {
      this.initialize();
    }
    this.isInitialized_ = value;
  }

  // Lifecycle methods that derived classes can override

  // Called when the component is first initialized
  protected initialize(): Promise<void> | void {
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
    if (!this.node_) {
      return null;
    }

    return this.node_.getComponent<T>(type) ?? null;
  }

  // Clean up resources when the component is destroyed
  destroy(): void {
    if (this.node_) {
      // Remove from node (implementation depends on SceneNode)
      this.onDetach();
      this.node_ = null;
    }

    this.isEnabled_ = false;
    this.isInitialized_ = false;
  }
}
