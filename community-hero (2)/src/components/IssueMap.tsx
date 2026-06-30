import React, { useState, useEffect } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  useAdvancedMarkerRef, 
  useMap,
  MapControl,
  ControlPosition
} from '@vis.gl/react-google-maps';
import { Issue } from '../types';
import { Shield, Sparkles, MapPin, Calendar, Clock, Compass, HelpCircle, Building, AlertTriangle, ExternalLink, X, CheckCircle2, Play, Loader2 } from 'lucide-react';

interface IssueMapProps {
  issues: Issue[];
  selectedIssue: Issue | null;
  onVerify?: (id: string, lat?: number, lng?: number) => void;
  onSelectIssue: (issue: Issue) => void;
  userHomeLat?: number | null;
  userHomeLng?: number | null;
  filterRadius?: number;
}

// 1. Resolve API Key from process.env (or VITE_ fallback)
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim() !== '';

// Map Reachability Layer (Gray out unreachable areas)
function MapReachabilityLayer({ 
  userLat, 
  userLng, 
  radiusKm 
}: { 
  userLat: number | null; 
  userLng: number | null; 
  radiusKm: number;
}) {
  const map = useMap();
  const [polygon, setPolygon] = useState<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map) return;
    const poly = new google.maps.Polygon({
      map,
      strokeOpacity: 0,
      strokeWeight: 0,
      fillColor: '#000000',
      fillOpacity: 0.5,
      clickable: false,
    });
    setPolygon(poly);
    return () => {
      poly.setMap(null);
    };
  }, [map]);

  useEffect(() => {
    if (!polygon) return;
    if (userLat === null || userLng === null || radiusKm <= 0) {
      polygon.setPaths([]); // clear
      return;
    }
    
    // Outer bounds covering the whole map (Clockwise)
    const outerCoords = [
      { lat: 90, lng: -180 },
      { lat: 90, lng: 180 },
      { lat: -90, lng: 180 },
      { lat: -90, lng: -180 },
      { lat: 90, lng: -180 },
    ];

    // Inner hole representing the radius
    // We approximate a circle with polygon points
    const points = 64;
    const innerCoords = [];
    const earthRadiusKm = 6371;
    const d = radiusKm / earthRadiusKm;
    const lat1 = (Math.PI / 180) * userLat;
    const lng1 = (Math.PI / 180) * userLng;

    // Counter-Clockwise hole
    for (let i = points; i >= 0; i--) {
      const tc = (2 * Math.PI * i) / points;
      const lat = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(tc));
      const lng = lng1 + Math.atan2(Math.sin(tc) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat));
      innerCoords.push({ lat: lat * (180 / Math.PI), lng: lng * (180 / Math.PI) });
    }

    polygon.setPaths([outerCoords, innerCoords]);

  }, [polygon, userLat, userLng, radiusKm]);

  return null;
}

// 2. Controller component to pan & zoom Google Maps smoothly
function MapCenterController({ selectedIssue }: { selectedIssue: Issue | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (selectedIssue) {
      const lat = selectedIssue.location?.lat || parseFloat(selectedIssue.latitude);
      const lng = selectedIssue.location?.lng || parseFloat(selectedIssue.longitude);
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        map.panTo({ lat, lng });
        map.setZoom(15);
      }
    } else {
      // broad center over India
      map.panTo({ lat: 20.5937, lng: 78.9629 });
      map.setZoom(5);
    }
  }, [selectedIssue, map]);

  return null;
}

// 3. Isolated Marker with InfoWindow anchor to prevent state pollution
function IssueMarker({ 
  issue, 
  isSelected, 
  onSelect, 
  onVerify
}: { 
  key?: React.Key | string;
  issue: Issue; 
  isSelected: boolean; 
  onSelect: () => void; 
  onVerify?: (id: string, lat?: number, lng?: number) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);

  // Sync selection state to keep popup open
  useEffect(() => {
    if (isSelected) {
      setIsInfoWindowOpen(true);
    } else {
      setIsInfoWindowOpen(false);
    }
  }, [isSelected]);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const currentUserId = localStorage.getItem('civic_user_id');
  const hasUserVerified = issue.verifierIds?.includes(currentUserId || '');

  const handleVerifyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onVerify || issue.verifiedByCitizens || hasUserVerified) return;
    
    setIsVerifying(true);
    setVerifyError(null);

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      setIsVerifying(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onVerify(issue._id, latitude, longitude);
        setIsVerifying(false);
      },
      (error) => {
        alert("Failed to get your location for verification.");
        setIsVerifying(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };
  
  const lat = issue.location?.lat || parseFloat(issue.latitude) || 20.5937;
  const lng = issue.location?.lng || parseFloat(issue.longitude) || 78.9629;

  let colorClass = 'bg-emerald-500';
  let pulseColorClass = 'bg-emerald-400';
  
  if (issue.severity === 'Critical') {
    colorClass = 'bg-rose-600';
    pulseColorClass = 'bg-rose-500';
  } else if (issue.severity === 'High') {
    colorClass = 'bg-orange-500';
    pulseColorClass = 'bg-orange-400';
  } else if (issue.severity === 'Medium') {
    colorClass = 'bg-amber-500';
    pulseColorClass = 'bg-amber-400';
  }

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat, lng }}
        title={issue.title}
        onClick={() => {
          onSelect();
          setIsInfoWindowOpen(true);
        }}
      >
        {/* Custom styled animated HTML Marker (CF3: needs explicit width/height) */}
        <div 
          className="relative flex items-center justify-center cursor-pointer"
          style={{ width: '32px', height: '32px' }}
        >
          <span className={`animate-ping absolute inline-flex h-6 w-6 rounded-full ${pulseColorClass} opacity-60`}></span>
          <span className={`relative inline-flex rounded-full h-4.5 w-4.5 ${colorClass} border-2 border-white shadow-md`}></span>
        </div>
      </AdvancedMarker>

      {isInfoWindowOpen && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => {
            setIsInfoWindowOpen(false);
          }}
          // Ensure it's rendered cleanly within the map
          headerDisabled={true}
        >
          <div className="p-1 font-sans w-72 sm:w-80 max-w-[340px] text-slate-800">
            {/* Evidence Media Banner */}
            <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-100 mb-2 border border-slate-250 flex items-center justify-center">
              {issue.videoBase64 ? (
                <video
                  src={issue.videoBase64.startsWith('data:') ? issue.videoBase64 : `data:video/mp4;base64,${issue.videoBase64}`}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : issue.videoUrl ? (
                <video
                  src={issue.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : issue.imageBase64 ? (
                <img
                  src={issue.imageBase64.startsWith('data:') ? issue.imageBase64 : `data:image/jpeg;base64,${issue.imageBase64}`}
                  alt={issue.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <img
                  src={issue.imageUrl}
                  alt={issue.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              
              {/* Severity Badge overlay */}
              <div className="absolute top-2 right-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white shadow-sm
                  ${issue.severity === 'Critical' ? 'bg-rose-600' :
                    issue.severity === 'High' ? 'bg-orange-500' :
                    issue.severity === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                >
                  {issue.severity}
                </span>
              </div>

              {/* Community Verification Badge overlay */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {issue.verifiedByCitizens ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/90 backdrop-blur-sm text-[10px] font-black text-white shadow-sm uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    <span>Community Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-[9px] font-bold text-white shadow-sm">
                    <span>{issue.peerVerifications || 0}/3 Peer Verifications</span>
                  </span>
                )}
              </div>

              {/* Category pill overlay */}
              <div className="absolute bottom-2 left-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-[10px] font-medium text-white">
                  {issue.category}
                </span>
              </div>
            </div>

            {/* Header Title */}
            <h3 className="font-display font-bold text-sm text-slate-900 line-clamp-1 mb-2">
              {issue.title}
            </h3>

            {/* Verify Action - Moved up for efficiency */}
            <div className="mb-3">
              <button
                type="button"
                onClick={handleVerifyClick}
                disabled={issue.verifiedByCitizens || isVerifying || hasUserVerified}
                className={`w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-[11px] shadow-sm cursor-pointer transition-all active:scale-95 border
                  ${(issue.verifiedByCitizens || isVerifying || hasUserVerified)
                    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'}`}
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {isVerifying ? 'Acquiring Location & Verifying...' : issue.verifiedByCitizens ? 'Community Verified' : hasUserVerified ? 'Already Verified' : `Verify On-Site (${issue.peerVerifications || 0}/3)`}
                </span>
              </button>
            </div>

            {/* AI Summary and Dispatch Info */}
            <div className="bg-slate-50 border border-slate-150 p-2 rounded-md mb-2">
              <div className="flex items-start gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="text-[9px] font-bold text-blue-800 uppercase tracking-wider font-display">AI Triage Classification</p>
                  <p className="text-[10px] font-semibold text-slate-800 leading-tight">
                    {issue.issueType || 'General Civic Hazard'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-1 mt-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-bold text-indigo-800 uppercase tracking-wider font-display">Assigned Department</p>
                  <p className="text-[10px] font-semibold text-slate-700 leading-tight">
                    {issue.targetDepartment || 'Municipal General Board'}
                  </p>
                </div>
              </div>
            </div>

            {/* Recommended Action */}
            <div className="text-[10px] text-slate-600 mb-2 leading-relaxed italic bg-blue-50/50 p-1.5 rounded border-l-2 border-blue-500">
              <span className="font-bold text-blue-900 not-italic uppercase tracking-wider text-[8.5px] block mb-0.5">Recommended Dispatch Protocol</span>
              "{issue.recommendedAction}"
            </div>

            {/* Real-time status tracker */}
            <div className="mb-3 pt-2 border-t border-slate-150 font-sans">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Real-time status tracking</p>
              <div className="space-y-1.5">
                {(issue.statusTimeline || [
                  { status: 'Open', label: 'Citizen Reported', timestamp: issue.createdAt, active: true },
                  { status: 'Triage', label: 'AI Authenticated & Classified', timestamp: issue.createdAt, active: true },
                  { status: 'Verifying', label: 'Ward Supervisor Dispatched', timestamp: '', active: issue.status === 'Verifying' || issue.status === 'Resolved' },
                  { status: 'Resolved', label: 'Infrastructure Repaired & Closed', timestamp: '', active: issue.status === 'Resolved' }
                ]).map((step, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-2 text-[9.5px]">
                    <div className="flex flex-col items-center shrink-0 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${step.active ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-slate-200'}`}></div>
                      {sIdx < 3 && <div className={`w-0.5 h-3 ${step.active ? 'bg-blue-300' : 'bg-slate-100'}`}></div>}
                    </div>
                    <div className="flex-1 flex justify-between items-center text-slate-600">
                      <span className={step.active ? 'font-bold text-slate-900' : 'text-slate-400 font-medium'}>{step.label}</span>
                      {step.timestamp && (
                        <span className="text-[8.5px] text-slate-400 font-mono">
                          {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Status */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[9.5px] font-semibold text-slate-500">
                    Status: <span className={`font-bold ${issue.status === 'Resolved' ? 'text-emerald-600' : issue.status === 'Verifying' ? 'text-amber-500' : 'text-blue-600'}`}>{issue.status}</span>
                  </span>
                </div>
                
                {issue.verifiedByCitizens && (
                  <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    Verified On-Site
                  </span>
                )}
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function IssueMap({ 
issues, selectedIssue, onSelectIssue, onVerify, userHomeLat, userHomeLng, filterRadius }: IssueMapProps) {
  // If API Key is missing or invalid, display a gorgeous, contextual setup splash screen
  if (!hasValidKey) {
    return (
      <div className="w-full h-full min-h-[450px] bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden font-sans">
        {/* Subtle background grid */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]"></div>

        <div className="relative max-w-md w-full text-center space-y-6 z-10 p-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-500 shadow-lg shadow-blue-500/10">
            <Building className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-black text-2xl tracking-tight leading-none text-slate-100">
              Google Maps API Key Required
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              To activate the real-time ward visualizer and interact with hyperlocal civic complaints, you need to configure a Google Maps Platform API Key.
            </p>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-4 text-left border border-slate-850 space-y-4 text-xs">
            <p className="font-semibold text-slate-300 flex items-center gap-2 pb-2 border-b border-slate-850">
              <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black font-mono">1</span>
              <span>Acquire your platform credentials:</span>
            </p>
            <div className="pl-7 space-y-1">
              <p className="text-slate-400 leading-normal">
                Visit the Google Maps Platform console to get or generate an API key with the Maps JavaScript API enabled:
              </p>
              <a 
                href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold underline transition-colors"
              >
                Get Google Maps API Key
                <Compass className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="font-semibold text-slate-300 flex items-center gap-2 pt-2 pb-2 border-b border-slate-850">
              <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black font-mono">2</span>
              <span>Inject secret in AI Studio:</span>
            </p>
            <ul className="pl-7 space-y-1.5 text-slate-400 leading-normal list-disc list-inside">
              <li>Open <strong className="text-slate-200 font-bold">Settings</strong> (⚙️ gear icon, top-right corner)</li>
              <li>Navigate to <strong className="text-slate-200 font-bold">Secrets</strong> tab</li>
              <li>Add a secret named <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300">GOOGLE_MAPS_PLATFORM_KEY</code></li>
              <li>Paste your API key value and press Enter</li>
            </ul>
          </div>

          <div className="text-[10px] text-slate-500 font-medium">
            💡 The workspace server will automatically compile and hot-refresh. No manual page refresh is needed.
          </div>
        </div>
      </div>
    );
  }

  // broad center over India
  const defaultCenter = { lat: 20.5937, lng: 78.9629 };
  const defaultZoom = 5;

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-lg bg-slate-50">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          disableDefaultUI={false}
          mapTypeControl={false}
          gestureHandling="cooperative"
        >
          {/* Smooth auto-panning and zoom controller */}
          <MapCenterController selectedIssue={selectedIssue} />

          {/* Render reachability bounds overlay if location is set */}
          {userHomeLat !== undefined && userHomeLat !== null && userHomeLng !== undefined && userHomeLng !== null && filterRadius !== undefined && (
            <MapReachabilityLayer 
              userLat={userHomeLat} 
              userLng={userHomeLng} 
              radiusKm={filterRadius} 
            />
          )}

          {/* Floating map controls via MapControl */}
          <MapControl position={ControlPosition.TOP_LEFT}>
            <div className="flex items-start gap-4 m-2.5 ml-4 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-100 font-sans text-[11px] pointer-events-auto mt-[10px]">
                <p className="font-bold text-slate-800 mb-1.5 font-display tracking-wide uppercase text-[10px]">Severity Indicators</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block animate-pulse"></span>
                    <span className="text-slate-700 font-semibold">Critical (Severe danger/Immediate Dispatch)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
                    <span className="text-slate-700 font-medium">High (Hazardous/Fast response)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    <span className="text-slate-700">Medium (Moderate road/utilities issue)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="text-slate-700">Low (Minor aesthetic/sanitation)</span>
                  </div>
                </div>
              </div>
            </div>
          </MapControl>

          {/* Render individual markers */}
          {issues.map((issue) => (
            <IssueMarker
              key={issue._id}
              issue={issue}
              isSelected={selectedIssue?._id === issue._id}
              onSelect={() => onSelectIssue(issue)}
              onVerify={onVerify}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
