import React, { useState, useEffect, useRef } from 'react';
import { X, Search, MapPin, Upload, Sparkles, Loader2, Compass, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Issue } from '../types';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssueCreated: (newIssue: Issue) => void;
  currentUser?: any;
  citizenName?: string;
}

export default function ReportIssueModal({ isOpen, onClose, onIssueCreated, currentUser, citizenName }: ReportIssueModalProps) {
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads & Traffic');
  const [searchQuery, setSearchQuery] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [issueState, setIssueState] = useState<string>('Unknown');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  
  // UX helper states
  const [isLocating, setIsLocating] = useState(false);
  const [isSearchingLoc, setIsSearchingLoc] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // AI Loading & Error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiStep, setAiStep] = useState(0); // 0: upload, 1: authenticating, 2: parsing, 3: dispatching
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<Issue | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close modal when Escape is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSubmitting]);

  // Click outside suggestions helper to dismiss dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced location autocomplete search via OSM Nominatim API
  useEffect(() => {
    if (searchQuery.trim().length < 4) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLoc(true);
      setErrorMsg(null);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=5&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'CommunityHeroCivicTriageApp/1.0',
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('OSM Nominatim fetch error:', err);
      } finally {
        setIsSearchingLoc(false);
      }
    }, 600); // 600ms debounce interval

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // HTML5 Geolocation GPS Locator & Reverse Geocoder
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Your browser does not support Geolocation services.');
      return;
    }

    setIsLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });

        // Reverse Geocoding via Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'CommunityHeroCivicTriageApp/1.0',
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setSearchQuery(data.display_name);
              if (data.address && data.address.state) {
                setIssueState(data.address.state);
              }
            } else {
              setSearchQuery(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            }
          } else {
            setSearchQuery(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch (err) {
          setSearchQuery(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation lookup error:', error);
        setIsLocating(false);
        alert('Could not acquire GPS fix. Please search for your street address manually.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Convert File into Base64 format
  const processImageFile = (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 25 * 1024 * 1024 : 15 * 1024 * 1024;
    
    if (file.size > maxSize) {
      alert(`File exceeds maximum size allowance of ${isVideo ? '25' : '15'}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (isVideo) {
        setVideoBase64(result);
        setImageBase64(null);
      } else {
        setImageBase64(result);
        setVideoBase64(null);
      }
    };
    reader.onerror = () => {
      alert('An error occurred while converting the file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Triggering the file picker
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Selection callback for Address Auto-suggestions
  const handleSelectSuggestion = (place: any) => {
    setSearchQuery(place.display_name);
    if (place.address && place.address.state) {
      setIssueState(place.address.state);
    }
    setCoordinates({
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
    });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Triage Submission to custom backend API with loading milestones
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordinates) {
      setErrorMsg('Please select a valid location from the search bar or use your current GPS location.');
      return;
    }
    if (!imageBase64 && !videoBase64) {
      setErrorMsg('Please upload a high-quality photo or video as evidence of the municipal damage.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessData(null);

    // Dynamic steps animation helper to make user experience highly immersive
    setAiStep(1); // Inspecting authenticity
    const stepIntervals = [
      setTimeout(() => setAiStep(2), 2200), // Classifying structural hazards
      setTimeout(() => setAiStep(3), 4500), // Assigning municipal department
    ];

    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          category,
          latitude: coordinates.lat.toString(),
          longitude: coordinates.lng.toString(),
          location: coordinates,
          state: issueState,
          imageBase64,
          videoBase64,
          reporter: currentUser ? {
            uid: currentUser.uid,
            name: citizenName || currentUser.displayName || 'Unknown Citizen'
          } : undefined
        }),
      });

      // Clear steps intervals
      stepIntervals.forEach(clearTimeout);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || errData.error || 'The server rejected this complaint submission.');
      }

      const verifiedReport = await response.json();
      setSuccessData(verifiedReport);
      onIssueCreated(verifiedReport);

      // Reset form variables
      setTitle('');
      setDescription('');
      setCategory('Roads & Traffic');
      setSearchQuery('');
      setCoordinates(null);
      setImageBase64(null);
      setVideoBase64(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Our AI could not authenticate this image as public infrastructure damage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div 
        id="report-modal"
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
            <h2 className="font-display font-bold text-lg text-slate-900">
              Report Public Infrastructure Issue
            </h2>
          </div>
          {!isSubmitting && (
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Modal Main Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isSubmitting ? (
            /* Immersive AI Triage Loader */
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-6">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
                <div className="absolute w-20 h-20 rounded-full border border-indigo-100 border-b-indigo-500 animate-reverse-spin"></div>
                <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="font-display font-bold text-xl text-slate-900">
                  AI Triage Active
                </h3>
                
                {/* Simulated AI Milestones */}
                <div className="flex flex-col items-center text-sm font-medium text-slate-500 space-y-1 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                  <p className={`flex items-center gap-1.5 ${aiStep >= 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${aiStep >= 1 ? 'opacity-100' : 'opacity-30'}`} />
                    Verifying Photo & Location Authenticity...
                  </p>
                  <p className={`flex items-center gap-1.5 ${aiStep >= 2 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${aiStep >= 2 ? 'opacity-100' : 'opacity-30'}`} />
                    Extracting structural hazard classifications...
                  </p>
                  <p className={`flex items-center gap-1.5 ${aiStep >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${aiStep >= 3 ? 'opacity-100' : 'opacity-30'}`} />
                    Assigning Municipal Dispatch department...
                  </p>
                </div>
                
                <p className="text-xs text-slate-400 italic">
                  Running server-side Gemini 3.5-flash multimodal inspection. Please hold.
                </p>
              </div>
            </div>
          ) : successData ? (
            /* Immersive Success Screen */
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-5 animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display font-bold text-xl text-slate-900">
                  Complaint Verified & Dispatched!
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Our AI engine has successfully authenticated your report, cataloged its damage, and instantly dispatched it to the responsible ward division.
                </p>
              </div>

              {/* Triage summary card */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl w-full max-w-md text-left space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Triage Diagnosis</span>
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 font-bold text-[10px] uppercase tracking-wider border border-rose-100">
                    {successData.severity} Severity
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Division</p>
                  <p className="text-xs font-semibold text-slate-800">{successData.targetDepartment}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Dispatch Summary</p>
                  <p className="text-xs text-slate-700 leading-relaxed font-mono">{successData.aiSummary}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Automated Crew Action Protocol</p>
                  <p className="text-xs text-blue-700 bg-blue-50/50 p-2 rounded border-l-2 border-blue-500 italic">
                    "{successData.recommendedAction}"
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSuccessData(null);
                  onClose();
                }}
                className="px-6 py-2 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Return to Citizen Map
              </button>
            </div>
          ) : (
            /* Actual Input Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Callout */}
              {errorMsg && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex gap-3 text-rose-800 animate-shake">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold">Inspection Notice</p>
                    <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Title & Category Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Complaint Headline
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Deep Pothole near Indiranagar bus stop"
                    className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Infrastructure Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-colors"
                  >
                    <option value="Roads & Traffic">Roads & Traffic</option>
                    <option value="Water & Sewerage">Water & Sewerage</option>
                    <option value="Solid Waste Management">Solid Waste Management</option>
                    <option value="Electricity & Lighting">Electricity & Lighting</option>
                    <option value="Public Safety Hazard">Public Safety Hazard</option>
                  </select>
                </div>
              </div>

              {/* Description box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Details / Observations
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the exact issue. Include landmarks or detail the civic danger it presents. AI will verify these notes with your photo."
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-colors resize-none"
                />
              </div>

              {/* Geolocation Input bar (Swiggy Style Search + Geocoder) */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Incident Location (India only)
                </label>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search street, locality, or ward in India..."
                      className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-colors"
                    />
                    {isSearchingLoc && (
                      <Loader2 className="absolute right-3 top-2.5 w-4.5 h-4.5 text-slate-400 animate-spin" />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    title="Get current GPS coordinates and address"
                  >
                    {isLocating ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : (
                      <Compass className="w-4 h-4 text-blue-600" />
                    )}
                    <span>GPS Fix</span>
                  </button>
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute left-0 right-0 top-[68px] z-50 max-h-52 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 py-1"
                  >
                    {suggestions.map((place, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(place)}
                        className="w-full px-4 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-start gap-2"
                      >
                        <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{place.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Coordinates Feedback */}
                {coordinates && (
                  <p className="text-[11px] font-mono font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Location pinned at GPS: [{coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}]
                  </p>
                )}
                <p className="text-[10px] text-slate-500 mt-1">Note: We ask for your location only to accurately tag the municipal issue. It is not used to track you.</p>
              </div>

              {/* Drag & Drop Evidence Photo/Video Uploader */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Evidence Photo or Video upload
                </label>

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
                    ${dragActive ? 'border-blue-500 bg-blue-50/50 scale-101' : 'border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {imageBase64 || videoBase64 ? (
                    <div className="relative w-full max-w-[240px] h-32 rounded-xl overflow-hidden bg-slate-100 shadow-sm">
                      {videoBase64 ? (
                        <video
                          src={videoBase64}
                          controls
                          className="w-full h-full object-cover"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <img
                          src={imageBase64!}
                          alt="Evidence preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageBase64(null);
                          setVideoBase64(null);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 shadow-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">
                          Drag and drop photo or video here, or <span className="text-blue-600 hover:underline">browse files</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Supports PNG, JPG, JPEG, MP4, WebM up to 25MB.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Note: Camera or photo gallery access is strictly used to upload your evidence photo.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-blue-200 animate-pulse" />
                  <span>Verify & Submit Complaint</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
