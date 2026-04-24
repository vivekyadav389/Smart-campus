import { useState, useRef, useEffect } from 'react';
import { MapPin, Trash2, X, Save, PlusCircle, Map as MapIcon, Navigation, Activity } from 'lucide-react';
import { getGeofence, updateGeofence } from '../utils/mockDb';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to center map on a coordinate
const MapCenterer = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

// Custom small vertex icon for polygon points
const vertexIcon = (index) => new L.DivIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;color:white;font-weight:700;">${index + 1}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
});

// Polygon editor layer — click to add points, click vertex marker to remove
const PolygonEditorLayer = ({ points, setPoints, isEditing }) => {
    const isEditingRef = useRef(isEditing);
    useEffect(() => { isEditingRef.current = isEditing; }, [isEditing]);

    useMapEvents({
        click(e) {
            if (!isEditingRef.current) return;
            const { lat, lng } = e.latlng;
            setPoints(prev => [...prev, [lat, lng]]);
        }
    });

    return (
        <>
            {points.length >= 3 && (
                <Polygon
                    positions={points}
                    pathOptions={{
                        color: isEditing ? '#f59e0b' : '#22c55e',
                        fillColor: isEditing ? '#f59e0b' : '#22c55e',
                        fillOpacity: 0.15,
                        weight: 2,
                        dashArray: isEditing ? '6, 8' : undefined
                    }}
                />
            )}
            {points.length >= 2 && isEditing && (
                <Polyline
                    positions={[...points, points[0]]}
                    pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '4,6', opacity: 0.8 }}
                />
            )}
            {isEditing && points.map((pt, i) => (
                <Marker
                    key={`vertex-${i}`}
                    position={pt}
                    icon={vertexIcon(i)}
                    eventHandlers={{
                        click(e) {
                            if (e.originalEvent) e.originalEvent.stopPropagation();
                            setPoints(prev => prev.filter((_, idx) => idx !== i));
                        }
                    }}
                />
            ))}
        </>
    );
};

const AdminMap = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [campusCenter, setCampusCenter] = useState([19.1334, 72.9133]);
    const [polygonPoints, setPolygonPoints] = useState([]);
    const [isEditingZone, setIsEditingZone] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    
    // Admin's own live location for boundary verification
    const [adminLocation, setAdminLocation] = useState(null);
    const [adminAccuracy, setAdminAccuracy] = useState(0);
    const [isTrackingAdmin, setIsTrackingAdmin] = useState(false);

    useEffect(() => {
        const loadSettingsData = async () => {
            try {
                const geofence = await getGeofence();

                if (geofence.polygon && geofence.polygon.length > 0) {
                    setPolygonPoints(geofence.polygon);
                    const avgLat = geofence.polygon.reduce((s, p) => s + p[0], 0) / geofence.polygon.length;
                    const avgLng = geofence.polygon.reduce((s, p) => s + p[1], 0) / geofence.polygon.length;
                    setCampusCenter([avgLat, avgLng]);
                } else {
                    setCampusCenter(geofence.center || [19.1334, 72.9133]);
                }
            } catch (err) {
                console.error("Error loading geofence data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettingsData();

        // Start tracking admin position
        let watchId;
        if ('geolocation' in navigator) {
            setIsTrackingAdmin(true);
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setAdminLocation([pos.coords.latitude, pos.coords.longitude]);
                    setAdminAccuracy(pos.coords.accuracy);
                    setIsTrackingAdmin(false);
                },
                (err) => {
                    console.warn("Admin location error:", err);
                    setIsTrackingAdmin(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    const handleSearchLocation = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'SmartCollegeAttendanceApp/1.0 (hackathon-demo)'
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            if (data && data.length > 0) {
                const newLat = parseFloat(data[0].lat);
                const newLng = parseFloat(data[0].lon);
                setCampusCenter([newLat, newLng]);
            } else {
                alert("Location not found. Please try a more specific search term (e.g., 'Stanford University, CA').");
            }
        } catch (error) {
            console.error("Geocoding error:", error);
            alert("Failed to search location. The map service might be temporarily unavailable.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSaveZone = async () => {
        if (polygonPoints.length < 3) {
            alert('Please place at least 3 points on the map to define the geofence boundary.');
            return;
        }
        const success = await updateGeofence({ polygon: polygonPoints });
        if (success) {
            setIsEditingZone(false);
            alert('Campus Geofence polygon saved successfully!');
        } else {
            alert('Failed to save Geofence. Check the browser console for details and make sure the backend server is running.');
        }
    };

    if (isLoading) {
        return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading Map...</div>;
    }

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="page-title flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
                    <MapIcon className="text-primary" size={28} /> Manage Geo-Fence
                </h1>
                <p className="text-gray-500" style={{ color: 'var(--color-text-secondary)' }}>Define the physical boundaries for campus attendance</p>
            </div>

            <div className="animate-fade-in card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '650px', position: 'relative' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', zIndex: 10, flexShrink: 0 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                           <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Geo-Fence Zone Editor</h3>
                           {adminLocation && (
                               <div style={{ 
                                   fontSize: '0.7rem', 
                                   backgroundColor: '#dcfce7', 
                                   color: '#166534', 
                                   padding: '0.15rem 0.5rem', 
                                   borderRadius: '1rem', 
                                   display: 'flex', 
                                   alignItems: 'center', 
                                   gap: '0.25rem',
                                   border: '1px solid #bbf7d0',
                                   fontWeight: 600
                               }}>
                                   <Activity size={10} className="animate-pulse" /> Live Tracking Active
                               </div>
                           )}
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            {isEditingZone
                                ? `Click on the map to add boundary points. Click a numbered marker to remove it. (${polygonPoints.length} point${polygonPoints.length !== 1 ? 's' : ''} placed)`
                                : `Polygon boundary — ${polygonPoints.length} points defined.`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {isEditingZone ? (
                            <>
                                <button
                                    onClick={() => setPolygonPoints([])}
                                    className="btn btn-outline"
                                    style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                >
                                    <Trash2 size={16} /> Clear All
                                </button>
                                <button onClick={async () => {
                                    setIsEditingZone(false);
                                    const gf = await getGeofence();
                                    if (gf.polygon && gf.polygon.length > 0) setPolygonPoints(gf.polygon);
                                }} className="btn" style={{ backgroundColor: 'white', border: '1px solid var(--color-border)' }}>
                                    <X size={18} /> Cancel
                                </button>
                                <button onClick={handleSaveZone} className="btn btn-primary" style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Save size={18} /> Save Polygon
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditingZone(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <PlusCircle size={18} /> Edit Boundary
                            </button>
                        )}
                    </div>
                </div>

                {isEditingZone && (
                    <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a', zIndex: 10, flexShrink: 0, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e', whiteSpace: 'nowrap' }}>📍 Jump to:</span>
                        <input
                            type="text"
                            placeholder="Search college / location (e.g. 'IIT Bombay')"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
                            style={{ flex: 1, padding: '0.45rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #fde68a', fontSize: '0.875rem' }}
                        />
                        <button onClick={handleSearchLocation} className="btn btn-primary" disabled={isSearching} style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                            {isSearching ? 'Searching...' : 'Go'}
                        </button>
                        <span style={{ fontSize: '0.75rem', color: '#92400e' }}>💡 Hint: Click the map to plot outer boundaries.</span>
                    </div>
                )}

                <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                    <MapContainer
                        center={campusCenter}
                        zoom={17}
                        style={{ height: '100%', width: '100%', cursor: isEditingZone ? 'crosshair' : 'grab' }}
                        scrollWheelZoom={true}
                    >
                        <MapCenterer center={campusCenter} />
                        <TileLayer
                            attribution="Google Maps"
                            url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        />
                        <PolygonEditorLayer
                            points={polygonPoints}
                            setPoints={setPolygonPoints}
                            isEditing={isEditingZone}
                        />

                        {/* Admin Live Location (for verification) */}
                        {adminLocation && (
                            <>
                                <Marker 
                                    position={adminLocation} 
                                    icon={new L.DivIcon({
                                        className: 'admin-marker',
                                        html: `<div style="width:14px;height:14px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 0 10px rgba(59,130,246,0.6);"></div>`,
                                        iconSize: [14, 14],
                                        iconAnchor: [7, 7]
                                    })}
                                >
                                    <Popup>
                                        <div style={{ fontSize: '0.8rem' }}>
                                            <strong>Admin Current Location</strong><br/>
                                            Use this to verify your fence boundaries.
                                        </div>
                                    </Popup>
                                </Marker>
                                {adminAccuracy > 0 && (
                                    <Circle 
                                        center={adminLocation} 
                                        radius={adminAccuracy}
                                        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1, dashArray: '4,4' }}
                                    />
                                )}
                            </>
                        )}
                    </MapContainer>

                    {polygonPoints.length === 0 && !isEditingZone && (
                        <div style={{
                            position: 'absolute', inset: 0, zIndex: 500, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: 'rgba(255,255,255,0.7)', pointerEvents: 'none'
                        }}>
                            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                <MapPin size={40} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                                <p style={{ fontWeight: 600 }}>No geofence defined yet.</p>
                                <p style={{ fontSize: '0.875rem' }}>Click "Edit Boundary" to start drawing.</p>
                            </div>
                        </div>
                    )}
                </div>

                {polygonPoints.length > 0 && (
                    <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--color-border)', backgroundColor: '#f8fafc', flexShrink: 0, display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Vertices:</span>
                        {polygonPoints.map((pt, i) => (
                            <span key={i} style={{ fontSize: '0.72rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.15rem 0.6rem', borderRadius: '1rem', fontFamily: 'monospace' }}>
                                {i + 1}: {pt[0].toFixed(5)}, {pt[1].toFixed(5)}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminMap;
