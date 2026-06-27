"use client";

import { ExternalLinkIcon, FileTextIcon, PaperclipIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function receiptUrl(path: string) {
  return `/api/receipts?path=${encodeURIComponent(path)}`;
}

function receiptKind(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(extension ?? "")) return "image";
  return "file";
}

export function ReceiptPreviewLink({
  receiptPath,
  vendor,
  className,
}: {
  receiptPath: string;
  vendor: string;
  className?: string;
}) {
  const url = receiptUrl(receiptPath);
  const kind = receiptKind(receiptPath);
  const label = `Voir le reçu de ${vendor}`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary underline-offset-4 hover:bg-muted hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              className
            )}
          >
            <PaperclipIcon className="size-4" />
            Reçu
          </a>
        }
      />
      <TooltipContent
        side="left"
        align="center"
        sideOffset={10}
        className="max-w-none border bg-card p-2 text-card-foreground shadow-2xl"
      >
        <div className="w-72 overflow-hidden rounded-lg border bg-background">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="max-h-96 w-full object-contain" loading="lazy" />
          ) : kind === "pdf" ? (
            <iframe title={label} src={url} className="h-96 w-full bg-background" />
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
              <FileTextIcon className="size-8" />
              Aperçu non disponible pour ce type de fichier.
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-3 py-2 text-xs">
            <span className="truncate">Reçu — {vendor}</span>
            <span className="inline-flex items-center gap-1 text-primary">
              Ouvrir
              <ExternalLinkIcon className="size-3" />
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
