import { describe, expect, it } from "vitest";
import { formatInTimeZone } from "date-fns-tz";
import { resolveJobSchedule } from "@/lib/job-schedule";

describe("horaire des travaux", () => {
  it("accepte une date sans heures", () => {
    const result = resolveJobSchedule("2026-07-10", "", "");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.timeIsSet).toBe(false);
    expect(formatInTimeZone(result.start, "America/Toronto", "yyyy-MM-dd HH:mm")).toBe("2026-07-10 12:00");
    expect(formatInTimeZone(result.end, "America/Toronto", "yyyy-MM-dd HH:mm")).toBe("2026-07-10 13:00");
  });

  it("utilise la même date pour les heures de début et de fin", () => {
    const result = resolveJobSchedule("2026-07-10", "09:30", "11:15");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.timeIsSet).toBe(true);
    expect(formatInTimeZone(result.start, "America/Toronto", "yyyy-MM-dd HH:mm")).toBe("2026-07-10 09:30");
    expect(formatInTimeZone(result.end, "America/Toronto", "yyyy-MM-dd HH:mm")).toBe("2026-07-10 11:15");
  });

  it("exige les deux heures ensemble", () => {
    expect(resolveJobSchedule("2026-07-10", "09:30", "")).toMatchObject({ ok: false });
  });

  it("refuse une fin avant le début", () => {
    expect(resolveJobSchedule("2026-07-10", "12:00", "09:00")).toMatchObject({ ok: false });
  });
});
