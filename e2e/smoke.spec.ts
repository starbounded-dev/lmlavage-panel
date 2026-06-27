import { expect, test } from "@playwright/test";

test("le tableau de bord et la navigation principale sont disponibles", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/tableau-de-bord");
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
  await expect(page.getByRole("main").getByText("Total encaissé")).toBeVisible();

  const themeToggle = page.locator('button[aria-label="Changer le thème clair ou sombre"]:visible');
  await expect(themeToggle).toHaveCount(1);
  await themeToggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  const visibleClientsLink = page.locator('a[href="/clients"]:visible').first();
  if ((await visibleClientsLink.count()) > 0) {
    await visibleClientsLink.click();
  } else {
    await page.goto("/clients");
  }
  await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
  await page.getByRole("button", { name: "Nouveau client" }).click();
  await expect(page.getByLabel("Numéro client")).toBeVisible();
  await expect(page.getByLabel("Nom (facultatif)")).not.toHaveAttribute("required");
  await expect(page.getByLabel("Carte pour placer la maison cliente")).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("button", { name: "Modifier", exact: true }).first()).toBeVisible();

  await page.goto("/travaux");
  await page.getByRole("button", { name: "Nouveau travail" }).click();
  await expect(page.getByLabel("Date du travail")).toHaveAttribute("required", "");
  await expect(page.getByLabel("Heure de début (facultative)")).not.toHaveAttribute("required");
  await expect(page.getByLabel("Heure de fin (facultative)")).not.toHaveAttribute("required");
  await expect(page.getByLabel("Pourboire (séparé)")).toHaveValue("0");
  await expect(page.getByLabel("Vente faite par")).toBeVisible();
  await expect(page.getByLabel("Vente faite par").locator("option")).toContainText(["Alexis", "Guillaume", "P-O", "Split Alexis + Guillaume"]);
  await expect(page.getByLabel("Nettoyé par")).toHaveValue(/.+/);
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("columnheader", { name: "Nettoyé par" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Total travail" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Pourboire" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Modifier le travail de/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Supprimer le travail de/ }).first()).toBeVisible();

  await page.goto("/prospection");
  await expect(page.getByText("Carte de Gatineau", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Carte des secteurs prospectés à Gatineau")).toBeVisible();
  await expect(page.getByText(/Une page séparée pour le porte-à-porte/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Mode terrain mobile" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Portion" })).toBeVisible();
  await page.getByRole("button", { name: "Ajouter une rue" }).click();
  await expect(page.getByLabel("Première maison (facultative)")).not.toHaveAttribute("required");
  await expect(page.getByLabel("Dernière maison (facultative)")).not.toHaveAttribute("required");
  await expect(page.getByLabel("Carte pour tracer la portion visitée")).toBeVisible();
  await expect(page.getByLabel("Date de visite (facultative)")).not.toHaveAttribute("required");
  await expect(page.getByLabel("Date de retour (facultative)")).not.toHaveAttribute("required");
  await expect(page.getByLabel("Résultat").getByRole("option", { name: "Clients obtenus et à revenir", exact: true })).toBeAttached();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("button", { name: /Modifier rue/ }).first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Terrain", exact: true }).click();
  await expect(page).toHaveURL(/\/prospection-mobile$/);
  await expect(page.getByRole("heading", { name: "Prospection mobile" })).toBeVisible();
  await expect(page.getByText("Mode terrain mobile", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ajouter maison" })).toBeVisible();
  await expect(page.getByRole("button", { name: "GPS", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto("/depenses");
  await expect(page.getByRole("button", { name: /Modifier la dépense/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Nouvelle dépense" }).click();
  await expect(page.getByLabel("Type de montant").getByRole("option", { name: "Sous-total avant taxes", exact: true })).toBeAttached();
  await expect(page.getByLabel("Type de montant").getByRole("option", { name: "Total taxes incluses", exact: true })).toBeAttached();
  await expect(page.getByLabel("Acheté par")).toBeVisible();
  await page.getByLabel("Type de montant").selectOption("total");
  await expect(page.getByLabel("Total payé")).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();

  await page.goto("/repartition");
  await expect(page.getByRole("heading", { name: "Répartition" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Vente Alexis" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Vente Guillaume" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Vente P-O" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Split A+G" })).toBeVisible();
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
