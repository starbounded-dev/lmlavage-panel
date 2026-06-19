# LM Lavage de Vitres — panneau d’opérations

Application privée en français pour gérer les clients et leurs propriétés, les travaux, le calendrier, les dépenses, la prospection, les pourboires et la répartition des revenus.

## Démarrage local

Prérequis : Node.js 20.9 ou plus récent.

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Sans variables Supabase, l’application démarre en mode démonstration avec les données rapprochées du classeur initial. Ouvrez `http://localhost:3000`.

## Configuration de production

1. Créez un projet Supabase et exécutez `supabase/migrations/0001_initial.sql`.
2. Désactivez l’inscription publique dans Supabase Auth, puis créez le compte propriétaire par courriel et mot de passe.
3. Exécutez dans l’éditeur SQL :

```sql
select public.provision_lm_owner('UUID_DU_COMPTE', 'courriel@exemple.ca');
```

4. Configurez les variables décrites dans `.env.example`. Générez la clé Google avec `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`.
5. Dans Google Cloud, ajoutez l’URL de rappel `https://VOTRE_DOMAINE/api/google/callback` et activez Google Calendar API.
6. Vérifiez le domaine d’envoi Resend et fournissez `RESEND_FROM_EMAIL`.
7. Déployez sur Vercel. Les deux déclencheurs UTC dans `vercel.json` couvrent l’heure normale et avancée; l’endpoint envoie uniquement lorsqu’il est 8 h à Gatineau.

L’import Excel se trouve dans **Paramètres → Intégrations**. Il affiche un aperçu, utilise l’empreinte SHA-256 du classeur et effectue l’import dans une transaction Supabase.

## Vérification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

Les reçus sont privés dans le compartiment Supabase `receipts`. Les jetons Google sont chiffrés en AES-256-GCM. Toutes les tables métier appliquent des politiques RLS fondées sur l’appartenance à l’entreprise.
