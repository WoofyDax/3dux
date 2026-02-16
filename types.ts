
export interface VisionData {
  head: {
    x: number; // -1 to 1
    y: number; // -1 to 1
    z: number; // depth estimate
    yaw: number;
    pitch: number;
    active: boolean;
  };
  hand: {
    tension: number; // 0 to 1
    active: boolean;
  };
}

export interface CalibrationData {
  neutralX: number;
  neutralY: number;
  neutralZ: number;
}
