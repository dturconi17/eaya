"use client";

import { useEffect, useRef } from "react";
import type { MapaLocalidad } from "./types";
import "leaflet/dist/leaflet.css";

type Props = { localidades: MapaLocalidad[] };

export default function MapaLeads({ localidades }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contenedor.current) return;
    let cancelado = false;
    let mapa: import("leaflet").Map | undefined;

    async function iniciar() {
      const L = await import("leaflet");
      if (cancelado || !contenedor.current) return;

      mapa = L.map(contenedor.current, {
        center: [-38.4, -63.6],
        zoom: 4,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(mapa);

      const limites: import("leaflet").LatLngExpression[] = [];

      for (const item of localidades) {
        const punto: import("leaflet").LatLngExpression = [item.latitud, item.longitud];
        limites.push(punto);
        const radio = Math.min(32, Math.max(7, 5 + Math.sqrt(item.cantidad) * 4));
        const circulo = L.circleMarker(punto, {
          radius: radio,
          color: "#1d4ed8",
          weight: 2,
          fillColor: "#2563eb",
          fillOpacity: 0.58,
        }).addTo(mapa);

        // Evitar insertar texto proveniente de la base como HTML sin escapar.
        const contenido = document.createElement("div");
        const titulo = document.createElement("strong");
        titulo.textContent = `${item.localidad}, ${item.provincia}`;
        const detalle = document.createElement("div");
        detalle.textContent = `${item.cantidad} lead${item.cantidad === 1 ? "" : "s"}`;
        contenido.append(titulo, detalle);
        circulo.bindPopup(contenido);
      }

      if (limites.length === 1) mapa.setView(limites[0], 9);
      else if (limites.length > 1) {
        mapa.fitBounds(L.latLngBounds(limites), { padding: [40, 40], maxZoom: 10 });
      }
    }

    void iniciar();
    return () => {
      cancelado = true;
      mapa?.remove();
    };
  }, [localidades]);

  return <div ref={contenedor} style={{ height: 480, width: "100%", borderRadius: 12, zIndex: 0 }} />;
}