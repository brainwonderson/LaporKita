'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ReportItem } from '@/types';
import {
  MapPin,
  Crosshair,
  Maximize2,
  Layers,
  Sparkles,
  Heart,
  ExternalLink,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface ReportMapProps {
  reports: ReportItem[];
  selectedReportId?: string | null;
  onSelectReport?: (report: ReportItem) => void;
  onLikeReport?: (reportId: string) => void;
  hasSupportedReport?: (reportId: string) => boolean;
  height?: string | number;
  center?: [number, number];
  zoom?: number;
  showLegend?: boolean;
  showControls?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  'Jalan Rusak': { bg: '#ea580c', border: '#c2410c', icon: '🚧' },
  'Sampah Menumpuk': { bg: '#16a34a', border: '#15803d', icon: '🗑️' },
  'Lampu Jalan Mati': { bg: '#ca8a04', border: '#a16207', icon: '💡' },
  'Banjir & Drainase': { bg: '#0284c7', border: '#0369a1', icon: '🌊' },
  'Fasilitas Umum': { bg: '#9333ea', border: '#7e22ce', icon: '🚏' },
  'Lainnya': { bg: '#0d9488', border: '#0f766e', icon: '⚠️' },
};

export default function ReportMap({
  reports,
  selectedReportId,
  onSelectReport,
  onLikeReport,
  hasSupportedReport,
  height = '560px',
  center = [-6.402484, 106.828241],
  zoom = 13,
  showLegend = true,
  showControls = true,
}: ReportMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [activeTileLayer, setActiveTileLayer] = useState<'streets' | 'topo'>('streets');
  const tileLayerRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      const L = (await import('leaflet')).default;

      // Clean up previous instance if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Create Map
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: false,
        attributionControl: false,
      });

      // Attribution control in Indonesian
      L.control.attribution({
        position: 'bottomright',
        prefix: '<a href="https://leafletjs.com" target="_blank">Leaflet</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
      }).addTo(map);

      // Add Tile Layer
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      tileLayerRef.current = streetLayer;
      mapInstanceRef.current = map;

      if (isMounted) {
        setMapReady(true);
      }

      // Small delay to invalidate size after layout
      setTimeout(() => {
        if (map && !map.getContainer()?.offsetWidth) return;
        map.invalidateSize();
      }, 300);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when reports or selection changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    let isMounted = true;

    async function updateMarkers() {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;
      if (!map) return;

      // Clear existing markers
      markersRef.current.forEach((marker) => {
        marker.remove();
      });
      markersRef.current.clear();

      const validReports = reports.filter((r) => r.coordinates && typeof r.coordinates.lat === 'number' && typeof r.coordinates.lng === 'number');

      if (validReports.length === 0) return;

      const latLngList: [number, number][] = [];

      validReports.forEach((report) => {
        const coords = report.coordinates!;
        const isSelected = selectedReportId === report.id;
        const catConfig = CATEGORY_COLORS[report.category] || CATEGORY_COLORS['Lainnya'];
        const isDarurat = report.urgency === 'Darurat';

        // Custom HTML Marker using Leaflet DivIcon
        const customIcon = L.divIcon({
          className: 'custom-report-marker',
          html: `
            <div class="custom-report-pin ${isSelected ? 'pin-selected' : ''}" style="background-color: ${catConfig.bg}; border-color: #ffffff;">
              <span class="pin-icon">${catConfig.icon}</span>
              ${isDarurat ? '<span class="pin-urgency-dot" title="Prioritas Darurat"></span>' : ''}
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -42],
        });

        const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(map);

        // Status badge styling helper
        let statusBadgeHtml = '';
        if (report.status === 'Selesai') {
          statusBadgeHtml = `<span style="background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700;">✓ Selesai</span>`;
        } else if (report.status === 'Diproses') {
          statusBadgeHtml = `<span style="background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700;">⚙️ Diproses</span>`;
        } else if (report.status === 'Ditolak') {
          statusBadgeHtml = `<span style="background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700;">✕ Ditolak</span>`;
        } else {
          statusBadgeHtml = `<span style="background:#fffbeb;color:#92400e;border:1px solid #fde68a;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700;">⏳ Menunggu</span>`;
        }

        const isUserLiked = hasSupportedReport ? hasSupportedReport(report.id) : false;

        // Custom Popup Content
        const popupContent = document.createElement('div');
        popupContent.style.cssText = 'overflow:hidden;border-radius:12px;';
        popupContent.innerHTML = `
          ${report.images && report.images[0] ? `
            <div style="height:120px;width:100%;overflow:hidden;background:#0f172a;position:relative;">
              <img src="${report.images[0]}" alt="${report.title}" style="width:100%;height:100%;object-fit:cover;" />
              <div style="position:absolute;top:8px;left:8px;">${statusBadgeHtml}</div>
              <div style="position:absolute;bottom:8px;right:8px;background:rgba(15,23,42,0.8);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;">
                ${report.ticketNumber}
              </div>
            </div>
          ` : `
            <div style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-family:monospace;font-weight:700;font-size:11px;color:#0f766e;">${report.ticketNumber}</span>
              ${statusBadgeHtml}
            </div>
          `}
          <div style="padding:14px;">
            <div style="font-size:11px;font-weight:700;color:${catConfig.bg};text-transform:uppercase;margin-bottom:4px;letter-spacing:0.5px;">
              ${catConfig.icon} ${report.category}
            </div>
            <h4 style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px;line-height:1.35;max-height:36px;overflow:hidden;">
              ${report.title}
            </h4>
            <div style="font-size:11px;color:#64748b;margin-bottom:12px;display:flex;align-items:center;gap:4px;">
              <span>📍</span> <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${report.location}</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;border-top:1px solid #f1f5f9;">
              <button id="like-btn-${report.id}" style="background:${isUserLiked ? '#ffe4e6' : '#f8fafc'};border:1px solid ${isUserLiked ? '#fda4af' : '#e2e8f0'};color:${isUserLiked ? '#e11d48' : '#475569'};border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                ${isUserLiked ? '❤️' : '🤍'} <span>${report.likes || 0} Dukungan</span>
              </button>
              <button id="detail-btn-${report.id}" style="background:#0d9488;border:none;color:#fff;border-radius:6px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                Detail ➔
              </button>
            </div>
          </div>
        `;

        // Bind interactive events on popup dom
        marker.bindPopup(popupContent, { maxWidth: 300, minWidth: 260 });

        marker.on('popupopen', () => {
          const detailBtn = document.getElementById(`detail-btn-${report.id}`);
          if (detailBtn) {
            detailBtn.onclick = (e) => {
              e.preventDefault();
              onSelectReport?.(report);
            };
          }
          const likeBtn = document.getElementById(`like-btn-${report.id}`);
          if (likeBtn) {
            likeBtn.onclick = (e) => {
              e.preventDefault();
              onLikeReport?.(report.id);
            };
          }
        });

        marker.on('click', () => {
          onSelectReport?.(report);
        });

        markersRef.current.set(report.id, marker);
        latLngList.push([coords.lat, coords.lng]);

        // If this report is currently selected, open its popup
        if (isSelected) {
          marker.openPopup();
        }
      });

      // Fly to selected report or fit bounds if first load
      if (selectedReportId && markersRef.current.has(selectedReportId)) {
        const selMarker = markersRef.current.get(selectedReportId);
        const selReport = validReports.find((r) => r.id === selectedReportId);
        if (selReport?.coordinates) {
          map.flyTo([selReport.coordinates.lat, selReport.coordinates.lng], 16, {
            duration: 1,
          });
          selMarker.openPopup();
        }
      }
    }

    updateMarkers();
  }, [reports, selectedReportId, mapReady, hasSupportedReport]);

  // Handler: Locate current user with browser GPS
  const handleLocateUser = () => {
    if (typeof window === 'undefined' || !navigator.geolocation || !mapInstanceRef.current) return;

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const L = (await import('leaflet')).default;
        const map = mapInstanceRef.current;
        if (!map) return;

        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }

        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="width:24px;height:24px;border-radius:50%;background:#3b82f6;border:3px solid #ffffff;box-shadow:0 0 16px rgba(59,130,246,0.8);position:relative;">
              <div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(59,130,246,0.3);animation:pinPulse 2s infinite;"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([userLat, userLng], { icon: userIcon })
          .addTo(map)
          .bindPopup('<div style="padding:10px;font-size:12px;font-weight:700;color:#1e40af;">📍 Posisi GPS Anda Saat Ini</div>')
          .openPopup();

        userMarkerRef.current = marker;
        map.flyTo([userLat, userLng], 15, { duration: 1.2 });
        setLocatingUser(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handler: Reset map view to fit all markers
  const handleResetBounds = async () => {
    if (!mapInstanceRef.current) return;
    const L = (await import('leaflet')).default;
    const map = mapInstanceRef.current;

    const validReports = reports.filter((r) => r.coordinates);
    if (validReports.length === 0) {
      map.setView(center, zoom);
      return;
    }

    const bounds = L.latLngBounds(
      validReports.map((r) => [r.coordinates!.lat, r.coordinates!.lng])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  };

  // Handler: Toggle Satellite / Topo vs Street Map layer
  const handleToggleLayer = async () => {
    if (!mapInstanceRef.current) return;
    const L = (await import('leaflet')).default;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    if (activeTileLayer === 'streets') {
      const topoLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxZoom: 18,
        }
      ).addTo(map);
      tileLayerRef.current = topoLayer;
      setActiveTileLayer('topo');
    } else {
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);
      tileLayerRef.current = streetLayer;
      setActiveTileLayer('streets');
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: height,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--slate-200)',
        boxShadow: 'var(--shadow-sm)',
        backgroundColor: '#e2e8f0',
      }}
    >
      {/* Map Target DOM Container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />

      {/* Floating Map Controls Top-Right */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={handleLocateUser}
            className="btn btn-secondary"
            style={{
              width: '40px',
              height: '40px',
              padding: 0,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--slate-200)',
              color: locatingUser ? 'var(--primary-600)' : 'var(--slate-700)',
            }}
            title="Deteksi Lokasi GPS Saya"
          >
            <Crosshair size={18} className={locatingUser ? 'spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleResetBounds}
            className="btn btn-secondary"
            style={{
              width: '40px',
              height: '40px',
              padding: 0,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--slate-200)',
              color: 'var(--slate-700)',
            }}
            title="Pusatkan Seluruh Titik Laporan"
          >
            <Maximize2 size={18} />
          </button>

          <button
            type="button"
            onClick={handleToggleLayer}
            className="btn btn-secondary"
            style={{
              width: '40px',
              height: '40px',
              padding: 0,
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeTileLayer === 'topo' ? 'var(--primary-50)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: activeTileLayer === 'topo' ? 'var(--primary-400)' : 'var(--slate-200)',
              color: activeTileLayer === 'topo' ? 'var(--primary-700)' : 'var(--slate-700)',
              backdropFilter: 'blur(8px)',
              boxShadow: 'var(--shadow-md)',
            }}
            title={activeTileLayer === 'streets' ? 'Beralih ke Tampilan Citra Satelit' : 'Beralih ke Peta Jalan Standar'}
          >
            <Layers size={18} />
          </button>
        </div>
      )}

      {/* Floating Map Legend Bottom-Left */}
      {showLegend && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            zIndex: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(10px)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: 'var(--shadow-md)',
            maxWidth: '340px',
            fontSize: '0.75rem',
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: 'var(--slate-900)',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Kategori Titik Aduan ({reports.length} Laporan)</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--primary-700)', fontWeight: 700 }}>
              Klik Pin Untuk Detail
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '6px 12px',
            }}
          >
            {Object.entries(CATEGORY_COLORS).map(([catName, config]) => (
              <div key={catName} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: config.bg,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: 'var(--slate-700)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {config.icon} {catName}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--slate-500)', fontSize: '0.6875rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
            <span>Titik Merah Berkedip = Urgensi Darurat</span>
          </div>
        </div>
      )}
    </div>
  );
}
