import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import { useMemo } from "react";

/** Earth radius (km) – scaled down for visualization */
const R_EARTH = 6371;
const SCALE = 1 / 7000; // visualization scale

function Earth({ sunDir = [1, 0.2, 0.4] }) {
  // Load the texture from /public
  const earthMap = useTexture("/textures/earth_day.jpg");

  // Improve texture sampling a bit
  useMemo(() => {
    earthMap.colorSpace = THREE.SRGBColorSpace;
    earthMap.anisotropy = 8;
    earthMap.wrapS = THREE.RepeatWrapping;
    earthMap.wrapT = THREE.ClampToEdgeWrapping;
    earthMap.needsUpdate = true;
  }, [earthMap]);

  // Directional light direction = where the sun is (in scene coords)
  const sun = useMemo(() => {
    const v = new THREE.Vector3(...sunDir);
    return v.length() < 1e-6 ? new THREE.Vector3(1, 0, 0) : v.normalize();
  }, [sunDir]);

  return (
    <group>
      {/* Earth sphere with texture */}
      <mesh>
        <sphereGeometry args={[R_EARTH * SCALE, 96, 96]} />
        <meshStandardMaterial
          map={earthMap}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Optional: faint atmosphere glow (cheap) */}
      <mesh>
        <sphereGeometry args={[R_EARTH * SCALE * 1.01, 64, 64]} />
        <meshBasicMaterial
          transparent
          opacity={0.06}
          color="#6fb6ff"
          side={THREE.BackSide}
        />
      </mesh>

      {/* Sun light: this is what creates the terminator */}
      <directionalLight
        position={[sun.x * 5, sun.y * 5, sun.z * 5]}
        intensity={1.25}
      />
    </group>
  );
}

function OrbitTrack({ aKm = 6771, e = 0.0, iDeg = 51.6 }) {
  const points = useMemo(() => {
    const pts = [];
    const inc = THREE.MathUtils.degToRad(iDeg);

    for (let t = 0; t <= 360; t += 2) {
      const nu = THREE.MathUtils.degToRad(t);
      const r = (aKm * (1 - e * e)) / (1 + e * Math.cos(nu));

      // Orbital plane ellipse
      let x = r * Math.cos(nu);
      let z = r * Math.sin(nu);
      let y = 0;

      // Inclination rotation about X
      const c = Math.cos(inc);
      const s = Math.sin(inc);
      const y2 = y * c - z * s;
      const z2 = y * s + z * c;

      pts.push(new THREE.Vector3(x * SCALE, y2 * SCALE, z2 * SCALE));
    }
    return pts;
  }, [aKm, e, iDeg]);

  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <line geometry={geom}>
      <lineBasicMaterial color="#2eccff" />
    </line>
  );
}

function SatelliteMarker({ metS = 0, periodS = 5400, aKm = 6771, iDeg = 51.6 }) {
  // Simple circular motion in an inclined plane
  const theta = ((metS % periodS) / periodS) * Math.PI * 2;
  const r = aKm * SCALE;

  const inc = THREE.MathUtils.degToRad(iDeg);
  const x = r * Math.cos(theta);
  const z0 = r * Math.sin(theta);
  const y = -z0 * Math.sin(inc);
  const z = z0 * Math.cos(inc);

  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[0.045, 16, 16]} />
      <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.2} />
    </mesh>
  );
}

export default function OrbitView({
  metS = 0,
  semiMajorKm = 6771,     // ~400 km LEO
  eccentricity = 0.001,
  inclinationDeg = 51.6,
  // Sun direction in scene coords (change to move terminator)
  sunDir = [1, 0.2, 0.4],
}) {
  return (
    <div style={{ height: 420, borderRadius: 10, overflow: "hidden", border: "1px solid #222" }}>
      <Canvas camera={{ position: [0, 2.2, 2.2], fov: 45 }}>
        <color attach="background" args={["#000"]} />

        {/* Keep ambient LOW so night side is dark -> clear terminator */}
        <ambientLight intensity={0.08} />

        {/* Optional stars (keep modest to avoid GPU spikes) */}
        <Stars radius={5} depth={40} count={1200} factor={3} fade />

        <Earth sunDir={sunDir} />

        <OrbitTrack aKm={semiMajorKm} e={eccentricity} iDeg={inclinationDeg} />

        <SatelliteMarker
          metS={metS}
          aKm={semiMajorKm}
          iDeg={inclinationDeg}
        />

        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}
