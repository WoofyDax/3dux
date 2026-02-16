
import { FaceLandmarker, HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { VisionData } from "../types";
import { EMA } from "./mathUtils";

class VisionService {
  private faceLandmarker: FaceLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;

  // Smoothing
  private headX = new EMA(0.3);
  private headY = new EMA(0.3);
  private headZ = new EMA(0.1);
  private tension = new EMA(0.2);

  // Persistence & Delays
  private lastFaceTimestamp = 0;
  private lastHandTimestamp = 0;
  private handStartTime = 0; 
  private readonly HOLD_THRESHOLD_MS = 150; // Snappier response when hand is dropped
  private readonly HAND_ACTIVATION_DELAY_MS = 200; 

  // Calibration
  private offsetX = 0;
  private offsetY = 0;

  private lastKnownHead = { x: 0, y: 0, z: 12 };
  private lastKnownTension = 0;

  /** Base URL for MediaPipe WASM and models (absolute so resolver works in dev and file://). */
  private static getMediaPipeBase(): string {
    if (typeof window !== "undefined") {
      return new URL("mediapipe", window.location.href).href.replace(/\/?$/, "");
    }
    return "mediapipe";
  }

  async initialize(videoElement: HTMLVideoElement) {
    this.video = videoElement;
    const base = VisionService.getMediaPipeBase();
    try {
      const vision = await FilesetResolver.forVisionTasks(
        `${base}/wasm`
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${base}/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${base}/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
    } catch (e) {
      console.error("Vision Service Init Error:", e);
    }
  }

  calibrate() {
    this.offsetX = this.lastKnownHead.x + this.offsetX;
    this.offsetY = this.lastKnownHead.y + this.offsetY; 
  }

  process(): VisionData {
    const now = performance.now();
    
    if (!this.video || !this.faceLandmarker || !this.handLandmarker || this.video.readyState < 2) {
      return { 
        head: { ...this.lastKnownHead, yaw: 0, pitch: 0, active: false }, 
        hand: { tension: this.lastKnownTension, active: false } 
      };
    }

    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;

      // --- FACE TRACKING ---
      const faceResults = this.faceLandmarker.detectForVideo(this.video, now);
      if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
        this.lastFaceTimestamp = now;
        const nose = faceResults.faceLandmarks[0][1];
        const rawX = (0.5 - nose.x) * 2; 
        const rawY = (0.5 - nose.y) * 2;
        const eyeL = faceResults.faceLandmarks[0][33];
        const eyeR = faceResults.faceLandmarks[0][263];
        const eyeDist = Math.sqrt(Math.pow(eyeL.x - eyeR.x, 2) + Math.pow(eyeL.y - eyeR.y, 2));
        const rawZ = 1.0 / (Math.max(0.01, eyeDist) + 0.05); 

        this.lastKnownHead = {
          x: this.headX.update(rawX),
          y: this.headY.update(rawY),
          z: this.headZ.update(rawZ)
        };
      }

      // --- HAND TRACKING ---
      const handResults = this.handLandmarker.detectForVideo(this.video, now);
      if (handResults.landmarks && handResults.landmarks.length > 0) {
        this.lastHandTimestamp = now;
        if (this.handStartTime === 0) this.handStartTime = now;

        const hand = handResults.landmarks[0];
        const wrist = hand[0];
        const tips = [4, 8, 12, 16, 20];
        let totalDist = 0;
        tips.forEach(idx => {
          const t = hand[idx];
          totalDist += Math.sqrt(Math.pow(t.x - wrist.x, 2) + Math.pow(t.y - wrist.y, 2));
        });
        const avgDist = totalDist / 5;
        const rawTension = Math.max(0, Math.min(1, (avgDist - 0.1) / 0.3));
        this.lastKnownTension = this.tension.update(rawTension);
      } else {
        if (now - this.lastHandTimestamp > this.HOLD_THRESHOLD_MS) {
          this.handStartTime = 0;
        }
      }
    }

    const isHeadActive = (now - this.lastFaceTimestamp) < 500;
    const handContinuousDuration = this.handStartTime === 0 ? 0 : (now - this.handStartTime);
    const isHandActive = (now - this.lastHandTimestamp) < this.HOLD_THRESHOLD_MS && handContinuousDuration > this.HAND_ACTIVATION_DELAY_MS;

    return {
      head: {
        x: (this.lastKnownHead.x - this.offsetX) || 0,
        y: (this.lastKnownHead.y - this.offsetY) || 0,
        z: this.lastKnownHead.z || 12,
        yaw: 0, pitch: 0,
        active: isHeadActive
      },
      hand: {
        tension: this.lastKnownTension || 0,
        active: isHandActive
      }
    };
  }
}

export const visionService = new VisionService();
