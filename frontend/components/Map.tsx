"use client";

import { APIProvider, Map as GoogleMap, Marker } from "@vis.gl/react-google-maps";

const DEFAULT_LOCATION = {
  lat: 17.3850,
  lng: 78.4867,
};

export default function Map() {
  return (
    <APIProvider
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
    >
      <div
        style={{
          width: "100%",
          height: "500px",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <GoogleMap
          defaultCenter={DEFAULT_LOCATION}
          defaultZoom={12}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          <Marker position={DEFAULT_LOCATION} />
        </GoogleMap>
      </div>
    </APIProvider>
  );
}