import type { MapCoordinate } from "@/types/domain";

export const GATINEAU_MAP_CENTER: MapCoordinate = [45.4765, -75.7013];
export const MAP_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const MAP_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? "&copy; OpenStreetMap contributors";
