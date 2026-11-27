"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

type Place = { id: string; name: string; lat: number; lng: number };

export default function MapView({
  places,
  user,
}: {
  places: Place[];
  user?: { lat: number; lng: number };
}) {
  if (places.length === 0) return null;

  // every point we want visible: restaurants and the user
  const points: [number, number][] = places.map((p) => [p.lat, p.lng]);
  if (user) points.push([user.lat, user.lng]);

  return (
    <MapContainer
      {...(points.length > 1
        ? { bounds: points, boundsOptions: { padding: [30, 30] } }
        : { center: points[0], zoom: 16 })}
      scrollWheelZoom={false}
      className="z-0 h-72 w-full"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={9} pathOptions={{ color: "#2563eb" }}>
          <Popup>{p.name}</Popup>
        </CircleMarker>
      ))}
      {user && (
        <CircleMarker center={[user.lat, user.lng]} radius={9} pathOptions={{ color: "#dc2626" }}>
          <Popup>내 위치</Popup>
        </CircleMarker>
      )}
    </MapContainer>
  );
}