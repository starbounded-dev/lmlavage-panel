"use client";

import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import { GATINEAU_MAP_CENTER, MAP_ATTRIBUTION, MAP_TILE_URL } from "@/lib/map-config";
import type { CanvassingVisit, MapCoordinate } from "@/types/domain";

export type ClientMapLocation = {
  id: string;
  label: string;
  address: string;
  coordinate: MapCoordinate;
};

export type ProspectingMapProps = {
  visits: CanvassingVisit[];
  clients: ClientMapLocation[];
};

function FitPlottedData({ coordinates }: { coordinates: MapCoordinate[] }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length === 0) return;
    if (coordinates.length === 1) {
      map.setView(coordinates[0], 16);
      return;
    }
    map.fitBounds(new LatLngBounds(coordinates), { padding: [34, 34], maxZoom: 17 });
  }, [coordinates, map]);

  return null;
}

export function ProspectingMap({ visits, clients }: ProspectingMapProps) {
  const plottedCoordinates = useMemo(
    () => [
      ...visits.flatMap((visit) => visit.routeCoordinates),
      ...clients.map((client) => client.coordinate),
    ],
    [clients, visits]
  );

  return (
    <div className="relative">
      <div className="prospecting-map overflow-hidden rounded-xl border" role="region" aria-label="Carte des secteurs prospectés à Gatineau">
        <MapContainer center={GATINEAU_MAP_CENTER} zoom={13} scrollWheelZoom className="h-[28rem] w-full lg:h-[36rem]" preferCanvas>
          <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} />
          <FitPlottedData coordinates={plottedCoordinates} />
          {visits.map((visit) =>
            visit.routeCoordinates.length > 1 ? (
              <Polyline key={visit.id} positions={visit.routeCoordinates} pathOptions={{ color: "#ef4444", weight: 6, opacity: 0.86 }}>
                <Popup>
                  <div className="space-y-1 text-sm">
                    <strong>{visit.street}</strong>
                    <div>{visit.startAddress ?? "Départ non précisé"} → {visit.endAddress ?? "Fin non précisée"}</div>
                    <div>{visit.outcome}</div>
                  </div>
                </Popup>
              </Polyline>
            ) : null
          )}
          {clients.map((client) => (
            <CircleMarker
              key={client.id}
              center={client.coordinate}
              radius={9}
              pathOptions={{ color: "#14532d", fillColor: "#22c55e", fillOpacity: 1, weight: 3 }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <strong>{client.label}</strong>
                  <div>{client.address}</div>
                  <div>Maison cliente</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-lg border bg-card/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
        <div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-red-500" /> Portion visitée</div>
        <div className="mt-1 flex items-center gap-2"><span className="size-2.5 rounded-full bg-green-500" /> Maison cliente</div>
      </div>
    </div>
  );
}
