import type { Position } from "geojson";

export function polygonIntersects(polygonCoords: Position[][], selection: Position[]): boolean {
  const outerRing = polygonCoords[0] ?? [];
  if (outerRing.length === 0 || selection.length < 4) return false;
  for (const point of outerRing) {
    if (pointInPolygon(point, selection)) return true;
  }
  for (const point of selection) {
    if (pointInPolygon(point, outerRing)) return true;
  }
  return ringsIntersect(outerRing, selection);
}

export function closePolygon(points: Position[]): Position[] {
  if (points.length === 0) return [];
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points;
  return [...points, first];
}

export function pointInPolygon(point: Position, ring: Position[]): boolean {
  for (let idx = 0; idx < ring.length - 1; idx += 1) {
    if (pointOnSegment(point, ring[idx], ring[idx + 1])) {
      return true;
    }
  }
  let inside = false;
  for (let idx = 0, jdx = ring.length - 1; idx < ring.length; jdx = idx, idx += 1) {
    const xi = ring[idx][0];
    const yi = ring[idx][1];
    const xj = ring[jdx][0];
    const yj = ring[jdx][1];
    const intersects = yi > point[1] !== yj > point[1]
      && point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function buildCirclePolygon(center: Position, radiusKm: number, steps = 64): Position[] {
  const points: Position[] = [];
  for (let idx = 0; idx < steps; idx += 1) {
    const bearing = (idx / steps) * Math.PI * 2;
    points.push(destinationPoint(center, radiusKm, bearing));
  }
  return closePolygon(points);
}

export function polygonAreaSqKm(ring: Position[]): number {
  if (ring.length < 4) return 0;
  const earthRadiusKm = 6371.0088;
  const meanLatRadians = degreesToRadians(
    ring.slice(0, -1).reduce((sum, point) => sum + point[1], 0) / Math.max(ring.length - 1, 1)
  );
  const projected = ring.map(([lng, lat]) => {
    const x = earthRadiusKm * degreesToRadians(lng) * Math.cos(meanLatRadians);
    const y = earthRadiusKm * degreesToRadians(lat);
    return [x, y] as const;
  });
  let area = 0;
  for (let idx = 0; idx < projected.length - 1; idx += 1) {
    const [x1, y1] = projected[idx];
    const [x2, y2] = projected[idx + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

export function distanceKm(a: Position, b: Position): number {
  const earthRadiusKm = 6371.0088;
  const lat1 = degreesToRadians(a[1]);
  const lat2 = degreesToRadians(b[1]);
  const dLat = degreesToRadians(b[1] - a[1]);
  const dLng = degreesToRadians(b[0] - a[0]);
  const haversine = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function ringsIntersect(a: Position[], b: Position[]): boolean {
  for (let idx = 0; idx < a.length - 1; idx += 1) {
    const a1 = a[idx];
    const a2 = a[idx + 1];
    for (let jdx = 0; jdx < b.length - 1; jdx += 1) {
      const b1 = b[jdx];
      const b2 = b[jdx + 1];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function segmentsIntersect(a1: Position, a2: Position, b1: Position, b2: Position): boolean {
  const d1 = direction(b1, b2, a1);
  const d2 = direction(b1, b2, a2);
  const d3 = direction(a1, a2, b1);
  const d4 = direction(a1, a2, b2);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))
    && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  if (d1 === 0 && pointOnSegment(a1, b1, b2)) return true;
  if (d2 === 0 && pointOnSegment(a2, b1, b2)) return true;
  if (d3 === 0 && pointOnSegment(b1, a1, a2)) return true;
  if (d4 === 0 && pointOnSegment(b2, a1, a2)) return true;
  return false;
}

function direction(a: Position, b: Position, c: Position): number {
  return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
}

function pointOnSegment(point: Position, start: Position, end: Position): boolean {
  const epsilon = 1e-12;
  if (Math.abs(direction(start, end, point)) > epsilon) {
    return false;
  }
  return point[0] <= Math.max(start[0], end[0]) + epsilon
    && point[0] >= Math.min(start[0], end[0]) - epsilon
    && point[1] <= Math.max(start[1], end[1]) + epsilon
    && point[1] >= Math.min(start[1], end[1]) - epsilon;
}

function destinationPoint(origin: Position, distanceKmValue: number, bearingRadians: number): Position {
  const earthRadiusKm = 6371.0088;
  const angularDistance = distanceKmValue / earthRadiusKm;
  const lat1 = degreesToRadians(origin[1]);
  const lon1 = degreesToRadians(origin[0]);
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAngular = Math.sin(angularDistance);
  const cosAngular = Math.cos(angularDistance);
  const lat2 = Math.asin(sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(bearingRadians));
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearingRadians) * sinAngular * cosLat1,
    cosAngular - sinLat1 * Math.sin(lat2)
  );
  return [radiansToDegrees(lon2), radiansToDegrees(lat2)];
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}
