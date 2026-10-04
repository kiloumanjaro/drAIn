import {
  FC,
  type ComponentRef,
  Suspense,
  useRef,
  useLayoutEffect,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react';
import {
  Canvas,
  useFrame,
  useLoader,
  useThree,
  invalidate as invalidateAll,
} from '@react-three/fiber';
import {
  OrbitControls,
  useGLTF,
  useFBX,
  useProgress,
  Html,
  Environment,
} from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';
import { useReducedMotion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/error-boundary';
import {
  disposeModel,
  modelKind,
  prepareModel,
  registerModelSource,
  releaseModel,
  retainModel,
  setModelFade,
} from './model-resources';

export interface ViewerProps {
  url: string;
  /** What the model shows, for people who cannot see the canvas. */
  label?: string;
  width?: number | string;
  height?: number | string;
  modelXOffset?: number;
  modelYOffset?: number;
  defaultRotationX?: number;
  defaultRotationY?: number;
  defaultZoom?: number;
  minZoomDistance?: number;
  maxZoomDistance?: number;
  enableMouseParallax?: boolean;
  enableManualRotation?: boolean;
  enableHoverRotation?: boolean;
  enableManualZoom?: boolean;
  ambientIntensity?: number;
  keyLightIntensity?: number;
  fillLightIntensity?: number;
  rimLightIntensity?: number;
  environmentPreset?:
    | 'city'
    | 'sunset'
    | 'night'
    | 'dawn'
    | 'studio'
    | 'apartment'
    | 'forest'
    | 'park'
    | 'none';
  autoFrame?: boolean;
  placeholderSrc?: string;
  showScreenshotButton?: boolean;
  fadeIn?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  onModelLoaded?: () => void;
}

const isTouch =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);
const deg2rad = (d: number) => (d * Math.PI) / 180;
const DECIDE = 8; // px before we decide horizontal vs vertical
const ROTATE_SPEED = 0.005;
const INERTIA = 0.925;
const PARALLAX_MAG = 0.05;
const PARALLAX_EASE = 0.12;
const HOVER_MAG = deg2rad(6);
const HOVER_EASE = 0.15;
// Frames are drawn on demand, so the time since the last one can be seconds.
// Capped so the model doesn't leap when the rotation picks up again.
const MAX_ROTATION_STEP = 0.1;

const Loader: FC<{ placeholderSrc?: string }> = ({ placeholderSrc }) => {
  const { progress, active } = useProgress();
  if (!active && placeholderSrc) return null;
  return (
    <Html center>
      {placeholderSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- placeholderSrc is an arbitrary data URI / external thumbnail that next/image's loader cannot validate
        <img
          src={placeholderSrc}
          alt=""
          width={128}
          height={128}
          className="rounded-lg blur-lg"
        />
      ) : (
        `${Math.round(progress)} %`
      )}
    </Html>
  );
};

const DesktopControls: FC<{
  pivot: THREE.Vector3;
  min: number;
  max: number;
  zoomEnabled: boolean;
}> = ({ pivot, min, max, zoomEnabled }) => {
  // Typed from the component itself so it tracks drei's OrbitControls.
  const ref = useRef<ComponentRef<typeof OrbitControls>>(null);
  useFrame(() => ref.current?.target.copy(pivot));
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enablePan={false}
      enableRotate={false}
      enableZoom={zoomEnabled}
      minDistance={min}
      maxDistance={max}
    />
  );
};

/** Puts the camera `distance` in front of `target`, with clip planes to suit. */
function frameCamera(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  distance: number,
  fitRadius: number
) {
  const d = (fitRadius * 1.2) / Math.sin((camera.fov * Math.PI) / 180 / 2);
  camera.position.set(target.x, target.y, target.z + distance);
  camera.near = d / 10;
  camera.far = d * 10;
  camera.updateProjectionMatrix();
}

interface ModelStageProps {
  url: string;
  /** The loader's cached object for `url`; never mutated here. */
  source: THREE.Object3D;
  xOff: number;
  yOff: number;
  pivot: THREE.Vector3;
  initYaw: number;
  initPitch: number;
  minZoom: number;
  maxZoom: number;
  enableMouseParallax: boolean;
  enableManualRotation: boolean;
  enableHoverRotation: boolean;
  enableManualZoom: boolean;
  autoFrame: boolean;
  fadeIn: boolean;
  autoRotate: boolean;
  defaultZoom: number;
  autoRotateSpeed: number;
  onLoaded?: () => void;
}

const ModelStage: FC<ModelStageProps> = ({
  url,
  source,
  xOff,
  yOff,
  pivot,
  initYaw,
  initPitch,
  minZoom,
  maxZoom,
  enableMouseParallax,
  enableManualRotation,
  enableHoverRotation,
  enableManualZoom,
  autoFrame,
  fadeIn,
  autoRotate,
  autoRotateSpeed,
  defaultZoom,
  onLoaded,
}) => {
  const outer = useRef<THREE.Group>(null!);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  // This canvas's own invalidate; the module-level one redraws every canvas.
  const invalidate = useThree((state) => state.invalidate);

  const vel = useRef({ x: 0, y: 0 });
  const tPar = useRef({ x: 0, y: 0 });
  const cPar = useRef({ x: 0, y: 0 });
  const tHov = useRef({ x: 0, y: 0 });
  const cHov = useRef({ x: 0, y: 0 });
  const ndc = useRef(new THREE.Vector3());

  // Measured before the copy is attached to anything, so the size and centre
  // are the model's own and do not depend on how the viewer is turned.
  const model = useMemo(() => prepareModel(source), [source]);
  const scale = model.radius > 0 ? 1 / (model.radius * 2) : 1;

  useEffect(() => registerModelSource(url, source), [url, source]);
  // In development React runs this cleanup and then keeps using the same
  // materials. That is harmless: three.js rebuilds a disposed material's
  // program the next time it is drawn.
  useEffect(() => () => disposeModel(model), [model]);

  const notifyLoaded = useEffectEvent(() => onLoaded?.());

  useLayoutEffect(() => {
    pivot.copy(model.offset);
  }, [model, pivot]);

  useLayoutEffect(() => {
    outer.current.rotation.set(initPitch, initYaw, 0);
    invalidate();
  }, [model, initPitch, initYaw, invalidate]);

  useLayoutEffect(() => {
    if (!autoFrame || !(camera instanceof THREE.PerspectiveCamera)) return;
    // The model is scaled to a bounding sphere of diameter 1.
    frameCamera(camera, model.offset, defaultZoom, model.radius * scale);
    invalidate();
  }, [model, scale, autoFrame, camera, defaultZoom, invalidate]);

  useLayoutEffect(() => {
    if (!fadeIn) {
      notifyLoaded();
      return;
    }
    setModelFade(model, 0);
    let t = 0;
    const id = setInterval(() => {
      t += 0.05;
      const v = Math.min(t, 1);
      setModelFade(model, v);
      invalidate();
      if (v === 1) {
        clearInterval(id);
        notifyLoaded();
      }
    }, 16);
    return () => {
      clearInterval(id);
      setModelFade(model, 1);
    };
  }, [model, fadeIn, invalidate]);

  useEffect(() => {
    if (!enableManualRotation || isTouch) return;
    const el = gl.domElement;
    let drag = false;
    let lx = 0,
      ly = 0;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      drag = true;
      lx = e.clientX;
      ly = e.clientY;
      window.addEventListener('pointerup', up);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      outer.current.rotation.y += dx * ROTATE_SPEED;
      outer.current.rotation.x += dy * ROTATE_SPEED;
      vel.current = { x: dx * ROTATE_SPEED, y: dy * ROTATE_SPEED };
      invalidate();
    };
    const up = () => (drag = false);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl, invalidate, enableManualRotation]);

  useEffect(() => {
    if (!isTouch) return;
    const el = gl.domElement;
    const pts = new Map<number, { x: number; y: number }>();
    type Mode = 'idle' | 'decide' | 'rotate' | 'pinch';
    let mode: Mode = 'idle';
    let sx = 0,
      sy = 0,
      lx = 0,
      ly = 0,
      startDist = 0,
      startZ = 0;

    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        mode = 'decide';
        sx = lx = e.clientX;
        sy = ly = e.clientY;
      } else if (pts.size === 2 && enableManualZoom) {
        mode = 'pinch';
        const [p1, p2] = [...pts.values()];
        startDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        startZ = camera.position.z;
        e.preventDefault();
      }
      invalidate();
    };

    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;

      if (mode === 'decide') {
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (Math.abs(dx) > DECIDE || Math.abs(dy) > DECIDE) {
          if (enableManualRotation && Math.abs(dx) > Math.abs(dy)) {
            mode = 'rotate';
            el.setPointerCapture(e.pointerId);
          } else {
            mode = 'idle';
            pts.clear();
          }
        }
      }

      if (mode === 'rotate') {
        e.preventDefault();
        const dx = e.clientX - lx;
        const dy = e.clientY - ly;
        lx = e.clientX;
        ly = e.clientY;
        outer.current.rotation.y += dx * ROTATE_SPEED;
        outer.current.rotation.x += dy * ROTATE_SPEED;
        vel.current = { x: dx * ROTATE_SPEED, y: dy * ROTATE_SPEED };
        invalidate();
      } else if (mode === 'pinch' && pts.size === 2) {
        e.preventDefault();
        const [p1, p2] = [...pts.values()];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const ratio = startDist / d;
        camera.position.setZ(
          THREE.MathUtils.clamp(startZ * ratio, minZoom, maxZoom)
        );
        invalidate();
      }
    };

    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (mode === 'rotate' && pts.size === 0) mode = 'idle';
      if (mode === 'pinch' && pts.size < 2) mode = 'idle';
    };

    el.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [
    gl,
    camera,
    invalidate,
    enableManualRotation,
    enableManualZoom,
    minZoom,
    maxZoom,
  ]);

  // The model leans towards the mouse. Listening on the canvas rather than
  // the window means the page redraws the model only while the pointer is
  // over it, and not at all when neither effect is on.
  useEffect(() => {
    if (!enableMouseParallax) tPar.current = { x: 0, y: 0 };
    if (!enableHoverRotation) tHov.current = { x: 0, y: 0 };
    invalidate();
    if (isTouch || (!enableMouseParallax && !enableHoverRotation)) return;
    const el = gl.domElement;
    const mm = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      if (enableMouseParallax)
        tPar.current = { x: -nx * PARALLAX_MAG, y: -ny * PARALLAX_MAG };
      if (enableHoverRotation)
        tHov.current = { x: ny * HOVER_MAG, y: nx * HOVER_MAG };
      invalidate();
    };
    el.addEventListener('pointermove', mm);
    return () => el.removeEventListener('pointermove', mm);
  }, [gl, invalidate, enableMouseParallax, enableHoverRotation]);

  // A hidden tab draws nothing, so the rotation stops with it; this restarts
  // the frames when the tab comes back or the rotation is switched on.
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const onChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  const spinning = autoRotate && pageVisible;
  useEffect(() => {
    if (spinning) invalidate();
  }, [spinning, invalidate]);

  useFrame((_, dt) => {
    let need = false;
    cPar.current.x += (tPar.current.x - cPar.current.x) * PARALLAX_EASE;
    cPar.current.y += (tPar.current.y - cPar.current.y) * PARALLAX_EASE;
    const phx = cHov.current.x,
      phy = cHov.current.y;
    cHov.current.x += (tHov.current.x - cHov.current.x) * HOVER_EASE;
    cHov.current.y += (tHov.current.y - cHov.current.y) * HOVER_EASE;

    const point = ndc.current.copy(model.offset).project(camera);
    point.x += xOff + cPar.current.x;
    point.y += yOff + cPar.current.y;
    outer.current.position.copy(point.unproject(camera));

    outer.current.rotation.x += cHov.current.x - phx;
    outer.current.rotation.y += cHov.current.y - phy;

    // Each rotation frame asks for the next, so they stop when this does.
    if (spinning) {
      outer.current.rotation.y +=
        autoRotateSpeed * Math.min(dt, MAX_ROTATION_STEP);
      need = true;
    }

    outer.current.rotation.y += vel.current.x;
    outer.current.rotation.x += vel.current.y;
    vel.current.x *= INERTIA;
    vel.current.y *= INERTIA;
    if (Math.abs(vel.current.x) > 1e-4 || Math.abs(vel.current.y) > 1e-4)
      need = true;

    if (
      Math.abs(cPar.current.x - tPar.current.x) > 1e-4 ||
      Math.abs(cPar.current.y - tPar.current.y) > 1e-4 ||
      Math.abs(cHov.current.x - tHov.current.x) > 1e-4 ||
      Math.abs(cHov.current.y - tHov.current.y) > 1e-4
    )
      need = true;

    if (need) invalidate();
  });

  return (
    <group ref={outer}>
      <group
        position={[model.offset.x, model.offset.y, model.offset.z]}
        scale={scale}
      >
        <primitive object={model.object} />
      </group>
    </group>
  );
};

type LoadedModelProps = Omit<ModelStageProps, 'source'>;

// One component per file type, so each calls its loader hook on every render.
const GltfModel: FC<LoadedModelProps> = (props) => {
  const { scene } = useGLTF(props.url);
  return <ModelStage {...props} source={scene} />;
};
const FbxModel: FC<LoadedModelProps> = (props) => {
  const group = useFBX(props.url);
  return <ModelStage {...props} source={group} />;
};
const ObjModel: FC<LoadedModelProps> = (props) => {
  const group = useLoader(OBJLoader, props.url);
  return <ModelStage {...props} source={group} />;
};

const MODEL_COMPONENTS = { gltf: GltfModel, fbx: FbxModel, obj: ObjModel };

/** Drops a file from its loader's cache, so it can be collected or refetched. */
function clearLoaderCache(url: string) {
  const kind = modelKind(url);
  if (kind === 'gltf') useGLTF.clear(url);
  else if (kind === 'fbx') useFBX.clear(url);
  else if (kind === 'obj') useLoader.clear(OBJLoader, url);
}

const ModelViewer: FC<ViewerProps> = ({
  url,
  label = '3D model',
  width = 400,
  height = 400,
  modelXOffset = 0,
  modelYOffset = 0,
  defaultRotationX = -50,
  defaultRotationY = 20,
  defaultZoom = 0.5,
  minZoomDistance = 0.5,
  maxZoomDistance = 10,
  enableMouseParallax = true,
  enableManualRotation = true,
  enableHoverRotation = true,
  enableManualZoom = true,
  ambientIntensity = 0.3,
  keyLightIntensity = 1,
  fillLightIntensity = 0.5,
  rimLightIntensity = 0.8,
  environmentPreset = 'forest',
  autoFrame = false,
  placeholderSrc,
  showScreenshotButton = true,
  fadeIn = false,
  autoRotate = false,
  autoRotateSpeed = 0.35,
  onModelLoaded,
}) => {
  const kind = modelKind(url);
  const Model = kind ? MODEL_COMPONENTS[kind] : null;

  useEffect(() => {
    if (!kind) {
      console.error('Unsupported 3D model format:', url);
      return;
    }
    if (kind === 'gltf') useGLTF.preload(url);
    retainModel(url);
    return () => releaseModel(url, clearLoaderCache);
  }, [url, kind]);

  // One vector for the life of the component, created once.
  const [pivot] = useState(() => new THREE.Vector3());
  const rendererRef = useRef<THREE.WebGLRenderer>(null);
  const sceneRef = useRef<THREE.Scene>(null);
  const cameraRef = useRef<THREE.Camera>(null);

  // Someone who asked their system for less motion gets a still model; the
  // button still lets them start the rotation, and anyone else stop it.
  const prefersReducedMotion = useReducedMotion();
  const [rotationChoice, setRotationChoice] = useState<boolean | null>(null);
  const rotating = autoRotate && (rotationChoice ?? !prefersReducedMotion);

  const initYaw = deg2rad(defaultRotationX);
  const initPitch = deg2rad(defaultRotationY);
  const camZ = Math.min(
    Math.max(defaultZoom, minZoomDistance),
    maxZoomDistance
  );

  const capture = () => {
    const g = rendererRef.current,
      s = sceneRef.current,
      c = cameraRef.current;
    if (!g || !s || !c) return;
    g.shadowMap.enabled = false;
    const tmp: { l: THREE.Light; cast: boolean }[] = [];
    s.traverse((o: THREE.Object3D) => {
      const light = o as THREE.Light;
      if (light.isLight && 'castShadow' in light) {
        tmp.push({
          l: light,
          cast: (light as THREE.Light & { castShadow: boolean }).castShadow,
        });
        o.castShadow = false;
      }
    });
    g.render(s, c);
    const urlPNG = g.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = 'model.png';
    a.href = urlPNG;
    a.click();
    g.shadowMap.enabled = true;
    tmp.forEach(({ l, cast }) => (l.castShadow = cast));
    invalidateAll();
  };

  return (
    <div
      style={{
        width,
        height,
        touchAction: 'pan-y pinch-zoom',
      }}
      className="relative"
    >
      {showScreenshotButton && (
        <button
          onClick={capture}
          className="absolute top-4 right-4 z-10 cursor-pointer rounded-xl border border-white bg-transparent px-4 py-2 text-white transition-colors hover:bg-white hover:text-black"
        >
          Take Screenshot
        </button>
      )}

      {autoRotate && (
        <button
          type="button"
          onClick={() => setRotationChoice(!rotating)}
          aria-label={rotating ? 'Pause rotation' : 'Play rotation'}
          title={rotating ? 'Pause rotation' : 'Play rotation'}
          className="absolute right-2 bottom-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[#ced1cd] bg-white/90 text-gray-700 transition-colors hover:bg-white"
        >
          {rotating ? (
            <Pause aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Play aria-hidden="true" className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      <Canvas
        role="img"
        aria-label={label}
        shadows
        frameloop="demand"
        // Keeping every drawn frame readable costs the GPU a copy per frame;
        // only saving a screenshot needs it.
        gl={{ preserveDrawingBuffer: showScreenshotButton }}
        onCreated={({ gl, scene, camera }) => {
          rendererRef.current = gl;
          sceneRef.current = scene;
          cameraRef.current = camera;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
        camera={{ fov: 50, position: [0, 0, camZ], near: 0.01, far: 100 }}
        style={{ touchAction: 'pan-y pinch-zoom' }}
      >
        {environmentPreset !== 'none' && (
          // The reflections come from another site. Without them the lights
          // below still show the model, so their failure is not the viewer's.
          <ErrorBoundary fallback={null}>
            <Environment
              preset={
                environmentPreset as React.ComponentProps<
                  typeof Environment
                >['preset']
              }
              background={false}
            />
          </ErrorBoundary>
        )}

        <ambientLight intensity={ambientIntensity} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={keyLightIntensity}
          castShadow
        />
        <directionalLight
          position={[-5, 2, 5]}
          intensity={fillLightIntensity}
        />
        <directionalLight position={[0, 4, -5]} intensity={rimLightIntensity} />

        {Model && (
          <Suspense fallback={<Loader placeholderSrc={placeholderSrc} />}>
            <Model
              url={url}
              xOff={modelXOffset}
              yOff={modelYOffset}
              pivot={pivot}
              initYaw={initYaw}
              initPitch={initPitch}
              minZoom={minZoomDistance}
              maxZoom={maxZoomDistance}
              enableMouseParallax={enableMouseParallax}
              enableManualRotation={enableManualRotation}
              enableHoverRotation={enableHoverRotation}
              enableManualZoom={enableManualZoom}
              autoFrame={autoFrame}
              fadeIn={fadeIn && !prefersReducedMotion}
              autoRotate={rotating}
              autoRotateSpeed={autoRotateSpeed}
              defaultZoom={camZ}
              onLoaded={onModelLoaded}
            />
          </Suspense>
        )}

        {!isTouch && (
          <DesktopControls
            pivot={pivot}
            min={minZoomDistance}
            max={maxZoomDistance}
            zoomEnabled={enableManualZoom}
          />
        )}
      </Canvas>
    </div>
  );
};

export default ModelViewer;
