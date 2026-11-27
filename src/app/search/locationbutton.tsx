"use client";

import { useState } from "react";

export default function LocationButton() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState("");

  function locate() {
    if (!navigator.geolocation) {
      setStatus("Your browser does not support location.");
      return;
    }
    setStatus("Finding your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("Location set.");
      },
      () => setStatus("Could not get your location. Allow it in the browser."),
    );
  }

  return (
    <div>
      {coords && (
        <>
          <input type="hidden" name="lat" value={coords.lat} />
          <input type="hidden" name="lng" value={coords.lng} />
        </>
      )}
      <button type="button" onClick={locate} className="rounded border px-3 py-2 text-sm">
        Use my location
      </button>
      {status && <span className="ml-2 text-xs text-gray-500">{status}</span>}
    </div>
  );
}