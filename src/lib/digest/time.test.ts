import { describe, expect, it } from "vitest";
import { getQuebecClock, quebecDayBounds } from "@/lib/digest/time";

describe("heure du Québec", () => {
  it("identifie 8 h pendant l’heure avancée", () => {
    expect(getQuebecClock(new Date("2026-06-18T12:00:00Z"))).toEqual({ date: "2026-06-18", hour: 8 });
  });

  it("identifie 8 h pendant l’heure normale", () => {
    expect(getQuebecClock(new Date("2026-12-18T13:00:00Z"))).toEqual({ date: "2026-12-18", hour: 8 });
  });

  it("produit des bornes UTC qui suivent les changements d’heure", () => {
    expect(quebecDayBounds("2026-06-18").start).toBe("2026-06-18T04:00:00.000Z");
    expect(quebecDayBounds("2026-12-18").start).toBe("2026-12-18T05:00:00.000Z");
  });
});
