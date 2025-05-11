import { Component } from '../components/component';
import { Transform } from '../math/transform';
import { UUID } from '../utils/uuid';

export class SceneNode {
  readonly id: string = UUID.generate();
  readonly transform: Transform = new Transform(this);

  private readonly components: Map<string, Component> = new Map();
  private parent_: SceneNode | null = null;
  private readonly children_: SceneNode[] = [];

  constructor(public name: string) {
    // Initialize transform
  }

  addChild(child: SceneNode): void {
    if (child.parent) {
      child.parent.removeChild(child);
    }

    this.children_.push(child);
    child.parent = this;
  }

  removeChild(child: SceneNode): void {
    const index = this.children_.indexOf(child);

    if (index !== -1) {
      this.children_.splice(index, 1);
      child.parent = null;
    }
  }

  addComponent(component: Component): void {
    component.node = this;
    this.components.set(component.type, component);
  }

  getComponent<T extends Component>(type: string): T | undefined {
    return this.components.get(type) as T | undefined;
  }

  update(deltaTime: number): void {
    if (this.name === 'root') {
      // Check if the root node needs transform updates
      this.transform.validateWorldMatrix();
    }

    // Update all components
    for (const component of this.components.values()) {
      if (!component.isEnabled) {
        continue;
      }
      if (!component.isInitialized) {
        continue;
      }
      // Update the component
      component.update(deltaTime);
    }

    // Update children
    for (const child of this.children_) {
      child.update(deltaTime);
    }
  }

  /**
   * Get all children of this node
   */
  get children(): SceneNode[] {
    return [...this.children_];
  }

  /**
   * Get the parent node
   */
  get parent(): SceneNode | null {
    return this.parent_;
  }

  /**
   * Set the parent node (internal use)
   */
  set parent(node: SceneNode | null) {
    this.parent_ = node;
  }
}
