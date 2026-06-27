import { describe, expect, it } from "vitest";
import { dateKeyInQuebec, formatDate } from "@/lib/format";

describe("formatage des dates en heure du Québec", () => {
  it("affiche les timestamps UTC en heure America/Toronto", () => {
    expect(formatDate("2026-07-10T13:30:00.000Z", "HH:mm")).toBe("09:30");
  });

  it("conserve les dates sans heure sans décalage de fuseau", () => {
    expect(formatDate("2026-07-10", "yyyy-MM-dd")).toBe("2026-07-10");
    expect(dateKeyInQuebec("2026-07-10")).toBe("2026-07-10");
  });

  it("calcule la journée locale d'un timestamp proche de minuit UTC", () => {
    expect(dateKeyInQuebec("2026-07-11T02:30:00.000Z")).toBe("2026-07-10");
  });
});
