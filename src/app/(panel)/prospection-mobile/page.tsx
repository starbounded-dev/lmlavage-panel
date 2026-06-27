import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ProspectingFieldMode } from "@/components/prospecting-field-mode";
import { Button } from "@/components/ui/button";
import { getAppData } from "@/lib/repository";

export const metadata: Metadata = { title: "Prospection mobile" };

export default async function MobileProspectingPage() {
  const data = await getAppData();

  return (
    <>
      <PageHeader
        title="Prospection mobile"
        description="Mode terrain pour téléphone: GPS, maisons, statuts couleur, itinéraire et conversion en client."
        action={
          <Button variant="outline" render={<Link href="/prospection" />}>
            Gestion des rues
          </Button>
        }
      />
      <ProspectingFieldMode houses={data.prospectHouses} />
    </>
  );
}
