import { expect, test } from "@playwright/test";

test("le tableau de bord et la navigation principale sont disponibles", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/tableau-de-bord");
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
  await expect(page.getByText("Total encaissé")).toBeVisible();

  const themeToggle = page.locator('button[aria-label="Changer le thème clair ou sombre"]:visible');
  await expect(themeToggle).toHaveCount(1);
  await themeToggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.locator('a[href="/clients"]:visible').click();
  await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();

  await page.goto("/travaux");
  await page.getByRole("button", { name: "Nouveau travail" }).click();
  await expect(page.getByLabel("Vente faite par")).toBeVisible();
  await expect(page.getByLabel("Vente faite par").locator("option")).toContainText(["Choisir le vendeur", "Alexis", "Guillaume", "P-O"]);

  await page.goto("/repartition");
  await expect(page.getByRole("heading", { name: "Répartition" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Vente Alexis/Guillaume" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Vente P-O" })).toBeVisible();
  const poRow = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "P-O", exact: true }) });
  await expect(poRow).toContainText("0%");
  await expect(poRow).toContainText("15%");
});
