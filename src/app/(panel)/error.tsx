"use client";

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-xl py-16"><Alert variant="destructive"><AlertTriangleIcon /><AlertTitle>Impossible de charger les données</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert><Button onClick={reset} className="mt-4"><RefreshCwIcon data-icon="inline-start" />Réessayer</Button></div>;
}
