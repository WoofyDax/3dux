
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VisionData } from '../types';
import { applyOffAxisProjection } from '../services/mathUtils';

interface SceneProps {
  visionData: VisionData;
  particleColor: string;
  isParallaxEnabled: boolean;
  isHandControlEnabled: boolean;
  onFpsUpdate: (fps: number) => void;
}

interface TensionHistoryEntry {
  tension: number;
  time: number;
}

const Scene: React.FC<SceneProps> = ({
  visionData,
  particleColor,
  isParallaxEnabled,
  isHandControlEnabled,
  onFpsUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const visionRef = useRef(visionData);
  const settingsRef = useRef({ isParallaxEnabled, isHandControlEnabled, particleColor });
  
  // Start at a neutral 0.5 (default depth)
  const smoothedTensionFactor = useRef(0.5);
  // Track hand state transitions
  const wasHandActive = useRef(false);
  // Buffer to store recent tension values for lookback
  const tensionHistory = useRef<TensionHistoryEntry[]>([]);

  const wallsRef = useRef<{
    back: THREE.Mesh;
    left: THREE.Mesh;
    right: THREE.Mesh;
    top: THREE.Mesh;
    bottom: THREE.Mesh;
    frame: THREE.LineSegments;
  } | null>(null);

  useEffect(() => { visionRef.current = visionData; }, [visionData]);
  useEffect(() => { settingsRef.current = { isParallaxEnabled, isHandControlEnabled, particleColor }; }, [isParallaxEnabled, isHandControlEnabled, particleColor]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Ensure only one canvas (avoids duplicate/frozen view under React Strict Mode)
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(canvas);

    const boxW = 14;
    const boxH = 9;
    const gridColor = new THREE.Color(particleColor);
    const wallOpacity = 0.8;

    const createWallMesh = (width: number, height: number) => {
      const geometry = new THREE.PlaneGeometry(width, height, 20, 20);
      const material = new THREE.MeshBasicMaterial({
        color: gridColor,
        wireframe: true,
        transparent: true,
        opacity: wallOpacity,
        side: THREE.DoubleSide
      });
      return new THREE.Mesh(geometry, material);
    };

    const backWall = createWallMesh(boxW, boxH);
    const leftWall = createWallMesh(1, boxH);
    const rightWall = createWallMesh(1, boxH);
    const topWall = createWallMesh(boxW, 1);
    const bottomWall = createWallMesh(boxW, 1);

    const frontFrameGeom = new THREE.PlaneGeometry(boxW, boxH);
    const edges = new THREE.EdgesGeometry(frontFrameGeom);
    const frontFrame = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ 
      color: 0x00ffcc, 
      transparent: true, 
      opacity: 1.0,
      linewidth: 3
    }));
    frontFrame.position.z = 0.05;
    scene.add(frontFrame);

    scene.add(backWall, leftWall, rightWall, topWall, bottomWall);

    wallsRef.current = {
      back: backWall,
      left: leftWall,
      right: rightWall,
      top: topWall,
      bottom: bottomWall,
      frame: frontFrame
    };

    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTime = 0;
    let animationId: number;

    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate);
      const delta = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      frameCount++;
      fpsTime += delta;
      if (fpsTime >= 1) {
        onFpsUpdate(frameCount);
        frameCount = 0;
        fpsTime = 0;
      }

      const v = visionRef.current;
      const s = settingsRef.current;

      // 1. Perspective Parallax
      if (s.isParallaxEnabled && v.head.active) {
        const headX = v.head.x * 24; 
        const headY = v.head.y * 16;
        const headZ = Math.max(12, v.head.z * 1.8);
        applyOffAxisProjection(camera, new THREE.Vector3(headX, headY, headZ), boxW, boxH);
      } else {
        camera.position.lerp(new THREE.Vector3(0, 0, 22), 0.08);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      }

      // 2. Depth Control
      if (s.isHandControlEnabled) {
        if (v.hand.active) {
          // While active, record history and update factor
          tensionHistory.current.push({ tension: v.hand.tension, time });
          // Limit history to 1 second
          if (tensionHistory.current.length > 60) {
            tensionHistory.current.shift();
          }
          
          smoothedTensionFactor.current += (v.hand.tension - smoothedTensionFactor.current) * 0.15;
          wasHandActive.current = true;
        } else if (wasHandActive.current) {
          // Just lost tracking: Pick the position from ~200ms ago
          const targetTime = time - 200;
          let bestEntry = tensionHistory.current[tensionHistory.current.length - 1];
          
          for (let i = tensionHistory.current.length - 1; i >= 0; i--) {
            if (tensionHistory.current[i].time <= targetTime) {
              bestEntry = tensionHistory.current[i];
              break;
            }
          }
          
          if (bestEntry) {
            smoothedTensionFactor.current = bestEntry.tension;
          }
          
          wasHandActive.current = false;
          tensionHistory.current = []; // Clear history until hand returns
        }
        // If inactive and wasHandActive is false, we just stay at current smoothedTensionFactor.current
      }

      const currentDepth = THREE.MathUtils.lerp(60, 2, smoothedTensionFactor.current);

      if (wallsRef.current) {
        const { back, left, right, top, bottom } = wallsRef.current;
        back.position.z = -currentDepth;
        
        left.scale.x = currentDepth;
        left.position.set(-boxW / 2, 0, -currentDepth / 2);
        left.rotation.y = Math.PI / 2;

        right.scale.x = currentDepth;
        right.position.set(boxW / 2, 0, -currentDepth / 2);
        right.rotation.y = -Math.PI / 2;

        top.scale.y = currentDepth;
        top.position.set(0, boxH / 2, -currentDepth / 2);
        top.rotation.x = Math.PI / 2;

        bottom.scale.y = currentDepth;
        bottom.position.set(0, -boxH / 2, -currentDepth / 2);
        bottom.rotation.x = -Math.PI / 2;

        const colorObj = new THREE.Color(s.particleColor);
        [back, left, right, top, bottom].forEach(mesh => {
          (mesh.material as THREE.MeshBasicMaterial).color.copy(colorObj);
        });
        (wallsRef.current.frame.material as THREE.LineBasicMaterial).color.copy(colorObj);
      }

      renderer.render(scene, camera);
    };

    animate(performance.now());

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      // Remove canvas from DOM even if containerRef is null (e.g. after Strict Mode unmount)
      const canvas = renderer.domElement;
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
};

export default Scene;
