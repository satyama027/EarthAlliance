import { useEffect, useRef } from 'react';
import rawSvg from '../assets/world-map.svg?raw';

interface WorldMapProps {
  selectedRegionId: string | null;
  onSelectRegion(id: string): void;
}

/**
 * Flat, static world map of the 10 regions. Renders the pre-baked
 * `world-map.svg` asset (real Natural Earth geometry, region colors, partition
 * lines all baked in by `scripts/generate-map.mjs`) and wires up click-to-select
 * + selection highlighting. No D3/TopoJSON at runtime — the SVG is the source.
 */
export function WorldMap({ selectedRegionId, onSelectRegion }: WorldMapProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Wire click-to-select on every region path once the SVG is in the DOM.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const offs: Array<() => void> = [];
    root.querySelectorAll<SVGElement>('[data-region]').forEach((el) => {
      const id = el.getAttribute('data-region');
      if (!id) return;
      const onClick = () => onSelectRegion(id);
      el.addEventListener('click', onClick);
      offs.push(() => el.removeEventListener('click', onClick));
    });
    return () => offs.forEach((off) => off());
  }, [onSelectRegion]);

  // Reflect the current selection: dim every region except the selected one.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<SVGElement>('[data-region]').forEach((el) => {
      el.classList.toggle('dim', selectedRegionId != null && el.getAttribute('data-region') !== selectedRegionId);
    });
  }, [selectedRegionId]);

  return (
    <div
      ref={ref}
      data-testid="world-map"
      style={{ width: '100%', height: '100%' }}
      dangerouslySetInnerHTML={{ __html: rawSvg }}
    />
  );
}
