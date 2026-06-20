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
  await page.getByRole("button", { name: "Nouveau client" }).click();
  await expect(page.getByLabel("Numéro client")).toBeVisible();
  await expect(page.getByLabel("Nom (facultatif)")).not.toHaveAttribute("required");
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("button", { name: "Modifier", exact: true }).first()).toBeVisible();

  await page.goto("/travaux");
  await page.getByRole("button", { name: "Nouveau travail" }).click();
  await expect(page.getByLabel("Date du travail")).toHaveAttribute("required", "");
  await expect(page.getByLabel("Heure de début (facultative)")).not.toHaveAttribute("required");
  await expect(page.getByLabel("Heure de fin (facultative)")).not.toHaveAttribute("required");
  await expect(page.getByLabel("Vente faite par")).toBeVisible();
  await expect(page.getByLabel("Vente faite par").locator("option")).toContainText(["Choisir le vendeur", "Alexis", "Guillaume", "P-O"]);
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("button", { name: /Modifier le travail de/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Supprimer le travail de/ }).first()).toBeVisible();

  await page.goto("/prospection");
  await page.getByRole("button", { name: "Ajouter une rue" }).click();
  await expect(page.getByLabel("Résultat").getByRole("option", { name: "Clients obtenus et à revenir", exact: true })).toBeAttached();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("button", { name: /Modifier rue/ }).first()).toBeVisible();

  await page.goto("/depenses");
  await expect(page.getByRole("button", { name: /Modifier la dépense/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Nouvelle dépense" }).click();
  await expect(page.getByLabel("Type de montant").getByRole("option", { name: "Sous-total avant taxes", exact: true })).toBeAttached();
  await expect(page.getByLabel("Type de montant").getByRole("option", { name: "Total taxes incluses", exact: true })).toBeAttached();
  await page.getByLabel("Type de montant").selectOption("total");
  await expect(page.getByLabel("Total payé")).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();

  await page.goto("/repartition");
  await expect(page.getByRole("heading", { name: "Répartition" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Vente Alexis/Guillaume" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Vente P-O" })).toBeVisible();
  const poRow = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "P-O", exact: true }) });
  await expect(poRow).toContainText("0%");
  await expect(poRow).toContainText("15%");

  await page.goto("/parametres");
  await page.getByRole("tab", { name: "Équipe" }).click();
  await expect(page.getByText("Créer un compte pour un travailleur", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Travailleur")).toBeDisabled();
  await expect(page.getByLabel("Courriel")).toBeDisabled();
  await expect(page.getByLabel("Mot de passe initial")).toBeDisabled();
  await expect(page.getByText("Comptes autorisés", { exact: true })).toBeVisible();
});
