import { Component } from '../components/component';
import { Transform } from '../math/transform';
import { UUID } from '../utils/uuid';

export class SceneNode {
  readonly id: string = UUID.generate();
  readonly transform: Transform = new Transform();

  private readonly components: Map<string, Component> = new Map();
  private _parent: SceneNode | null = null;
  private readonly _children: SceneNode[] = [];

  constructor(public name: string) {
    // Initialize transform
  }

  addChild(child: SceneNode): void {
    if (child.parent) {
      child.parent.removeChild(child);
    }

    this.children.push(child);
    child.parent = this;
  }

  removeChild(child: SceneNode): void {
    const index = this.children.indexOf(child);

    if (index !== -1) {
      this.children.splice(index, 1);
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
    // Update all components
    for (const component of this.components.values()) {
      component.update(deltaTime);
    }

    // Update children
    for (const child of this.children) {
      child.update(deltaTime);
    }
  }

  /**
   * Get all children of this node
   */
  get children(): SceneNode[] {
    return [...this._children];
  }

  /**
   * Get the parent node
   */
  get parent(): SceneNode | null {
    return this._parent;
  }

  /**
   * Set the parent node (internal use)
   */
  set parent(node: SceneNode | null) {
    this._parent = node;
  }
}
