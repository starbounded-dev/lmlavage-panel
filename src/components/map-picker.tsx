"use client";

import { useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMapEvents } from "react-leaflet";
import { LocateFixedIcon, RotateCcwIcon, Undo2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GATINEAU_MAP_CENTER, MAP_ATTRIBUTION, MAP_TILE_URL } from "@/lib/map-config";
import type { MapCoordinate } from "@/types/domain";

export type MapPickerProps = {
  name: string;
  mode: "point" | "line";
  initialCoordinates?: MapCoordinate[];
};

function ClickCapture({ onPick }: { onPick: (coordinate: MapCoordinate) => void }) {
  useMapEvents({
    click(event) {
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

export function MapPicker({ name, mode, initialCoordinates = [] }: MapPickerProps) {
  const [coordinates, setCoordinates] = useState<MapCoordinate[]>(initialCoordinates);
  const isLine = mode === "line";
  const center = coordinates[0] ?? GATINEAU_MAP_CENTER;

  function pick(coordinate: MapCoordinate) {
    setCoordinates((current) => (isLine ? [...current, coordinate] : [coordinate]));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(coordinates)} readOnly />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {isLine
            ? "Cliquez le début, puis ajoutez des points le long de la rue jusqu’à la dernière maison."
            : "Cliquez sur la maison pour placer le marqueur client."}
        </p>
        <div className="flex shrink-0 gap-2">
          {isLine && coordinates.length > 0 ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setCoordinates((current) => current.slice(0, -1))}>
              <Undo2Icon data-icon="inline-start" />
              Annuler un point
            </Button>
          ) : null}
          {coordinates.length > 0 ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setCoordinates([])}>
              <RotateCcwIcon data-icon="inline-start" />
              Effacer
            </Button>
          ) : null}
        </div>
      </div>
      <div className="prospecting-map overflow-hidden rounded-lg border" role="region" aria-label={isLine ? "Carte pour tracer la portion visitée" : "Carte pour placer la maison cliente"}>
        <MapContainer center={center} zoom={15} scrollWheelZoom className="h-72 w-full" preferCanvas>
          <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} />
          <ClickCapture onPick={pick} />
          {isLine && coordinates.length > 1 ? <Polyline positions={coordinates} pathOptions={{ color: "#ef4444", weight: 6, opacity: 0.9 }} /> : null}
          {coordinates.map((coordinate, index) => (
            <CircleMarker
              key={`${coordinate[0]}-${coordinate[1]}-${index}`}
              center={coordinate}
              radius={isLine ? (index === 0 || index === coordinates.length - 1 ? 7 : 4) : 9}
              pathOptions={{ color: isLine ? "#991b1b" : "#166534", fillColor: isLine ? "#ef4444" : "#22c55e", fillOpacity: 1, weight: 2 }}
            />
          ))}
        </MapContainer>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <LocateFixedIcon className="size-3.5" />
        {coordinates.length === 0
          ? "Aucun emplacement choisi."
          : isLine
            ? `${coordinates.length} point${coordinates.length > 1 ? "s" : ""} dans le tracé.`
            : "Maison positionnée sur la carte."}
      </p>
    </div>
  );
}
