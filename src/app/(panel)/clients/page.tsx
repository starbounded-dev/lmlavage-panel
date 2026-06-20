import type { Metadata } from "next";
import Link from "next/link";
import { Building2Icon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import { ClientActions } from "@/components/client-actions";
import { NewClientDialog } from "@/components/operation-dialogs";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppData } from "@/lib/repository";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const data = await getAppData();
  const nextClientNumber = Math.max(0, ...data.clients.map((client) => client.clientNumber)) + 1;

  return (
    <>
      <PageHeader
        title="Clients"
        description="Coordonnées, propriétés et historique des travaux."
        action={<NewClientDialog nextClientNumber={nextClientNumber} />}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.clients.map((client) => (
          <Card key={client.id} className="min-w-0">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{client.name ?? `Client #${client.clientNumber}`}</CardTitle>
                  <CardDescription>{client.properties.length} propriété{client.properties.length === 1 ? "" : "s"}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className="font-mono">#{client.clientNumber}</Badge>
                  {client.needsReview ? <Badge variant="destructive">À confirmer</Badge> : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {client.phone ? (
                <p className="flex items-center gap-2 text-sm"><PhoneIcon className="size-4 text-muted-foreground" />{client.phone}</p>
              ) : null}
              {client.email ? (
                <p className="flex items-center gap-2 truncate text-sm"><MailIcon className="size-4 text-muted-foreground" />{client.email}</p>
              ) : null}
              {client.properties.map((property) => (
                <div key={property.id} className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{[property.address, property.city, property.province].filter(Boolean).join(", ") || "Adresse à confirmer"}</span>
                </div>
              ))}
              {client.properties.length === 0 ? <p className="text-sm text-muted-foreground">Aucune adresse pour le moment.</p> : null}
              <Button render={<Link href={`/clients/${client.id}`} />} nativeButton={false} variant="outline" className="mt-1 w-full">
                <Building2Icon data-icon="inline-start" />
                Ouvrir le dossier
              </Button>
              <ClientActions client={client} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
