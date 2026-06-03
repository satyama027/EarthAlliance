import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { Region } from '@earth-alliance/engine';
import { Globe } from './Globe.js';
import { RegionMarker } from './RegionMarker.js';

interface EarthSceneProps {
  regions: Region[];
  metricOf(region: Region): number;   // which metric colors the markers
  selectedRegionId: string | null;
  onSelectRegion(id: string): void;
}

const RADIUS = 2;

export function EarthScene({ regions, metricOf, selectedRegionId, onSelectRegion }: EarthSceneProps) {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <Stars radius={50} depth={50} count={2000} factor={4} fade />
      <Globe radius={RADIUS} />
      {regions.map((r) => (
        <RegionMarker
          key={r.id}
          region={r}
          radius={RADIUS}
          metric={metricOf(r)}
          selected={selectedRegionId === r.id}
          onSelect={onSelectRegion}
        />
      ))}
      <OrbitControls enablePan={false} minDistance={3.5} maxDistance={10} />
    </Canvas>
  );
}
