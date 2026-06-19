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
});
