import { useState } from 'react';
import type { Region } from '@earth-alliance/engine';
import { latLonToVector3 } from './geo.js';
import { metricColor } from './metricColor.js';

interface RegionMarkerProps {
  region: Region;
  radius: number;
  metric: number;          // 0–100 value driving the marker color
  selected: boolean;
  onSelect(id: string): void;
}

export function RegionMarker({ region, radius, metric, selected, onSelect }: RegionMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const pos = latLonToVector3(region.lat, region.lon, radius * 1.02);
  return (
    <mesh
      position={pos}
      onClick={(e) => { e.stopPropagation(); onSelect(region.id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      scale={selected || hovered ? 1.6 : 1}
    >
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshStandardMaterial color={metricColor(metric)} emissive={metricColor(metric)} emissiveIntensity={selected ? 0.8 : 0.3} />
    </mesh>
  );
}
