import { describe, expect, it } from "vitest";
import { mapCoordinateFromDatabase, mapRouteFromDatabase, parseMapCoordinates } from "@/lib/map-geometry";

describe("géométrie de la carte de prospection", () => {
  it("accepte un tracé valide de Gatineau", () => {
    expect(parseMapCoordinates("[[45.47,-75.70],[45.48,-75.69]]", 2)).toEqual({
      ok: true,
      coordinates: [[45.47, -75.7], [45.48, -75.69]],
    });
  });

  it("refuse les coordonnées hors limites et les tracés trop courts", () => {
    expect(parseMapCoordinates("[]", 2)).toEqual({ ok: true, coordinates: null });
    expect(parseMapCoordinates("[[95,-75.7]]")).toEqual({ ok: false, coordinates: null });
    expect(parseMapCoordinates("[[45.47,-75.7]]", 2)).toEqual({ ok: false, coordinates: null });
  });

  it("convertit prudemment les coordonnées de Supabase", () => {
    expect(mapCoordinateFromDatabase(45.47, -75.7)).toEqual([45.47, -75.7]);
    expect(mapCoordinateFromDatabase(null, null)).toBeNull();
    expect(mapRouteFromDatabase([[45.47, -75.7], [45.48, -75.69]])).toHaveLength(2);
    expect(mapRouteFromDatabase([[999, 999]])).toEqual([]);
  });
});
