import { useState, useEffect } from 'react';
import { Issue, ViewTab } from '../types';
import { 
  Award, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ThumbsUp, 
  ShieldAlert, 
  User, 
  Grid, 
  TrendingUp, 
  AlertCircle,
  Trophy,
  Medal
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebaseClient';

interface CitizenProfileProps {
  issues: Issue[];
  userEmail: string;
  citizenName?: string;
  citizenPoints?: number;
}

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  rank?: number;
}

export default function CitizenProfile({ issues, userEmail, citizenName, citizenPoints }: CitizenProfileProps) {
  const [activeTimelineTab, setActiveTimelineTab] = useState<'All' | 'Active' | 'Resolved'>('All');
  const [activeSection, setActiveSection] = useState<'achievements' | 'leaderboard'>('achievements');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    if (activeSection === 'leaderboard') {
      const fetchLeaderboard = async () => {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, orderBy('points', 'desc'), limit(10));
          const snapshot = await getDocs(q);
          const users: LeaderboardUser[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            users.push({
              id: doc.id,
              name: data.name || 'Anonymous Citizen',
              points: data.points || 0
            });
          });
          
          // Assign ranks
          users.forEach((u, idx) => u.rank = idx + 1);
          setLeaderboard(users);
        } catch (e) {
          console.error("Error fetching leaderboard", e);
        }
      };
      fetchLeaderboard();
    }
  }, [activeSection]);


  // Compute stats
  const totalReports = issues.length;
  const activeReports = issues.filter(i => i.status !== 'Resolved').length;
  const resolvedReports = issues.filter(i => i.status === 'Resolved').length;

  // Compute a gamified Civic Score
  // Base points: 100 per report, 250 per resolved report, 10 per upvote received
  const totalUpvotes = issues.reduce((acc, curr) => acc + (curr.upvotes || 0), 0);
  const civicScore = citizenPoints !== undefined ? citizenPoints : ((totalReports * 100) + (resolvedReports * 250) + (totalUpvotes * 10));
  
  // Progress towards next level
  const maxScore = 2000;
  const percentage = Math.min((civicScore / maxScore) * 100, 100);

  // Filter timeline issues
  const filteredTimeline = issues.filter(issue => {
    if (activeTimelineTab === 'Active') return issue.status !== 'Resolved';
    if (activeTimelineTab === 'Resolved') return issue.status === 'Resolved';
    return true; // 'All'
  });

  // Dynamic achievement unlocks based on reports submitted
  const achievements = [
    {
      id: 'first_responder',
      title: 'First Responder',
      desc: 'Submitted your first verified infrastructure complaint.',
      icon: Award,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      unlocked: totalReports >= 1,
    },
    {
      id: 'pothole_patrol',
      title: 'Pothole Patrol',
      desc: 'Reported a critical road hazard or deep pothole.',
      icon: ShieldAlert,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      unlocked: issues.some(i => i.category === 'Roads & Traffic' || i.issueType.toLowerCase().includes('pothole')),
    },
    {
      id: 'light_keeper',
      title: 'Light Keeper',
      desc: 'Identified a dark zone or broken utility streetlight.',
      icon: Sparkles,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      unlocked: issues.some(i => i.category === 'Electricity & Lighting' || i.issueType.toLowerCase().includes('light')),
    },
    {
      id: 'green_sentinel',
      title: 'Green Sentinel',
      desc: 'Flagged public waste accumulation or garbage overflows.',
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      unlocked: issues.some(i => i.category === 'Solid Waste Management' || i.issueType.toLowerCase().includes('garbage') || i.issueType.toLowerCase().includes('waste')),
    },
    {
      id: 'triage_agent',
      title: 'Triage Agent',
      desc: 'Reached Civic Rank Level 3 by earning 500+ points.',
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      unlocked: civicScore >= 500,
    },
    {
      id: 'civic_hero',
      title: 'Civic Hero',
      desc: 'Achieved the prestigious Gold Ward Sentinel rank.',
      icon: Trophy,
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      unlocked: civicScore >= 2000,
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Top Section: Gamified Scorecard Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User profile & Score card */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white border-2 border-blue-100 shrink-0">
              <User className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-slate-900 tracking-tight text-lg">{citizenName || 'Verified Citizen'}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
                  Verified Citizen
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{userEmail || 'rajujetti777@gmail.com'}</p>
              <p className="text-[11px] font-semibold text-slate-400">Ward Zone: 04, City Center</p>
            </div>
          </div>

          {/* Civic Impact Score ring and stats */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Filed</p>
              <p className="text-xl font-black text-slate-900">{totalReports}</p>
              <span className="text-[9px] text-slate-500 font-semibold">Reports</span>
            </div>
            
            <div className="space-y-0.5 border-x border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolved</p>
              <p className="text-xl font-black text-emerald-600">{resolvedReports}</p>
              <span className="text-[9px] text-emerald-500 font-semibold">Cleaned Wards</span>
            </div>

            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upvotes</p>
              <p className="text-xl font-black text-blue-600">{totalUpvotes}</p>
              <span className="text-[9px] text-blue-500 font-semibold">Citizen Support</span>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Civic Rank Level 4 (Triage Agent)</span>
              <span className="font-mono text-slate-500 font-bold">{civicScore} / {maxScore} pts</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold italic text-right">
              Earn 100pts per report, 250pts per resolution, 10pts per upvote to level up.
            </p>
          </div>
        </div>

        {/* Dynamic SVG Circular Score Gauge Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md flex flex-col items-center justify-center text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display mb-3">Civic Impact Factor</p>
          
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* SVG circle meter */}
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="50"
                className="stroke-slate-100"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="50"
                className="stroke-blue-600 transition-all duration-500"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray="314"
                strokeDashoffset={314 - (314 * percentage) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-900">{civicScore}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Impact score</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-semibold mt-4">
            Ranked in top <span className="font-bold text-blue-600">3% of City</span> ward responders!
          </p>
        </div>
      </div>

      {/* Sub-tab Switcher */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveSection('achievements')}
          className={`pb-2.5 px-1 font-display font-black text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2
            ${activeSection === 'achievements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
        >
          <Award className="w-4 h-4" />
          <span>My Achievements & History</span>
        </button>
        <button
          onClick={() => setActiveSection('leaderboard')}
          className={`pb-2.5 px-1 font-display font-black text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2
            ${activeSection === 'leaderboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
        >
          <Trophy className="w-4 h-4" />
          <span>Municipal Hero Leaderboard</span>
        </button>
      </div>

      {activeSection === 'achievements' ? (
        <>
          {/* Weekly Community Challenges */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 rounded-2xl p-6 shadow-xl text-white">
            <div className="flex items-center justify-between border-b border-blue-800/50 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-400" />
                <h2 className="font-display font-bold text-sm uppercase tracking-wider text-blue-50">
                  Active Weekly Challenges
                </h2>
              </div>
              <span className="text-[10px] font-bold text-blue-300 font-mono">Resets in 2d 14h</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-blue-300" />
                </div>
                <div className="flex-1 z-10">
                  <h3 className="text-xs font-bold text-white mb-1">Monsoon Prep: Drain Clearout</h3>
                  <p className="text-[10px] text-blue-200 mb-2">Report or verify 3 clogged drains before the rain hits.</p>
                  <div className="w-full bg-blue-900/50 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-400 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((issues.filter(i => i.category === 'Water & Sewerage' || i.category === 'Solid Waste Management').length / 3) * 100, 100)}%` }}></div>
                  </div>
                  <p className="text-[9px] text-blue-300 mt-1 text-right font-mono">{Math.min(issues.filter(i => i.category === 'Water & Sewerage' || i.category === 'Solid Waste Management').length, 3)}/3 Completed (+150 pts)</p>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1 z-10">
                  <h3 className="text-xs font-bold text-white mb-1">Peer Reviewer Pro</h3>
                  <p className="text-[10px] text-emerald-100/70 mb-2">Physically verify 2 pending community reports in your ward.</p>
                  <div className="w-full bg-emerald-900/50 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((issues.reduce((acc, curr) => acc + (curr.peerVerifications || 0), 0) / 2) * 100, 100)}%` }}></div>
                  </div>
                  <p className="text-[9px] text-emerald-300 mt-1 text-right font-mono">{Math.min(issues.reduce((acc, curr) => acc + (curr.peerVerifications || 0), 0), 2)}/2 Completed! (+200 pts)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Grid of Unlocked Achievement Badges */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h2 className="font-display font-bold text-sm uppercase text-slate-800 tracking-wider">
                Unlocked Civic achievements
              </h2>
              <span className="text-[10px] font-black text-blue-600 uppercase">
                {achievements.filter(a => a.unlocked).length} / {achievements.length} Unlocked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {achievements.map((badge) => {
                const IconComp = badge.icon;
                return (
                  <div 
                    key={badge.id}
                    className={`p-4 rounded-xl border flex flex-col items-center text-center space-y-2 transition-all
                      ${badge.unlocked ? 'bg-slate-50/50 border-slate-200 shadow-sm' : 'bg-slate-50/20 border-slate-100 opacity-40'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm
                      ${badge.unlocked ? badge.color : 'text-slate-400 bg-slate-100 border-slate-200'}`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-slate-800">{badge.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium leading-normal line-clamp-2">
                        {badge.desc}
                      </p>
                    </div>

                    <span className={`text-[9px] font-bold uppercase tracking-wider mt-1
                      ${badge.unlocked ? 'text-blue-600' : 'text-slate-400'}`}
                    >
                      {badge.unlocked ? '✓ Completed' : 'Locked'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabbed Timeline Feed */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md space-y-4">
            <div className="border-b border-slate-100 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="font-display font-bold text-sm uppercase text-slate-800 tracking-wider">
                Your Reporting History
              </h2>
              
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-150">
                {(['All', 'Active', 'Resolved'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTimelineTab(tab)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer
                      ${activeTimelineTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {tab} ({tab === 'All' ? totalReports : tab === 'Active' ? activeReports : resolvedReports})
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline list */}
            <div className="space-y-4">
              {filteredTimeline.length > 0 ? (
                filteredTimeline.map((item) => (
                  <div 
                    key={item._id}
                    className="p-4 rounded-xl border border-slate-150 bg-slate-50/20 hover:bg-slate-50/50 transition-all flex flex-col md:flex-row items-start justify-between gap-4"
                  >
                    {/* Image and core details */}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        {item.imageBase64 ? (
                          <img 
                            src={item.imageBase64.startsWith('data:') ? item.imageBase64 : `data:image/jpeg;base64,${item.imageBase64}`} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img 
                            src={item.imageUrl} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-xs font-black text-slate-900 leading-tight">
                            {item.title}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white
                            ${item.severity === 'Critical' ? 'bg-rose-600' :
                              item.severity === 'High' ? 'bg-orange-500' :
                              item.severity === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          >
                            {item.severity}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 max-w-xl leading-relaxed">
                          {item.description}
                        </p>

                        {/* AI Dispatch summary overlay */}
                        <div className="bg-blue-50/50 border border-blue-100/50 rounded-lg p-2 flex items-start gap-1.5 mt-2 font-sans">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] font-bold text-blue-800 uppercase tracking-wide">AI Autopilot Triage Details</p>
                            <p className="text-[10px] text-slate-700 font-medium leading-snug">
                              Verified as <span className="font-bold">{item.issueType}</span>. Dispatched directive: "{item.recommendedAction}" to <span className="font-semibold">{item.targetDepartment}</span>.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status & Support section */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 w-full md:w-auto pt-3 md:pt-0 border-t md:border-0 border-slate-100 shrink-0">
                      <div className="space-y-1 text-left md:text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Complaint Status</p>
                        <span className={`inline-flex items-center gap-1.5 font-bold text-xs
                          ${item.status === 'Resolved' ? 'text-emerald-600' : 
                            item.status === 'Verifying' ? 'text-amber-500' : 'text-blue-600'}`}
                        >
                          {item.status === 'Resolved' ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                          ) : item.status === 'Verifying' ? (
                            <Clock className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 text-blue-500" />
                          )}
                          <span>{item.status}</span>
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                        <ThumbsUp className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.upvotes || 0} Upvotes</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 border-2 border-dashed border-slate-100 rounded-xl text-center text-slate-400 font-semibold text-xs space-y-1">
                  <Award className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <p>No complaints filed in this section.</p>
                  <p className="text-[10px] text-slate-400 font-normal">Click "+ Report Infrastructure Issue" on the map tab to file your first complaint.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Leaderboard Sub-View */
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-sm uppercase text-slate-800 tracking-wider">
                City Civic Hero Leaderboard
              </h2>
              <p className="text-xs text-slate-500">
                Top responders with the highest verified impact scores across City Municipal Ward divisions.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5 text-blue-700 text-xs font-semibold">
              <Medal className="w-4 h-4 text-blue-600" />
              <span>You are ranked #3 of 1,240 citizens</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Citizen Hero</th>
                  <th className="px-4 py-3 text-right">Civic Impact Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {leaderboard.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-4 text-slate-500">Loading leaderboard...</td></tr>
                ) : leaderboard.map((row) => {
                  const isMe = row.name === citizenName || (row.points === civicScore && row.name === 'Anonymous Citizen');
                  return (
                  <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${isMe ? 'bg-blue-50/30 font-semibold' : ''}`}>
                    <td className="px-4 py-3 font-display">
                      <div className="flex items-center gap-2">
                        {row.rank === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">1st</span>
                        ) : row.rank === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">2nd</span>
                        ) : row.rank === 3 ? (
                          <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-[10px]">3rd</span>
                        ) : (
                          <span className="w-6 h-6 text-slate-400 flex items-center justify-center font-bold text-xs">{row.rank}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border 
                          ${isMe ? 'bg-blue-600 text-white border-blue-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                        >
                          {row.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{row.name}{isMe ? ' (You)' : ''}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wide">
                              {row.points >= 2000 ? 'Level 5' : row.points >= 1000 ? 'Level 4' : row.points >= 500 ? 'Level 3' : row.points >= 100 ? 'Level 2' : 'Level 1'}
                            </span>
                            <span className="text-[10px] text-blue-600 font-semibold">
                              {row.points >= 2000 ? 'Gold Ward Sentinel' : row.points >= 1000 ? 'Cleanliness Champion' : row.points >= 500 ? 'Triage Agent' : row.points >= 100 ? 'Active Reporter' : 'Citizen'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black font-display text-slate-900">{row.points} pts</td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
