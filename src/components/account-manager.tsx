"use client";

import { useTransition, type FormEvent } from "react";
import { Link2Icon, ShieldCheckIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { assignWorkerAccountAction, createAccountAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { BusinessAccount } from "@/lib/accounts";
import type { Worker } from "@/types/domain";

type AccountManagerProps = {
  accounts: BusinessAccount[];
  workers: Worker[];
  canManage: boolean;
  isDemo: boolean;
};

export function AccountManager({ accounts, workers, canManage, isDemo }: AccountManagerProps) {
  const [pending, startTransition] = useTransition();
  const unlinkedWorkers = workers.filter((worker) => !worker.userId);
  const unassignedAccounts = accounts.filter((account) => !account.workerId);

  function submit(event: FormEvent<HTMLFormElement>, action: (formData: FormData) => Promise<{ ok: boolean; message: string }>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      try {
        const result = await action(new FormData(form));
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success(result.message);
        form.reset();
      } catch {
        toast.error("Impossible de gérer le compte. Vérifiez votre accès et réessayez.");
      }
    });
  }

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comptes des travailleurs</CardTitle>
          <CardDescription>Seul le propriétaire peut créer ou associer les comptes des travailleurs.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlusIcon className="size-5 text-primary" />Créer un compte pour un travailleur</CardTitle>
          <CardDescription>Le compte aura accès aux opérations, mais seul le propriétaire pourra gérer les accès.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => submit(event, createAccountAction)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="account-worker">Travailleur</FieldLabel>
                <NativeSelect id="account-worker" name="workerId" className="w-full" required disabled={isDemo || pending || unlinkedWorkers.length === 0}>
                  <NativeSelectOption value="">Choisir un travailleur</NativeSelectOption>
                  {unlinkedWorkers.map((worker) => <NativeSelectOption key={worker.id} value={worker.id}>{worker.name}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="account-email">Courriel</FieldLabel>
                <Input id="account-email" name="email" type="email" autoComplete="email" required disabled={isDemo || pending || unlinkedWorkers.length === 0} />
              </Field>
              <Field>
                <FieldLabel htmlFor="account-password">Mot de passe initial</FieldLabel>
                <Input id="account-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required disabled={isDemo || pending || unlinkedWorkers.length === 0} />
                <FieldDescription>Au moins 12 caractères avec une majuscule, une minuscule et un chiffre.</FieldDescription>
              </Field>
              <Button type="submit" disabled={isDemo || pending || unlinkedWorkers.length === 0}>
                <UserPlusIcon data-icon="inline-start" />
                {pending ? "Création…" : "Créer et associer"}
              </Button>
              {unlinkedWorkers.length === 0 ? <p className="text-sm text-muted-foreground">Tous les travailleurs ont déjà un compte.</p> : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Link2Icon className="size-5 text-primary" />Associer un compte existant</CardTitle>
          <CardDescription>Utilisez un compte déjà autorisé qui n’est pas encore lié à un travailleur.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {unlinkedWorkers.map((worker) => (
            <form key={worker.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(8rem,0.6fr)_minmax(12rem,1fr)_auto] sm:items-end" onSubmit={(event) => submit(event, assignWorkerAccountAction)}>
              <input type="hidden" name="workerId" value={worker.id} />
              <div>
                <p className="text-sm font-medium">{worker.name}</p>
                <p className="text-xs text-muted-foreground">Aucun compte</p>
              </div>
              <Field>
                <FieldLabel htmlFor={`existing-account-${worker.id}`}>Compte existant</FieldLabel>
                <NativeSelect id={`existing-account-${worker.id}`} name="userId" className="w-full" required disabled={isDemo || pending || unassignedAccounts.length === 0}>
                  <NativeSelectOption value="">Choisir un compte</NativeSelectOption>
                  {unassignedAccounts.map((account) => <NativeSelectOption key={account.id} value={account.id}>{account.email}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
              <Button type="submit" variant="outline" disabled={isDemo || pending || unassignedAccounts.length === 0}>Associer</Button>
            </form>
          ))}
          {unlinkedWorkers.length === 0 ? <p className="text-sm text-muted-foreground">Aucune association en attente.</p> : null}
          {unlinkedWorkers.length > 0 && unassignedAccounts.length === 0 ? <p className="text-sm text-muted-foreground">Aucun compte existant libre. Créez-en un avec le formulaire voisin.</p> : null}
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheckIcon className="size-5 text-primary" />Comptes autorisés</CardTitle>
          <CardDescription>{accounts.length} compte{accounts.length === 1 ? "" : "s"} rattaché{accounts.length === 1 ? "" : "s"} à LM.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Courriel</TableHead><TableHead>Travailleur</TableHead><TableHead>Rôle</TableHead><TableHead>Créé</TableHead></TableRow></TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.email}</TableCell>
                  <TableCell>{account.workerName ?? <span className="text-muted-foreground">Non associé</span>}</TableCell>
                  <TableCell><Badge variant={account.role === "owner" ? "default" : "secondary"}>{account.role === "owner" ? "Propriétaire" : "Administrateur"}</Badge></TableCell>
                  <TableCell>{formatDate(account.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
