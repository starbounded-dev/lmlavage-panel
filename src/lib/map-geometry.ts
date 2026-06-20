export type MapCoordinate = [latitude: number, longitude: number];

export type ParsedMapCoordinates =
  | { ok: true; coordinates: MapCoordinate[] | null }
  | { ok: false; coordinates: null };

const MAX_ROUTE_POINTS = 250;

function isCoordinate(value: unknown): value is MapCoordinate {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    value[0] >= -90 &&
    value[0] <= 90 &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]) &&
    value[1] >= -180 &&
    value[1] <= 180
  );
}

export function parseMapCoordinates(value: string, minimumPoints = 1): ParsedMapCoordinates {
  if (!value.trim()) return { ok: true, coordinates: null };

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length === 0) {
      return { ok: true, coordinates: null };
    }
    if (
      !Array.isArray(parsed) ||
      parsed.length < minimumPoints ||
      parsed.length > MAX_ROUTE_POINTS ||
      !parsed.every(isCoordinate)
    ) {
      return { ok: false, coordinates: null };
    }
    return { ok: true, coordinates: parsed };
  } catch {
    return { ok: false, coordinates: null };
  }
}

export function mapCoordinateFromDatabase(latitude: unknown, longitude: unknown): MapCoordinate | null {
  const coordinate: unknown = [Number(latitude), Number(longitude)];
  if (latitude === null || longitude === null || !isCoordinate(coordinate)) return null;
  return coordinate;
}

export function mapRouteFromDatabase(value: unknown): MapCoordinate[] {
  if (!Array.isArray(value) || !value.every(isCoordinate)) return [];
  return value.slice(0, MAX_ROUTE_POINTS);
}
