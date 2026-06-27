"use client";

import { useEffect, useMemo, useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, LocateFixedIcon, PencilIcon, PlusIcon, Trash2Icon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import {
  convertProspectHouseToClientAction,
  createProspectHouseAction,
  deleteProspectHouseAction,
  setProspectHouseStatusAction,
  updateProspectHouseAction,
} from "@/app/actions";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { MapPickerLazy } from "@/components/map-picker-lazy";
import { MutationDialog } from "@/components/mutation-dialog";
import { ProspectingMapLazy } from "@/components/prospecting-map-lazy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { PROSPECT_HOUSE_STATUSES, PROSPECT_HOUSE_STATUS_META } from "@/lib/prospecting";
import { cn } from "@/lib/utils";
import type { MapCoordinate, ProspectHouse, ProspectHouseStatus } from "@/types/domain";

type GpsState = {
  coordinate: MapCoordinate | null;
  accuracy: number | null;
  status: "idle" | "watching" | "unsupported" | "denied" | "error";
};

type HouseFilter = ProspectHouseStatus | "all";

function todayInputValue() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}

function statusOptions() {
  return PROSPECT_HOUSE_STATUSES.map((status) => (
    <NativeSelectOption key={status} value={status}>
      {PROSPECT_HOUSE_STATUS_META[status].label}
    </NativeSelectOption>
  ));
}

function fullAddress(house: ProspectHouse) {
  return [house.address, house.city, house.province, house.postalCode].filter(Boolean).join(", ");
}

function mapsUrl(house: ProspectHouse) {
  const query = house.latitude != null && house.longitude != null
    ? `${house.latitude},${house.longitude}`
    : fullAddress(house);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function HouseFields({
  house,
  gpsCoordinate,
}: {
  house?: ProspectHouse;
  gpsCoordinate?: MapCoordinate | null;
}) {
  const coordinate =
    house?.latitude != null && house.longitude != null
      ? [[house.latitude, house.longitude] as MapCoordinate]
      : gpsCoordinate
        ? [gpsCoordinate]
        : [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {house ? <input type="hidden" name="houseId" value={house.id} /> : null}
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={house ? `house-address-${house.id}` : "house-address-new"}>Adresse</FieldLabel>
        <Input
          id={house ? `house-address-${house.id}` : "house-address-new"}
          name="address"
          defaultValue={house?.address ?? ""}
          autoComplete="street-address"
          enterKeyHint="next"
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={house ? `house-city-${house.id}` : "house-city-new"}>Ville</FieldLabel>
        <Input
          id={house ? `house-city-${house.id}` : "house-city-new"}
          name="city"
          defaultValue={house?.city ?? "Gatineau"}
          autoComplete="address-level2"
          enterKeyHint="next"
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={house ? `house-province-${house.id}` : "house-province-new"}>Province</FieldLabel>
        <Input
          id={house ? `house-province-${house.id}` : "house-province-new"}
          name="province"
          defaultValue={house?.province ?? "QC"}
          autoComplete="address-level1"
          enterKeyHint="next"
          maxLength={3}
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={house ? `house-postal-${house.id}` : "house-postal-new"}>Code postal</FieldLabel>
        <Input
          id={house ? `house-postal-${house.id}` : "house-postal-new"}
          name="postalCode"
          defaultValue={house?.postalCode ?? ""}
          autoComplete="postal-code"
          enterKeyHint="next"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={house ? `house-status-${house.id}` : "house-status-new"}>Statut</FieldLabel>
        <NativeSelect id={house ? `house-status-${house.id}` : "house-status-new"} name="status" defaultValue={house?.status ?? "no_answer"} className="w-full">
          {statusOptions()}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor={house ? `house-visited-${house.id}` : "house-visited-new"}>Date de visite</FieldLabel>
        <Input id={house ? `house-visited-${house.id}` : "house-visited-new"} name="visitedAt" type="date" defaultValue={house?.visitedAt ?? todayInputValue()} />
      </Field>
      <Field>
        <FieldLabel htmlFor={house ? `house-revisit-${house.id}` : "house-revisit-new"}>Date de retour</FieldLabel>
        <Input id={house ? `house-revisit-${house.id}` : "house-revisit-new"} name="revisitDate" type="date" defaultValue={house?.revisitDate ?? ""} />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel>Position sur la carte</FieldLabel>
        <FieldDescription>
          {house
            ? "Déplacez le marqueur si l’adresse a été ajoutée sans GPS ou si la position est imprécise."
            : gpsCoordinate
              ? "Le GPS actuel est prérempli. Vous pouvez déplacer le marqueur si nécessaire."
              : "Touchez la carte pour placer la maison si le GPS n’est pas actif."}
        </FieldDescription>
        <MapPickerLazy name="houseCoordinates" mode="point" initialCoordinates={coordinate} />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={house ? `house-notes-${house.id}` : "house-notes-new"}>Notes</FieldLabel>
        <Textarea id={house ? `house-notes-${house.id}` : "house-notes-new"} name="notes" defaultValue={house?.notes ?? ""} rows={3} />
      </Field>
    </div>
  );
}

function AddHouseDialog({
  gpsCoordinate,
  trigger,
}: {
  gpsCoordinate: MapCoordinate | null;
  trigger: ReactElement;
}) {
  return (
    <MutationDialog
      title="Ajouter une maison"
      description="Ajoutez la maison devant laquelle vous êtes. Le GPS ou la carte peut sauvegarder sa position."
      action={createProspectHouseAction}
      trigger={trigger}
    >
      <HouseFields gpsCoordinate={gpsCoordinate} />
    </MutationDialog>
  );
}

function ProspectHouseCard({
  house,
  onStatus,
  onConvert,
  pending,
}: {
  house: ProspectHouse;
  onStatus: (houseId: string, status: ProspectHouseStatus) => void;
  onConvert: (houseId: string) => void;
  pending: boolean;
}) {
  const meta = PROSPECT_HOUSE_STATUS_META[house.status];
  const dates = [
    house.visitedAt ? `Visite: ${formatDate(house.visitedAt, "d MMM")}` : null,
    house.revisitDate ? `Retour: ${formatDate(house.revisitDate, "d MMM")}` : null,
  ].filter(Boolean);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(fullAddress(house));
      toast.success("Adresse copiée.");
    } catch {
      toast.error("Impossible de copier l’adresse.");
    }
  }

  return (
    <div className={cn("rounded-xl border p-3 shadow-sm", meta.className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{house.address}</div>
          <div className="text-xs text-muted-foreground">{[house.city, house.province].filter(Boolean).join(", ")}</div>
          {dates.length > 0 ? <div className="mt-1 text-xs text-muted-foreground">{dates.join(" · ")}</div> : null}
        </div>
        <Badge variant="outline" className={meta.className}>{meta.shortLabel}</Badge>
      </div>
      {house.notes ? <p className="mt-2 text-sm text-muted-foreground">{house.notes}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {PROSPECT_HOUSE_STATUSES.map((status) => {
          const option = PROSPECT_HOUSE_STATUS_META[status];
          return (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={status === house.status ? "default" : "outline"}
              disabled={pending}
              onClick={() => onStatus(house.id, status)}
              className="h-9 justify-start"
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: option.marker.fillColor }} />
              {option.shortLabel}
            </Button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          className="col-span-2 h-9"
          disabled={pending || Boolean(house.createdClientId)}
          onClick={() => onConvert(house.id)}
        >
          {house.createdClientId ? <CheckCircle2Icon data-icon="inline-start" /> : <UserPlusIcon data-icon="inline-start" />}
          {house.createdClientId ? "Client créé" : "Transformer en client"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={copyAddress}>
          Copier
        </Button>
        <Button type="button" size="sm" variant="outline" render={<a href={mapsUrl(house)} target="_blank" rel="noreferrer" />}>
          Itinéraire
        </Button>
        <MutationDialog
          title="Modifier la maison"
          description="Mettez à jour l’adresse, le statut, les dates, les notes ou la position."
          action={updateProspectHouseAction}
          trigger={
            <Button type="button" size="sm" variant="outline">
              <PencilIcon data-icon="inline-start" />
              Modifier
            </Button>
          }
        >
          <HouseFields house={house} />
        </MutationDialog>
        <DeleteConfirmationDialog
          title={`Retirer ${house.address} ?`}
          description="Cette maison sera supprimée du mode terrain. Le client lié, s’il existe, ne sera pas supprimé."
          itemId={house.id}
          action={deleteProspectHouseAction}
          trigger={
            <Button type="button" size="sm" variant="destructive">
              <Trash2Icon data-icon="inline-start" />
              Retirer
            </Button>
          }
        />
      </div>
    </div>
  );
}

export function ProspectingFieldMode({ houses }: { houses: ProspectHouse[] }) {
  const router = useRouter();
  const [gps, setGps] = useState<GpsState>({ coordinate: null, accuracy: null, status: "idle" });
  const [watchId, setWatchId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<HouseFilter>("all");
  const [pending, startTransition] = useTransition();

  const counts = useMemo(
    () =>
      PROSPECT_HOUSE_STATUSES.map((status) => ({
        status,
        total: houses.filter((house) => house.status === status).length,
      })),
    [houses]
  );

  const visibleHouses = useMemo(
    () => activeFilter === "all" ? houses : houses.filter((house) => house.status === activeFilter),
    [activeFilter, houses]
  );

  useEffect(() => {
    return () => {
      if (watchId != null && "geolocation" in navigator) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  function startGps() {
    if (!("geolocation" in navigator)) {
      setGps((current) => ({ ...current, status: "unsupported" }));
      return;
    }
    if (watchId != null) return;
    const id = navigator.geolocation.watchPosition(
      (position) => {
        setGps({
          coordinate: [position.coords.latitude, position.coords.longitude],
          accuracy: position.coords.accuracy,
          status: "watching",
        });
      },
      (error) => {
        setGps((current) => ({ ...current, status: error.code === error.PERMISSION_DENIED ? "denied" : "error" }));
        setWatchId(null);
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 }
    );
    setWatchId(id);
    setGps((current) => ({ ...current, status: "watching" }));
  }

  function stopGps() {
    if (watchId != null && "geolocation" in navigator) navigator.geolocation.clearWatch(watchId);
    setWatchId(null);
    setGps({ coordinate: null, accuracy: null, status: "idle" });
  }

  function runStatusUpdate(houseId: string, status: ProspectHouseStatus) {
    startTransition(async () => {
      const result = await setProspectHouseStatusAction(houseId, status);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  function convertToClient(houseId: string) {
    startTransition(async () => {
      const result = await convertProspectHouseToClientAction(houseId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  const gpsMessage =
    gps.status === "watching" && gps.coordinate
      ? `Position active${gps.accuracy ? `, précision ±${Math.round(gps.accuracy)} m` : ""}.`
      : gps.status === "denied"
        ? "Permission GPS refusée par le navigateur."
        : gps.status === "unsupported"
          ? "GPS non supporté sur cet appareil."
          : gps.status === "error"
            ? "Le GPS n’a pas pu obtenir la position."
            : "Activez le GPS pour voir votre position et préremplir les nouvelles maisons.";

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Mode terrain mobile</CardTitle>
              <CardDescription>Une page séparée pour le porte-à-porte: GPS, maisons, statuts couleur et conversion en client.</CardDescription>
            </div>
            <AddHouseDialog
              gpsCoordinate={gps.coordinate}
              trigger={
                <Button className="h-10 w-full sm:w-auto">
                  <PlusIcon data-icon="inline-start" />
                  Ajouter maison
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pb-28 md:pb-5">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Button
              type="button"
              size="sm"
              variant={activeFilter === "all" ? "default" : "outline"}
              className="h-10 shrink-0"
              onClick={() => setActiveFilter("all")}
            >
              Toutes
              <Badge variant="secondary">{houses.length}</Badge>
            </Button>
            {counts.map(({ status, total }) => {
              const meta = PROSPECT_HOUSE_STATUS_META[status];
              return (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={activeFilter === status ? "default" : "outline"}
                  className="h-10 shrink-0"
                  onClick={() => setActiveFilter(status)}
                >
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: meta.marker.fillColor }} />
                  {meta.shortLabel}
                  <Badge variant="secondary">{total}</Badge>
                </Button>
              );
            })}
          </div>

          <div className="grid gap-2 sm:grid-cols-5">
            {counts.map(({ status, total }) => {
              const meta = PROSPECT_HOUSE_STATUS_META[status];
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActiveFilter(status)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition hover:opacity-85",
                    meta.className,
                    activeFilter === status && "ring-2 ring-primary/40"
                  )}
                >
                  <div className="text-lg font-semibold text-foreground">{total}</div>
                  <div className="text-xs">{meta.shortLabel}</div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <LocateFixedIcon className="size-4" />
                GPS terrain
              </div>
              <p className="text-muted-foreground">{gpsMessage}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button type="button" variant={watchId == null ? "default" : "secondary"} className="h-10" onClick={startGps} disabled={watchId != null}>
                Activer GPS
              </Button>
              <Button type="button" variant="outline" className="h-10" onClick={stopGps} disabled={watchId == null}>
                Arrêter
              </Button>
            </div>
          </div>

          <ProspectingMapLazy
            visits={[]}
            clients={[]}
            houses={visibleHouses}
            userPosition={gps.coordinate}
            ariaLabel="Carte terrain des maisons prospectées à Gatineau"
            compact
          />

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">
              {visibleHouses.length} maison{visibleHouses.length !== 1 ? "s" : ""}
            </div>
            {activeFilter !== "all" ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => setActiveFilter("all")}>
                Enlever filtre
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {visibleHouses.length > 0 ? (
              visibleHouses.map((house) => (
                <ProspectHouseCard
                  key={house.id}
                  house={house}
                  pending={pending}
                  onStatus={runStatusUpdate}
                  onConvert={convertToClient}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground lg:col-span-2">
                Aucune maison dans ce filtre. Activez le GPS, ajoutez une adresse, puis changez le statut pendant la prospection.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-3 bottom-24 z-40 grid grid-cols-2 gap-2 md:hidden">
        <AddHouseDialog
          gpsCoordinate={gps.coordinate}
          trigger={
            <Button className="h-12 shadow-lg">
              <PlusIcon data-icon="inline-start" />
              Maison
            </Button>
          }
        />
        <Button
          type="button"
          variant={watchId == null ? "secondary" : "outline"}
          className="h-12 shadow-lg"
          onClick={watchId == null ? startGps : stopGps}
        >
          <LocateFixedIcon data-icon="inline-start" />
          {watchId == null ? "GPS" : "Stop GPS"}
        </Button>
      </div>
    </>
  );
}
