
import * as THREE from 'three';

const COUNT = 10000;

export function generateTemplate(type: string): Float32Array {
  const positions = new Float32Array(COUNT * 3);
  
  switch (type) {
    case 'heart':
      for (let i = 0; i < COUNT; i++) {
        const t = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const z = (Math.random() - 0.5) * 5;
        positions[i * 3] = x * 0.15 * r;
        positions[i * 3 + 1] = y * 0.15 * r;
        positions[i * 3 + 2] = z * 0.15;
      }
      break;

    case 'flower':
      for (let i = 0; i < COUNT; i++) {
        const t = Math.random() * Math.PI * 2;
        const k = 5; // petals
        const r = Math.sin(k * t) * (1 + 0.2 * Math.random());
        const x = r * Math.cos(t) * 4;
        const y = r * Math.sin(t) * 4;
        const z = (Math.random() - 0.5) * 2;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }
      break;

    case 'saturn':
      for (let i = 0; i < COUNT; i++) {
        if (i < COUNT * 0.6) { // Sphere
          const u = Math.random();
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          const r = 2.5;
          positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          positions[i * 3 + 2] = r * Math.cos(phi);
        } else { // Ring
          const t = Math.random() * Math.PI * 2;
          const r = 3.5 + Math.random() * 1.5;
          positions[i * 3] = r * Math.cos(t);
          positions[i * 3 + 1] = r * Math.sin(t);
          positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
        }
      }
      break;

    case 'buddha':
      // Simplified silhouette: a stack of spheres forming a meditative pose
      for (let i = 0; i < COUNT; i++) {
        let x, y, z;
        const p = Math.random();
        if (p < 0.4) { // Base/Legs (Wide)
          const angle = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * 4;
          x = r * Math.cos(angle);
          y = -3 + Math.random() * 2;
          z = r * Math.sin(angle) * 0.5;
        } else if (p < 0.8) { // Torso
          const angle = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * 2;
          x = r * Math.cos(angle);
          y = -1 + Math.random() * 3;
          z = r * Math.sin(angle) * 0.8;
        } else { // Head
          const u = Math.random();
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          const r = 1.0;
          x = r * Math.sin(phi) * Math.cos(theta);
          y = 2.5 + r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
        }
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }
      break;

    case 'fireworks':
      for (let i = 0; i < COUNT; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = Math.random() * 6;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      break;

    default: // Scatter / None
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }
  }
  return positions;
}
