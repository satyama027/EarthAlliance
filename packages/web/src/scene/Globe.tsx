import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

export function Globe({ radius = 2 }: { radius?: number }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05; // slow auto-rotation
  });
  return (
    <group>
      {/* Ocean sphere (stylized placeholder; swap in an Earth texture later) */}
      <mesh ref={ref}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial color="#1c4e80" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Atmosphere glow shell */}
      <mesh scale={1.08}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color="#4dabf7" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}
