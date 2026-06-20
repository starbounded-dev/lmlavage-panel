"use client";

import { useTransition, type FormEvent } from "react";
import { ShieldCheckIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createAccountAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { BusinessAccount } from "@/lib/accounts";

type AccountManagerProps = {
  accounts: BusinessAccount[];
  canManage: boolean;
  isDemo: boolean;
};

export function AccountManager({ accounts, canManage, isDemo }: AccountManagerProps) {
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        const result = await createAccountAction(formData);
        if (result.ok) {
          toast.success(result.message);
          form.reset();
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("Impossible de créer le compte. Vérifiez votre accès et réessayez.");
      }
    });
  }

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comptes du panneau</CardTitle>
          <CardDescription>Seul le compte propriétaire peut créer et consulter les autres comptes.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlusIcon className="size-5 text-primary" />Créer un compte</CardTitle>
          <CardDescription>Le nouveau compte aura accès aux opérations de LM, mais ne pourra pas gérer les comptes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="account-email">Courriel</FieldLabel>
                <Input id="account-email" name="email" type="email" autoComplete="email" required disabled={isDemo || pending} />
              </Field>
              <Field>
                <FieldLabel htmlFor="account-password">Mot de passe initial</FieldLabel>
                <Input id="account-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required disabled={isDemo || pending} />
                <FieldDescription>Au moins 12 caractères avec une majuscule, une minuscule et un chiffre. Le mot de passe n’est pas conservé dans le panneau.</FieldDescription>
              </Field>
              <Button type="submit" disabled={isDemo || pending}>
                <UserPlusIcon data-icon="inline-start" />
                {pending ? "Création…" : "Créer le compte"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheckIcon className="size-5 text-primary" />Comptes autorisés</CardTitle>
          <CardDescription>{accounts.length} compte{accounts.length === 1 ? "" : "s"} rattaché{accounts.length === 1 ? "" : "s"} à LM.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Courriel</TableHead><TableHead>Rôle</TableHead><TableHead>Créé</TableHead></TableRow></TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.email}</TableCell>
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
