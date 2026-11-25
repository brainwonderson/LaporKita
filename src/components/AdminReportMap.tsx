'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';

export type AdminMapReport = {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  location: string;
  coordinates: { lat?: number; lng?: number } | null;
};

type AdminReportMapProps = {
  reports: AdminMapReport[];
  onSelectReport: (reportId: string) => void;
};

const CATEGORY_COLORS: Record<string, string> = {
  'Jalan Rusak': '#ea580c',
  'Sampah Menumpuk': '#16a34a',
  'Lampu Jalan Mati': '#ca8a04',
  'Banjir & Drainase': '#0284c7',
  'Fasilitas Umum': '#9333ea',
  Lainnya: '#0d9488',
};

export default function AdminReportMap({ reports, onSelectReport }: AdminReportMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let isMounted = true;

    void import('leaflet').then(({ default: L }) => {
      if (!isMounted || !containerRef.current) return;
      const map = L.map(containerRef.current, {
        center: [-6.402484, 106.828241],
        zoom: 11,
        zoomControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      mapRef.current = map;
      markerLayerRef.current = L.layerGroup().addTo(map);
      window.setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void import('leaflet').then(({ default: L }) => {
      if (!isMounted || !mapRef.current || !markerLayerRef.current) return;
      const map = mapRef.current;
      const layer = markerLayerRef.current;
      layer.clearLayers();
      const visibleReports = reports.filter((report) => (
        report.coordinates
        && Number.isFinite(report.coordinates.lat)
        && Number.isFinite(report.coordinates.lng)
      ));

      visibleReports.forEach((report) => {
        const coordinates = report.coordinates;
        if (!coordinates || coordinates.lat === undefined || coordinates.lng === undefined) return;

        const marker = L.circleMarker([coordinates.lat, coordinates.lng], {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: CATEGORY_COLORS[report.category] ?? CATEGORY_COLORS.Lainnya,
          fillOpacity: 0.95,
        }).addTo(layer);

        const popup = document.createElement('div');
        popup.style.cssText = 'min-width:180px;display:grid;gap:5px;';
        const ticket = document.createElement('strong');
        ticket.textContent = report.ticketNumber;
        ticket.style.color = '#0f766e';
        const title = document.createElement('span');
        title.textContent = report.title;
        title.style.fontWeight = '700';
        const category = document.createElement('span');
        category.textContent = report.category;
        category.style.color = CATEGORY_COLORS[report.category] ?? CATEGORY_COLORS.Lainnya;
        const location = document.createElement('span');
        location.textContent = report.location;
        location.style.color = '#64748b';
        const details = document.createElement('button');
        details.type = 'button';
        details.textContent = 'Buka detail laporan';
        details.style.cssText = 'margin-top:4px;padding:6px 8px;border:0;border-radius:6px;background:#0f766e;color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer;';
        details.addEventListener('click', () => onSelectReport(report.id));
        popup.append(ticket, title, category, location, details);
        marker.bindPopup(popup);
      });

      if (visibleReports.length > 0) {
        const bounds = L.latLngBounds(visibleReports.map((report) => [
          report.coordinates!.lat!,
          report.coordinates!.lng!,
        ]));
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [reports, onSelectReport]);

  return (
    <div
      ref={containerRef}
      aria-label="Peta sebaran laporan berdasarkan lokasi"
      style={{ width: '100%', height: '460px', background: '#e2e8f0' }}
    />
  );
}
