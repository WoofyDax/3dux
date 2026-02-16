
import * as THREE from 'three';

/**
 * Computes an off-axis projection matrix for a "virtual window" effect.
 * headPos: current 3D position of the viewer's eye relative to screen center.
 * screenWidth/Height: dimensions of the physical window in 3D units.
 */
export function applyOffAxisProjection(
  camera: THREE.PerspectiveCamera,
  headPos: THREE.Vector3,
  screenWidth: number,
  screenHeight: number,
  near: number = 0.1,
  far: number = 1000
) {
  const x = headPos.x;
  const y = headPos.y;
  const z = headPos.z;

  const left = (-screenWidth / 2 - x) * near / z;
  const right = (screenWidth / 2 - x) * near / z;
  const bottom = (-screenHeight / 2 - y) * near / z;
  const top = (screenHeight / 2 - y) * near / z;

  camera.projectionMatrix.makePerspective(left, right, top, bottom, near, far);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  
  // Set camera position to the viewer's head
  camera.position.set(x, y, z);
  // Important: The camera always looks perpendicular to the screen plane (z=0)
  camera.lookAt(new THREE.Vector3(x, y, 0));
}

/**
 * Exponential Moving Average for smoothing signals.
 */
export class EMA {
  private value: number | null = null;
  private alpha: number;

  constructor(alpha: number = 0.15) {
    this.alpha = alpha;
  }

  update(newValue: number): number {
    if (this.value === null) {
      this.value = newValue;
    } else {
      this.value = this.value * (1 - this.alpha) + newValue * this.alpha;
    }
    return this.value;
  }

  reset() {
    this.value = null;
  }
}
