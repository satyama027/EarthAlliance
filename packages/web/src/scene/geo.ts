/** Convert latitude/longitude (degrees) to a point on a sphere of `radius`.
 *  Lat 0/Lon 0 → +Z; north pole → +Y. Returns [x, y, z]. */
export function latLonToVector3(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180); // polar angle from +Y
  const theta = lon * (Math.PI / 180);      // azimuth, 0 → +Z
  const x = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.cos(theta);
  return [x, y, z];
}
