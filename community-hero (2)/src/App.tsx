import { useState, useEffect } from 'react';
import { Issue, ViewTab } from './types';
import IssueMap from './components/IssueMap';
import AdminDashboard from './components/AdminDashboard';
import CitizenProfile from './components/CitizenProfile';
import ReportIssueModal from './components/ReportIssueModal';
import AIAdvisorChat from './components/AIAdvisorChat';
import CityHealthIndex from './components/CityHealthIndex';
import { 
  Compass, 
  ShieldAlert, 
  User, 
  Plus, 
  MapPin, 
  Building2, 
  FlameKindling,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { calculateDistance } from './lib/distance';
import { messaging, getToken, onMessage, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, db } from './firebaseClient';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('citizen-map');
  const [userRole, setUserRole] = useState<'citizen' | 'municipality' | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [citizenName, setCitizenName] = useState<string>('');
  const [citizenPoints, setCitizenPoints] = useState<number>(0);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [tempName, setTempName] = useState('');

  const [issues, setIssues] = useState<Issue[]>([]);

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReseeding, setIsReseeding] = useState(false);
  
  // User Location Filter State
  const [userHomeLat, setUserHomeLat] = useState<number | null>(null);
  const [userHomeLng, setUserHomeLng] = useState<number | null>(null);
  const filterRadius = 5; // Fixed 5km radius
  const [userMobile, setUserMobile] = useState<string>('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  
  // Use the User Email injected into the environment
  const userEmail = "rajujetti777@gmail.com";

  // Load issues from server on mount
  const fetchIssues = async () => {
    try {
      const response = await fetch('/api/issues');
      if (response.ok) {
        const data = await response.json();
        setIssues(data);
      } else {
        console.error("Failed to load issues");
      }
    } catch (err) {
      console.error("Fetch issues error:", err);
    }
  };

  useEffect(() => {
    fetchIssues();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCitizenName(userData.name || user.displayName || '');
          setCitizenPoints(userData.points || 0);
          if (!userData.name && !user.displayName) {
             setIsNameModalOpen(true);
          }
        } else {
          setCitizenName(user.displayName || '');
          setCitizenPoints(0);
          await setDoc(userDocRef, {
            name: user.displayName || '',
            points: 0,
            isPublic: true,
            createdAt: new Date().toISOString()
          });
          if (!user.displayName) {
             setIsNameModalOpen(true);
          }
        }
      }
    });

    // Setup Firebase Cloud Messaging for Push Notifications
    const setupFCM = async () => {
      if (!messaging) return;
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // In a real app we'd pass vapidKey to getToken
          const token = await getToken(messaging, { 
            vapidKey: 'BCV3W8BIfbH1i02JtA5X0H0yCmrk9sHIfV43t0fUo4fFvP8n5_fJ6P6dF7b5-Z9d8V9s-X1s-fJ6P6dF7b5-Z9d8V9s-X1s' 
          }).catch(() => null);
          
          if (token) {
            // Send token to backend to associate with this user
            await fetch('/api/users/fcm-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userEmail, token })
            });
          }

          onMessage(messaging, (payload) => {
            console.log('FCM Message received in foreground:', payload);
            if (payload.notification) {
              new Notification(payload.notification.title || 'Update', {
                body: payload.notification.body,
                icon: '/vite.svg'
              });
              // Refresh issues to reflect new status
              fetchIssues();
            }
          });
        }
      } catch (error) {
        console.error('FCM Setup Error:', error);
      }
    };
    
    setupFCM();
  }, []);

  // Community upvote trigger
  const handleUpvote = async (id: string) => {
    try {
      const response = await fetch(`/api/issues/${id}/upvote`, {
        method: 'POST',
      });
      if (response.ok) {
        // Optimistic state updates can sometimes cause jumps, direct synchronization is safer and fast.
        await fetchIssues();
      }
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  // Community peer verification trigger
  const handleVerify = async (id: string, lat?: number, lng?: number) => {
    try {
      const userId = localStorage.getItem('civic_user_id') || ('user_' + Math.random().toString(36).substring(2, 9));
      localStorage.setItem('civic_user_id', userId);
      
      const response = await fetch(`/api/issues/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, lat, lng })
      });
      if (response.ok) {
        const updatedIssue = await response.json();
        await fetchIssues();
        setSelectedIssue(prev => prev?._id === id ? updatedIssue : prev);
      } else {
        const text = await response.text();
        let err;
        try { err = JSON.parse(text); } catch (e) { err = { error: text }; }
        alert(err.error || "Verification failed");
      }
    } catch (err) {
      console.error("Verification failed:", err);
    }
  };

  // Admin status update trigger (Dispatch/Resolve)
  const handleUpdateStatus = async (id: string, status: 'Open' | 'Verifying' | 'Resolved') => {
    try {
      const response = await fetch(`/api/issues/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        await fetchIssues();
      }
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  // Admin ignore trigger (Deletes issue)
  const handleIgnoreIssue = async (id: string) => {
    if (!window.confirm("Are you sure you want to ignore and permanently delete this report?")) {
      return;
    }
    try {
      const response = await fetch(`/api/issues/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSelectedIssue(null);
        await fetchIssues();
      }
    } catch (err) {
      console.error("Deletion failed:", err);
    }
  };

  // Database reseed trigger
  const handleReseedData = async () => {
    setIsReseeding(true);
    try {
      const response = await fetch('/api/issues/reseed', {
        method: 'POST',
      });
      if (response.ok) {
        setSelectedIssue(null);
        await fetchIssues();
        alert("Municipal database has been restored to default Indian Metro seed data!");
      }
    } catch (err) {
      console.error("Reseed failed:", err);
    } finally {
      setIsReseeding(false);
    }
  };

  // Selecting an issue to pan the map
  const handleSelectIssue = (issue: Issue) => {
    setSelectedIssue(issue);
  };

  // Compute filtered issues based on user location and radius
  const filteredIssues = issues.filter(issue => {
    if (userRole === 'municipality') return true;
    if (userRole === 'citizen') {
      if (userHomeLat !== null && userHomeLng !== null && filterRadius > 0) {
        const distance = calculateDistance(userHomeLat, userHomeLng, issue.location.lat, issue.location.lng);
        return distance <= filterRadius;
      }
      return false; // Hide issues if location is not set for citizen
    }
    return true; // fallback
  });

  // Prompt for location if citizen portal is selected and no location is set
  useEffect(() => {
    if (userRole === 'citizen' && userHomeLat === null) {
      setIsLocationModalOpen(true);
    }
  }, [userRole, userHomeLat]);

  if (userRole === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 text-center bg-blue-600">
            <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-display font-black tracking-tight text-white">
              Civic<span className="text-blue-200">Pulse</span>
            </h1>
            <p className="text-blue-100 text-sm mt-2 font-medium">Select your portal access</p>
          </div>
          
          <div className="p-8 space-y-4">
            <button 
              type="button"
              onClick={async () => { 
                if (!currentUser) {
                  try {
                    await signInWithPopup(auth, googleProvider);
                  } catch (e: any) {
                    console.error("Login failed", e);
                    if (e.code === 'auth/popup-closed-by-user') return;
                    alert("Google Login failed.\n\nIf you are viewing this inside the AI Studio preview iframe, your browser might be blocking the login popup. Please open the app in a new tab using the icon in the top right to log in.");
                    return;
                  }
                }
                setUserRole('citizen'); 
                setActiveTab('citizen-map'); 
              }}
              className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-4 group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <User className="w-6 h-6 text-blue-600 group-hover:text-white" />
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-900">Citizen Portal</div>
                <div className="text-xs text-slate-500">Log in with Google to report issues</div>
              </div>
            </button>

            <button 
              type="button"
              onClick={() => { setUserRole('municipality'); setActiveTab('command-center'); }}
              className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center gap-4 group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                <ShieldAlert className="w-6 h-6 text-indigo-600 group-hover:text-white" />
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-900">Municipality Portal</div>
                <div className="text-xs text-slate-500">Command center dispatch and issue resolution</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      
      {/* Sticky Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
          
          <div className="flex items-center justify-between w-full md:w-auto">
            {/* Logo Brand */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="font-display font-black text-lg sm:text-xl tracking-tight text-slate-900">
                  Civic<span className="text-blue-600">Pulse</span>
                </span>
                <span className="hidden sm:block text-[9px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                  Municipal AI Autopilot Dispatch
                </span>
              </div>
            </div>

            {/* User Controls (Mobile) */}
            <div className="flex items-center gap-3 md:hidden">
              <button 
                onClick={() => { setUserRole(null); setActiveTab('citizen-map'); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Tab View Switcher Toolbar */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto w-full md:w-auto no-scrollbar">
            {userRole === 'citizen' && (
              <>
                <button
                  onClick={() => setActiveTab('citizen-map')}
                  className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0
                    ${activeTab === 'citizen-map' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Compass className="w-4 h-4 shrink-0" />
                  <span>Map</span>
                </button>
                <button
                  onClick={() => setActiveTab('my-profile')}
                  className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0
                    ${activeTab === 'my-profile' ? 'bg-white text-violet-600 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => setActiveTab('ai-advisor')}
                  className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0
                    ${activeTab === 'ai-advisor' ? 'bg-white text-emerald-600 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>AI Advisor</span>
                </button>
                <button
                  onClick={() => setActiveTab('city-health')}
                  className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0
                    ${activeTab === 'city-health' ? 'bg-white text-teal-600 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>Health Index</span>
                </button>
              </>
            )}

            {userRole === 'municipality' && (
              <button
                onClick={() => setActiveTab('command-center')}
                className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0
                  ${activeTab === 'command-center' ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Command Center</span>
              </button>
            )}
          </nav>

          {/* User Controls (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={() => { setUserRole(null); setActiveTab('citizen-map'); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Application Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        
        {/* Swappable Views Render Logic */}
        {activeTab === 'citizen-map' && (
          <div className="w-full h-auto md:h-[calc(100vh-180px)] md:min-h-[500px] flex flex-col-reverse md:flex-row gap-6 relative">
            
            {/* Sidebar with active complaints list */}
            <div className="w-full md:w-80 h-[400px] md:h-auto shrink-0 flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 shadow-md p-4 space-y-4">
              <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-sm text-slate-900 tracking-wide uppercase">
                      Active Ward Issues
                    </h2>
                    <p className="text-[10px] text-slate-400 font-semibold font-mono uppercase tracking-wider">
                      {filteredIssues.filter(i => i.status !== 'Resolved').length} Active Reports
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setIsLocationModalOpen(true)}
                      className={`p-1.5 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer text-[10px] font-bold uppercase tracking-wide
                        ${userHomeLat ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                      title="Set location filter"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {userHomeLat ? `${filterRadius}km Radius` : 'Location'}
                    </button>
                    <button 
                      onClick={fetchIssues}
                      className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Refresh Complaint List"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* List container */}
                <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                  {filteredIssues.filter(i => i.status !== 'Resolved').length > 0 ? (
                    filteredIssues.filter(i => i.status !== 'Resolved').map((issue) => (
                      <button
                        key={issue._id}
                        onClick={() => handleSelectIssue(issue)}
                        className={`w-full p-3 rounded-xl border text-left flex gap-3 transition-all cursor-pointer
                          ${selectedIssue?._id === issue._id 
                            ? 'bg-blue-50/50 border-blue-500 shadow-sm' 
                            : 'bg-slate-50/40 hover:bg-slate-50 border-slate-150'}`}
                      >
                        {/* Thumbnail image */}
                        <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200/80 shrink-0">
                          {issue.imageBase64 ? (
                            <img 
                              src={issue.imageBase64.startsWith('data:') ? issue.imageBase64 : `data:image/jpeg;base64,${issue.imageBase64}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img 
                              src={issue.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Title and stats */}
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <p className="font-bold text-xs text-slate-950 line-clamp-1 flex-1">
                              {issue.title}
                            </p>
                            <span className={`inline-flex px-1.5 py-0.5 rounded-[3px] text-[8px] font-black uppercase tracking-wider text-white shrink-0
                              ${issue.severity === 'Critical' ? 'bg-rose-600' :
                                issue.severity === 'High' ? 'bg-orange-500' :
                                issue.severity === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            >
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1 italic">
                            {issue.description}
                          </p>
                          <div className="flex items-center justify-between pt-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            <span className="font-mono text-blue-600 font-black">{issue.category}</span>
                          </div>
                          {issue.status === 'Verifying' && (
                            <div className="mt-1.5 space-y-1">
                              <div className="flex justify-between text-[8px] font-bold uppercase text-slate-500">
                                <span>Verification Progress</span>
                                <span>{issue.peerVerifications || 0}/3</span>
                              </div>
                              <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 transition-all duration-500" 
                                  style={{ width: `${Math.min(((issue.peerVerifications || 0) / 3) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-500 font-semibold text-xs border border-dashed border-slate-200 rounded-xl space-y-1">
                      <p>
                        No issue reported in your area.{' '}
                        <button 
                          onClick={() => setIsModalOpen(true)}
                          className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                        >
                          Report an issue?
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Float Trigger Trigger Inside Sidebar (Mobile-friendly Layout) */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/10 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Plus className="w-5 h-5 shrink-0" />
                <span>Report Infrastructure Issue</span>
              </button>
            </div>

            {/* Interactive Leaflet National Map (Full Flex Height) */}
            <div className="w-full min-h-[400px] h-[500px] md:h-full md:flex-1">
              <IssueMap
                issues={filteredIssues}
                selectedIssue={selectedIssue ? issues.find(i => i._id === selectedIssue._id) || selectedIssue : null}
                onVerify={handleVerify}
                onSelectIssue={handleSelectIssue}
                userHomeLat={userHomeLat}
                userHomeLng={userHomeLng}
                filterRadius={filterRadius}
              />
            </div>
            
          </div>
        )}

        {activeTab === 'command-center' && (
          <AdminDashboard
            issues={issues}
            onUpdateStatus={handleUpdateStatus}
            onIgnoreIssue={handleIgnoreIssue}
            onReseedData={handleReseedData}
            isReseeding={isReseeding}
          />
        )}

        {activeTab === 'my-profile' && (
          <CitizenProfile
            issues={issues.filter(i => currentUser && i.reporter?.uid === currentUser.uid)}
            userEmail={currentUser?.email || userEmail}
            citizenName={citizenName}
            citizenPoints={citizenPoints}
          />
        )}

        {activeTab === 'ai-advisor' && (
          <AIAdvisorChat />
        )}

        {activeTab === 'city-health' && (
          <CityHealthIndex issues={issues} />
        )}

      </main>

      {/* Location Filter Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
            <h2 className="text-lg font-bold font-display text-slate-900 mb-4">Set Citizen Location</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Mobile Number (Optional)</label>
                <input 
                  type="tel" 
                  value={userMobile}
                  onChange={e => setUserMobile(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <p className="text-[10px] text-slate-500 mt-1">We will send critical updates to your local area.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Home Coordinates</label>
                {userHomeLat && userHomeLng ? (
                  <div className="text-sm font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                    {userHomeLat.toFixed(4)}, {userHomeLng.toFixed(4)}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic">No location set. Please set your location to view nearby issues.</div>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setUserHomeLat(pos.coords.latitude);
                          setUserHomeLng(pos.coords.longitude);
                        },
                        (err) => alert("Could not fetch location: " + err.message)
                      );
                    } else {
                      alert("Geolocation is not supported by your browser.");
                    }
                  }}
                  className="mt-2 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs uppercase tracking-wide transition-colors cursor-pointer"
                >
                  📍 Detect My Current Location
                </button>
                <p className="text-[10px] text-slate-500 mt-2 text-center leading-tight">Note: Your location is securely used only to load relevant issues in your area. Your location data is not permanently stored.</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setUserHomeLat(null);
                  setUserHomeLng(null);
                  setUserMobile('');
                  setIsLocationModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Clear Filter
              </button>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name Input Modal Overlay */}
      {isNameModalOpen && currentUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
            <h2 className="text-lg font-bold font-display text-slate-900 mb-2">Welcome to CivicPulse!</h2>
            <p className="text-sm text-slate-500 mb-6">Please enter your name to complete your profile.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                disabled={!tempName.trim()}
                onClick={async () => {
                  if (tempName.trim()) {
                    setCitizenName(tempName.trim());
                    setIsNameModalOpen(false);
                    try {
                      await updateDoc(doc(db, 'users', currentUser.uid), {
                        name: tempName.trim()
                      });
                    } catch (e) {
                      console.error("Failed to update name", e);
                    }
                  }
                }}
                className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal Overlay */}
      <ReportIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onIssueCreated={async (newIssue) => {
          if (currentUser) {
            try {
               await updateDoc(doc(db, 'users', currentUser.uid), {
                 points: increment(100)
               });
               setCitizenPoints(prev => prev + 100);
            } catch(e) {}
          }
          setSelectedIssue(newIssue);
          await fetchIssues();
        }}
        currentUser={currentUser}
        citizenName={citizenName}
      />
    </div>
  );
}
