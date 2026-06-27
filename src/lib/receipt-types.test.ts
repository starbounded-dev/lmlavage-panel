import { describe, expect, it } from "vitest";
import { resolveReceiptFileType } from "@/lib/receipt-types";

describe("types de reçus", () => {
  it("accepte les photos iPhone HEIC", () => {
    const file = new File(["receipt"], "facture.heic", { type: "image/heic" });

    expect(resolveReceiptFileType(file)).toEqual({ contentType: "image/heic", extension: "heic" });
  });

  it("déduit le type depuis l'extension quand le navigateur ne fournit pas de MIME", () => {
    const file = new File(["receipt"], "facture.webp", { type: "" });

    expect(resolveReceiptFileType(file)).toEqual({ contentType: "image/webp", extension: "webp" });
  });

  it("normalise jpeg vers jpg", () => {
    const file = new File(["receipt"], "facture.jpeg", { type: "" });

    expect(resolveReceiptFileType(file)).toEqual({ contentType: "image/jpeg", extension: "jpg" });
  });
});
