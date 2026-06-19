import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { KeyRoundIcon, ShieldCheckIcon } from "lucide-react";
import { signInAction } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const [auth, params] = await Promise.all([getAuthContext(), searchParams]);
  if (auth && !auth.isDemo) redirect("/tableau-de-bord");
  const isDemo = auth?.isDemo ?? false;

  return (
    <main className="grid min-h-svh place-items-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Image src="/lm-logo.png" alt="LM Lavage de Vitres" width={220} height={180} className="h-auto w-48" priority /></div>
        <Card>
          <CardHeader className="text-center"><CardTitle className="text-xl">Espace propriétaire</CardTitle><CardDescription>Connectez-vous pour gérer les opérations de l’entreprise.</CardDescription></CardHeader>
          <CardContent>
            {params.erreur ? <Alert variant="destructive" className="mb-4"><KeyRoundIcon /><AlertTitle>Connexion refusée</AlertTitle><AlertDescription>Vérifiez le courriel et le mot de passe.</AlertDescription></Alert> : null}
            {isDemo ? <Alert className="mb-4"><ShieldCheckIcon /><AlertTitle>Mode démonstration</AlertTitle><AlertDescription>Aucun identifiant n’est requis en développement local.</AlertDescription></Alert> : null}
            <form action={signInAction}>
              <FieldGroup>
                {!isDemo ? <><Field><FieldLabel htmlFor="login-email">Courriel</FieldLabel><Input id="login-email" name="email" type="email" autoComplete="email" required /></Field><Field><FieldLabel htmlFor="login-password">Mot de passe</FieldLabel><Input id="login-password" name="password" type="password" autoComplete="current-password" minLength={8} required /></Field></> : null}
                <Button type="submit" className="w-full">{isDemo ? "Ouvrir la démonstration" : "Se connecter"}</Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
