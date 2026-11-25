"use client";

import dynamic from "next/dynamic";

// Leaflet needs the browser, so it must not render on the server
const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => <p className="mb-4 text-sm text-gray-500">Loading map...</p>,
});

export default MapView;