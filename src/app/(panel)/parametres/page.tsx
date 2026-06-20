import type { Metadata } from "next";
import Link from "next/link";
import { CalendarSyncIcon, FileSpreadsheetIcon, LockKeyholeIcon, MailIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { AccountManager } from "@/components/account-manager";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAppData } from "@/lib/repository";
import { getAccountManagementData } from "@/lib/accounts";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const [data, accountManagement] = await Promise.all([getAppData(), getAccountManagementData()]);
  const isDemo = data.business.id === "demo-business";
  return (
    <>
      <PageHeader title="Paramètres" description="Entreprise, taxes, équipe, rappels et intégrations." />
      {isDemo ? (
        <Alert className="mb-4">
          <ShieldCheckIcon />
          <AlertTitle>Mode démonstration</AlertTitle>
          <AlertDescription>Ajoutez les variables Supabase, Google et Resend pour activer les données persistantes et les intégrations.</AlertDescription>
        </Alert>
      ) : null}
      <Tabs defaultValue="business">
        <TabsList className="mb-4 flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="business">Entreprise</TabsTrigger>
          <TabsTrigger value="team">Équipe</TabsTrigger>
          <TabsTrigger value="integrations">Intégrations</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Profil de l’entreprise</CardTitle><CardDescription>Valeurs utilisées dans l’application et les rappels.</CardDescription></CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field><FieldLabel htmlFor="business-name">Nom</FieldLabel><Input id="business-name" defaultValue={data.business.name} /></Field>
                  <Field><FieldLabel htmlFor="business-email">Courriel des rappels</FieldLabel><Input id="business-email" type="email" defaultValue={data.business.digestEmail ?? ""} /></Field>
                  <Field><FieldLabel htmlFor="business-timezone">Fuseau horaire</FieldLabel><Input id="business-timezone" value={data.business.timezone} readOnly /></Field>
                </FieldGroup>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Taxes du Québec</CardTitle><CardDescription>Désactivées par défaut jusqu’à l’inscription de l’entreprise.</CardDescription></CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field orientation="horizontal"><div><FieldTitle>TPS</FieldTitle><p className="text-xs text-muted-foreground">Taux configuré : {(data.business.gstRate * 100).toFixed(3)}%</p></div><Switch defaultChecked={data.business.gstEnabled} aria-label="Activer la TPS" /></Field>
                <Separator />
                <Field orientation="horizontal"><div><FieldTitle>TVQ</FieldTitle><p className="text-xs text-muted-foreground">Taux configuré : {(data.business.qstRate * 100).toFixed(3)}%</p></div><Switch defaultChecked={data.business.qstEnabled} aria-label="Activer la TVQ" /></Field>
                <Separator />
                <Field orientation="horizontal"><div><FieldTitle>Rappel de retour</FieldTitle><p className="text-xs text-muted-foreground">Suggérer automatiquement {data.business.defaultFollowupMonths} mois.</p></div><Switch defaultChecked aria-label="Activer les rappels de retour" /></Field>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="flex flex-col gap-4">
            <Card>
            <CardHeader><CardTitle>Travailleurs</CardTitle><CardDescription>Ils peuvent être assignés aux travaux sans disposer d’un compte.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {data.workers.map((worker) => (
                <div key={worker.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary"><UsersIcon className="size-4" /></div><span className="font-medium">{worker.name}</span></div>
                  <Badge variant={worker.active ? "default" : "secondary"}>{worker.active ? "Actif" : "Inactif"}</Badge>
                </div>
              ))}
            </CardContent>
            </Card>
            <AccountManager accounts={accountManagement.accounts} canManage={accountManagement.canManage} isDemo={isDemo} />
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarSyncIcon className="size-5 text-primary" />Google Calendar</CardTitle><CardDescription>Synchronisation à sens unique depuis le panneau.</CardDescription></CardHeader>
              <CardContent className="flex flex-col gap-4"><p className="text-sm text-muted-foreground">Les événements contiennent le client, l’adresse, le service et les travailleurs, sans information financière.</p><Button render={<a href="/api/google/connect" />} nativeButton={false} disabled={isDemo}>Connecter Google Calendar</Button></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MailIcon className="size-5 text-primary" />Résumé quotidien</CardTitle><CardDescription>Envoi chaque jour à 8 h, heure du Québec.</CardDescription></CardHeader>
              <CardContent><Field orientation="horizontal"><div><FieldTitle>Courriel quotidien</FieldTitle><p className="text-xs text-muted-foreground">Travaux du jour, rappels et paiements en attente.</p></div><Switch defaultChecked aria-label="Activer le résumé quotidien" /></Field></CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheetIcon className="size-5 text-primary" />Importation Excel</CardTitle><CardDescription>Prévisualisez et importez le classeur initial sans créer de doublons.</CardDescription></CardHeader>
              <CardContent><Button render={<Link href="/import-excel" />} nativeButton={false} variant="outline"><FileSpreadsheetIcon data-icon="inline-start" />Ouvrir l’importateur</Button></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><LockKeyholeIcon className="size-5 text-primary" />Accès au panneau</CardTitle><CardDescription>Le propriétaire crée les comptes administrateurs; aucune inscription publique.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground"><p>Les administrateurs accèdent aux opérations, mais seul le propriétaire peut gérer les comptes.</p><p>Les pages, actions serveur et politiques RLS valident également l’appartenance à l’entreprise.</p></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
