"use client";

import { useTransition } from "react";
import { BanIcon, CheckCircle2Icon, CircleDollarSignIcon, MoreHorizontalIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { cancelJobAction, completeJobAction, markJobPaidAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function JobActions({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();

  function run(action: (id: string) => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action(jobId);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={pending} />}>
        {pending ? <RefreshCwIcon className="animate-spin" /> : <MoreHorizontalIcon />}
        <span className="sr-only">Actions du travail</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => run(completeJobAction)}>
            <CheckCircle2Icon />
            Marquer terminé
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run(markJobPaidAction)}>
            <CircleDollarSignIcon />
            Marquer payé
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => run(cancelJobAction)}>
            <BanIcon />
            Annuler le travail
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
