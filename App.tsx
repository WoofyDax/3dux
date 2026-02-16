
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Eye, Hand, Activity, Maximize } from 'lucide-react';
import Scene from './components/Scene';
import { visionService } from './services/visionService';
import { VisionData } from './types';

const App: React.FC = () => {
  const [visionData, setVisionData] = useState<VisionData>({
    head: { x: 0, y: 0, z: 15, yaw: 0, pitch: 0, active: false },
    hand: { tension: 0, active: false }
  });

  const [color, setColor] = useState('#00ffcc');
  const [isParallaxEnabled, setIsParallaxEnabled] = useState(true);
  const [isHandControlEnabled, setIsHandControlEnabled] = useState(true);
  const [fps, setFps] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isVisionReady, setIsVisionReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    const FALLBACK_MS = 6000; // Show app with mouse fallback if camera/vision hangs

    const fallbackTimer = setTimeout(() => {
      if (!cancelled) setIsVisionReady(true);
    }, FALLBACK_MS);

    async function setupVision() {
      const video = videoRef.current;
      if (!video) {
        setIsVisionReady(true);
        return;
      }
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setIsVisionReady(true);
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 },
          },
        });
        if (cancelled) return;
        video.srcObject = stream;
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
        await video.play();
        await visionService.initialize(video);
        if (!cancelled) setIsVisionReady(true);
      } catch (err) {
        console.warn("Camera/vision unavailable, using mouse fallback:", err);
        if (!cancelled) setIsVisionReady(true);
      } finally {
        clearTimeout(fallbackTimer);
      }
    }
    setupVision();
    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loop = () => {
      if (!active) return;
      const data = visionService.process();
      setVisionData(data);
      requestAnimationFrame(loop);
    };
    if (isVisionReady) loop();
    return () => { active = false; };
  }, [isVisionReady]);

  const handleRecalibrate = () => {
    setIsCalibrating(true);
    visionService.calibrate();
    setTimeout(() => setIsCalibrating(false), 1200);
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none font-sans">
      <video ref={videoRef} className="hidden" playsInline muted aria-hidden />

      {/* Single full-screen 3D environment */}
      <Scene 
        visionData={visionData}
        particleColor={color}
        isParallaxEnabled={isParallaxEnabled}
        isHandControlEnabled={isHandControlEnabled}
        onFpsUpdate={setFps}
      />

      {/* Control Panel UI */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">
        <div className="space-y-4 pointer-events-auto">
          <div className="flex items-center space-x-2 bg-black/80 backdrop-blur-xl p-3 rounded-xl border border-white/10 shadow-2xl">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h1 className="font-black text-lg tracking-wider text-white uppercase">3DUX</h1>
          </div>
          
          <div className="flex flex-col space-y-3 bg-black/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 w-64 shadow-2xl">
             <label className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">Atmosphere Color</label>
             <div className="flex items-center space-x-3">
               <input 
                 type="color" 
                 value={color}
                 onChange={(e) => setColor(e.target.value)}
                 className="w-full h-10 bg-transparent cursor-pointer rounded-lg border-none"
               />
               <div className="w-10 h-10 rounded-lg border border-white/20 shadow-lg shrink-0" style={{ backgroundColor: color }} />
             </div>
             <p className="text-[9px] text-white/30 italic">Hand Tension controls the depth of the back screen.</p>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-4 pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-xl p-3 rounded-xl border border-white/10 flex items-center space-x-4 text-xs font-mono shadow-2xl">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${visionData.head.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />
              <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Face</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${visionData.hand.active ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-red-500'}`} />
              <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Hand</span>
            </div>
            <div className="text-white/40 font-bold">{fps} FPS</div>
          </div>

          <div className="bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 flex flex-col space-y-3 shadow-2xl">
            <button 
              onClick={() => setIsParallaxEnabled(!isParallaxEnabled)}
              className={`flex items-center justify-between space-x-4 text-xs font-bold px-4 py-3 rounded-xl transition-all border ${isParallaxEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/40 border-transparent'}`}
            >
              <div className="flex items-center space-x-2 text-white">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Parallax Effect</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${isParallaxEnabled ? 'bg-emerald-500' : 'bg-white/20'}`}>
                 <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${isParallaxEnabled ? 'right-1' : 'left-1'}`} />
              </div>
            </button>
            
            <button 
              onClick={() => setIsHandControlEnabled(!isHandControlEnabled)}
              className={`flex items-center justify-between space-x-4 text-xs font-bold px-4 py-3 rounded-xl transition-all border ${isHandControlEnabled ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-white/5 text-white/40 border-transparent'}`}
            >
              <div className="flex items-center space-x-2 text-white">
                <Hand className="w-4 h-4 text-blue-400" />
                <span>Hand Depth Control</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${isHandControlEnabled ? 'bg-blue-500' : 'bg-white/20'}`}>
                 <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${isHandControlEnabled ? 'right-1' : 'left-1'}`} />
              </div>
            </button>

            <button 
              onClick={handleRecalibrate}
              className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
            >
              <RefreshCw className={`w-3 h-3 ${isCalibrating ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Reset Baseline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Head + Hand maps — bottom right */}
      <div className="absolute bottom-6 right-6 flex items-end gap-3 z-20 pointer-events-none">
        {/* Hand gesture map (tension: fist = deep, open = shallow) */}
        <div className="bg-black/80 backdrop-blur-xl p-3 rounded-xl border border-white/10 shadow-2xl">
          <div className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-2">Hand</div>
          <div className="relative w-10 h-28 rounded-lg border border-white/20 bg-white/5 overflow-hidden flex flex-col justify-end">
            <div
              className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-100 rounded-sm"
              style={{
                height: `${visionData.hand.tension * 100}%`,
                opacity: visionData.hand.active ? 1 : 0.35,
              }}
            />
          </div>
          <div className="mt-2 font-mono text-[8px] text-white/50 flex justify-between">
            <span>Deep</span>
            <span>Shallow</span>
          </div>
        </div>

        {/* Head position map */}
        <div className="bg-black/80 backdrop-blur-xl p-3 rounded-xl border border-white/10 shadow-2xl">
          <div className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-2">Head</div>
          <div className="relative w-28 h-28 rounded-lg border border-white/20 bg-white/5 overflow-hidden">
            <div
              className="absolute w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)] transition-all duration-75"
              style={{
                left: `${50 + visionData.head.x * 45}%`,
                top: `${50 - visionData.head.y * 45}%`,
                transform: 'translate(-50%, -50%)',
                opacity: visionData.head.active ? 1 : 0.4,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-px bg-white/10" />
              <div className="absolute w-px h-full bg-white/10" />
            </div>
          </div>
          <div className="mt-2 font-mono text-[10px] text-white/50">
            z {visionData.head.z.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tension Bar UI */}
      {isHandControlEnabled && visionData.hand.active && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-80 flex flex-col items-center space-y-3 z-20">
           <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400/80">Depth Interpolation</div>
           <div className="w-full h-2 bg-white/5 rounded-full border border-white/10 overflow-hidden backdrop-blur-md">
             <div 
               className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-100" 
               style={{ width: `${visionData.hand.tension * 100}%` }} 
             />
           </div>
           <div className="text-[8px] text-white/40 flex justify-between w-full uppercase font-mono">
              <span>Deep (Fist)</span>
              <span>Shallow (Open)</span>
           </div>
        </div>
      )}

      {/* Calibration Overlay */}
      {isCalibrating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-[60]">
          <div className="text-center">
            <div className="w-40 h-40 border-2 border-emerald-400/20 rounded-full flex items-center justify-center mb-8 relative">
               <div className="absolute inset-0 border-t-2 border-emerald-400 rounded-full animate-spin" />
               <Maximize className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-white mb-2 uppercase">RECALIBRATING</h2>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {!isVisionReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-[100]">
          <div className="flex flex-col items-center space-y-8">
            <div className="relative">
              <div className="w-20 h-20 border-t-2 border-emerald-500 rounded-full animate-spin shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
            </div>
            <div className="text-center">
               <p className="text-white font-black tracking-[0.8em] uppercase text-xl mb-2">3DUX ENGINE</p>
               <p className="text-white/20 font-mono text-xs uppercase tracking-widest">Initializing Spatial Tracking</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
