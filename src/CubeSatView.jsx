import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useMemo } from "react";

/** Normalize a vector safely */
function unit(v) {
  const [x, y, z] = v ?? [0, 0, 0];
  const n = Math.hypot(x, y, z);
  if (!Number.isFinite(n) || n < 1e-9) return [0, 0, 0];
  return [x / n, y / n, z / n];
}

/** A reusable arrow (origin -> direction), direction in body frame */
function VectorArrow({
  dir = [0, 0, 0],
  length = 0.25,
  color = "#ffffff",
  label = "",
  labelOffset = [0.02, 0.02, 0.02],
}) {
  const u = unit(dir);

  const arrow = useMemo(() => {
    const d = new THREE.Vector3(u[0], u[1], u[2]);
    const origin = new THREE.Vector3(0, 0, 0);
    const hex = new THREE.Color(color).getHex();
    // headLength/headWidth scale with length
    return new THREE.ArrowHelper(d, origin, length, hex, length * 0.18, length * 0.10);
  }, [u[0], u[1], u[2], length, color]);

  // No label (keeps deps minimal). If you want, I can add Drei <Text>.
  return <primitive object={arrow} />;
}

function AxesTriad({ size = 0.18 }) {
  // X=red, Y=green, Z=blue (standard)
  const axes = useMemo(() => new THREE.AxesHelper(size), [size]);
  return <primitive object={axes} />;
}

function CubeSatModel() {
  // Dimensions in meters (approx 1U = 0.1m). 3U ~ 0.10 x 0.10 x 0.34
  const body = [0.10, 0.34, 0.10];

  return (
    <group>
      {/* Main body */}
      <mesh>
        <boxGeometry args={body} />
        <meshStandardMaterial metalness={0.35} roughness={0.6} />
      </mesh>

      {/* Solar panels (thin plates on long sides) */}
      <mesh position={[0.055, 0, 0]}>
        <boxGeometry args={[0.002, 0.32, 0.095]} />
        <meshStandardMaterial metalness={0.1} roughness={0.9} />
      </mesh>
      <mesh position={[-0.055, 0, 0]}>
        <boxGeometry args={[0.002, 0.32, 0.095]} />
        <meshStandardMaterial metalness={0.1} roughness={0.9} />
      </mesh>

      {/* Simple antenna */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.12, 24]} />
        <meshStandardMaterial metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Rails (4 long edges) */}
      {[
        [0.052, 0, 0.052],
        [-0.052, 0, 0.052],
        [0.052, 0, -0.052],
        [-0.052, 0, -0.052],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.006, 0.34, 0.006]} />
          <meshStandardMaterial metalness={0.55} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * CubeSatView
 * - background: hex string
 * - sunVecBody: [x,y,z] direction in BODY frame
 * - nadirVecBody: [x,y,z] direction in BODY frame
 * - attitudeQuat: optional [x,y,z,w] quaternion to rotate the CubeSat model (BODY wrt scene)
 */
export default function CubeSatView({
  background = "#000",
  sunVecBody = [1, 0, 0],
  nadirVecBody = [0, -1, 0],
  attitudeQuat = null,
}) {
  const q = useMemo(() => {
    if (!attitudeQuat || attitudeQuat.length !== 4) return null;
    const [x, y, z, w] = attitudeQuat;
    return new THREE.Quaternion(x, y, z, w);
  }, [attitudeQuat]);

  return (
    <div style={{ height: 420, borderRadius: 10, overflow: "hidden", border: "1px solid #222" }}>
      <Canvas camera={{ position: [0.25, 0.15, 0.25], fov: 45 }}>
        <color attach="background" args={[background]} />

        {/* Lights */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 2]} intensity={1.2} />

        {/* Scene group (attitude applied here if provided) */}
        <group quaternion={q ?? undefined}>
          {/* CubeSat */}
          <CubeSatModel />

          {/* Axes triad at body origin */}
          <AxesTriad size={0.18} />

          {/* Sun + Nadir vectors (in body frame) */}
          <VectorArrow dir={sunVecBody} length={0.28} color="#ffd60a" />
          <VectorArrow dir={nadirVecBody} length={0.28} color="#0a84ff" />
        </group>

        <OrbitControls enablePan={false} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
