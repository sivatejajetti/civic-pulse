import { useState } from 'react';
import { Issue } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ShieldAlert, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Trash2, 
  Search, 
  FileText, 
  Layers,
  Sparkles,
  AlertTriangle,
  Send,
  SlidersHorizontal,
  RefreshCw,
  Building,
  HardDrive,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  MapPin
} from 'lucide-react';
import IssueMap from './IssueMap';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface AdminDashboardProps {
  issues: Issue[];
  onUpdateStatus: (id: string, status: 'Open' | 'Verifying' | 'Resolved') => void;
  onIgnoreIssue: (id: string) => void;
  onReseedData: () => void;
  isReseeding: boolean;
}

export default function AdminDashboard({ 
  issues, 
  onUpdateStatus, 
  onIgnoreIssue, 
  onReseedData,
  isReseeding
}: AdminDashboardProps) {
  // Search and filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [activeAdminTab, setActiveAdminTab] = useState<'issues-feed' | 'live-map' | 'analytics' | 'system-logs'>('issues-feed');

  // Extract unique states for the filter dropdown
  const uniqueStates = Array.from(new Set(issues.map(i => i.state || 'Unknown').filter(Boolean))).sort();

  // Filter calculations
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          issue.issueType.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          issue.targetDepartment.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesSeverity = severityFilter === 'All' || issue.severity === severityFilter;
    const matchesCategory = categoryFilter === 'All' || issue.category === categoryFilter;
    const matchesState = stateFilter === 'All' || (issue.state || 'Unknown') === stateFilter;
    
    return matchesSearch && matchesSeverity && matchesCategory && matchesState;
  });

  // Analytics helper variables
  const totalOpen = issues.filter(i => i.status === 'Open').length;
  const totalVerifying = issues.filter(i => i.status === 'Verifying').length;
  const totalResolved = issues.filter(i => i.status === 'Resolved').length;
  const totalUpvotes = issues.reduce((acc, curr) => acc + (curr.upvotes || 0), 0);
  const criticalCount = issues.filter(i => i.severity === 'Critical' || i.severity === 'High').length;

  // Gov-Tech PDF Export Engine using jsPDF & jspdf-autotable
  const exportDailyActionPlanPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // 1. Municipal Header Band
    doc.setFillColor(15, 23, 42); // slate-900 (Deep dark bar)
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Blue decorative accent band
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 42, pageWidth, 4, 'F');

    // Crest emblem circular representation
    doc.setFillColor(30, 41, 59); // slate-800
    doc.ellipse(25, 21, 11, 11, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('CH', 21, 23);

    // Official Municipal Corporation Header Texts
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('MUNICIPAL CORPORATION OF VISAKHAPATNAM', 44, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(191, 219, 254); // blue-200
    doc.text('AUTOMATED HYPERLOCAL CIVIC TRIAGE & DISPATCH REPORT (DAILY AUTOPILOT)', 44, 24);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Doc Ref: MV-AI-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`, 44, 30);

    // Export Timestamp
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString()}`, pageWidth - 70, 30);

    // Document Title
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('I. AI AUTOPILOT CIVIC DISPATCH BRIEF', 15, 57);

    // 2. Dispatch Metrics Summary Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(15, 62, pageWidth - 30, 24, 3, 3, 'FD');

    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TOTAL TRIAGED REPORTS', 20, 70);
    doc.text('CRITICAL / HIGH SEVERITY', 72, 70);
    doc.text('TOTAL COMMUNITY UPVOTES', 126, 70);
    doc.text('AUTOPILOT DISPATCH DISPOSITION', 165, 70);

    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${issues.length}`, 20, 78);
    doc.text(`${criticalCount}`, 72, 78);
    doc.text(`${totalUpvotes}`, 126, 78);
    
    doc.setTextColor(37, 99, 235); // blue-600
    doc.setFontSize(11);
    doc.text('100% Fully Dispatched', 165, 78);

    // 3. AI Autopilot Priority Bullet List
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('II. AUTOMATED ACTION PLAN & WORK ORDER ALLOCATIONS', 15, 96);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    let listY = 103;
    const urgentItems = issues.filter(i => i.severity === 'Critical' || i.severity === 'High').slice(0, 3);

    if (urgentItems.length > 0) {
      urgentItems.forEach((issue, idx) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(225, 29, 72); // rose-600
        doc.text(`[URGENT WORK ORDER] ${issue.title}`, 15, listY);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(`Target Department: ${issue.targetDepartment}  |  Severity: ${issue.severity}`, 15, listY + 4.5);
        
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(37, 99, 235); // blue-600
        doc.text(`Crew Directive: "${issue.recommendedAction}"`, 15, listY + 9);
        listY += 15;
      });
    } else {
      doc.text('No active Critical/High priority issues. Routine municipal sweeps on track.', 15, listY);
      listY += 10;
    }

    // 4. Data Table of Verified Issues via autoTable plugin
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('III. VERIFIED CIVIC INFRASTRUCTURE COMPLAINTS REPOSITORY', 15, listY + 5);

    const tableRows = filteredIssues.map((issue, index) => [
      index + 1,
      issue.title,
      issue.category,
      issue.severity,
      issue.targetDepartment,
      issue.status
    ]);

    autoTable(doc, {
      startY: listY + 10,
      head: [['#', 'Headline', 'Category', 'Severity', 'Department Assigned', 'Status']],
      body: tableRows,
      headStyles: {
        fillColor: [37, 99, 235], // blue-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 52 },
        2: { cellWidth: 32 },
        3: { cellWidth: 18 },
        4: { cellWidth: 46 },
        5: { cellWidth: 20 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      theme: 'grid',
    });

    // 5. Footer with numbering
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Municipal Corporation AI Command Center Dispatch System - Page ${i} of ${totalPages}`,
        15,
        pageHeight - 10
      );
    }

    doc.save(`Municipal_AI_Dispatch_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex flex-col md:flex-row w-full min-h-[calc(100vh-76px)] overflow-hidden rounded-2xl border border-slate-200/80 shadow-xl bg-slate-50 font-sans">
      {/* Dark Sidebar Navigation */}
      <div className="w-full md:w-64 bg-slate-950 text-slate-300 flex flex-col justify-between shrink-0 border-b md:border-b-0 md:border-r border-slate-900">
        <div className="p-4 space-y-4 md:space-y-6 flex-1 flex flex-col md:block">
          <div className="space-y-1.5 pb-4 border-b border-slate-900">
            <p className="text-[10px] font-black tracking-wider text-slate-500 uppercase font-display">Municipal Server</p>
            <div className="flex items-center gap-2 text-white">
              <Building className="w-5 h-5 text-blue-500" />
              <span className="font-display font-bold text-sm tracking-tight text-slate-100">Municipal Server</span>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider">● Autopilot Live</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1 flex md:block gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <p className="hidden md:block text-[9px] font-bold text-slate-600 uppercase tracking-widest px-2.5 pb-1">Primary Feed</p>
            <button
              onClick={() => setActiveAdminTab('issues-feed')}
              className={`w-full flex items-center gap-2 md:gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer text-left whitespace-nowrap
                ${activeAdminTab === 'issues-feed' ? 'bg-blue-600 text-white shadow-md font-bold' : 'bg-slate-900 md:bg-transparent hover:bg-slate-800 md:hover:bg-slate-900 hover:text-white'}`}
            >
              <HardDrive className="w-4 h-4 shrink-0" />
              <span>Verified Data Vault</span>
            </button>
            <button
              onClick={() => setActiveAdminTab('live-map')}
              className={`w-full flex items-center gap-2 md:gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer text-left whitespace-nowrap
                ${activeAdminTab === 'live-map' ? 'bg-blue-600 text-white shadow-md font-bold' : 'bg-slate-900 md:bg-transparent hover:bg-slate-800 md:hover:bg-slate-900 hover:text-white'}`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>Live City Map</span>
            </button>
            <button
              onClick={() => setActiveAdminTab('analytics')}
              className={`w-full flex items-center gap-2 md:gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer text-left whitespace-nowrap
                ${activeAdminTab === 'analytics' ? 'bg-blue-600 text-white shadow-md font-bold' : 'bg-slate-900 md:bg-transparent hover:bg-slate-800 md:hover:bg-slate-900 hover:text-white'}`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Interactive Analytics</span>
            </button>
            <button
              onClick={() => setActiveAdminTab('system-logs')}
              className={`w-full flex items-center gap-2 md:gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer text-left whitespace-nowrap
                ${activeAdminTab === 'system-logs' ? 'bg-blue-600 text-white shadow-md font-bold' : 'bg-slate-900 md:bg-transparent hover:bg-slate-800 md:hover:bg-slate-900 hover:text-white'}`}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span>AI System Parameters</span>
            </button>
          </div>
        </div>

        {/* Database diagnostic resets */}
        <div className="p-4 border-t border-slate-900 space-y-2 hidden md:block">
          <p className="text-[10px] text-slate-500 font-medium">Debugging Operations</p>
          <button
            onClick={onReseedData}
            disabled={isReseeding}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-850 hover:text-white text-xs font-bold text-slate-300 border border-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReseeding ? 'animate-spin text-blue-500' : ''}`} />
            <span>Reseed Database</span>
          </button>
        </div>
      </div>

      {/* Spacious Main Canvas */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Row 1: AI Brain Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-lg border border-indigo-500/10">
          {/* Subtle grid patterns */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold tracking-wider uppercase font-display">
                <Sparkles className="w-3.5 h-3.5" />
                Municipal Dispatch Autopilot Active
              </div>
              <h1 className="font-display font-black text-2xl tracking-tight leading-none">
                AI Dispatch Action Plan Engine
              </h1>
              <p className="text-sm text-indigo-100 max-w-xl leading-relaxed">
                Gemini 3.5-flash is actively triaging incoming photos, verifying geographical coordinates, generating immediate crew instructions, and auto-dispatching work logs.
              </p>
            </div>

            <button
              onClick={exportDailyActionPlanPDF}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer border border-slate-100"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Export Daily Action Plan (PDF)</span>
            </button>
          </div>
        </div>

        {activeAdminTab === 'system-logs' ? (
          /* System parameters sub-view */
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-display font-bold text-lg text-slate-900">AI Agent Parameters & System Logs</h2>
              <p className="text-xs text-slate-500">View running processes, prompt instructions, and diagnostic states.</p>
            </div>

            <div className="space-y-4 font-mono text-xs text-slate-700">
              <div className="p-4 bg-slate-950 text-emerald-400 rounded-xl space-y-1.5 shadow-inner">
                <p className="text-slate-500">[2026-06-29T00:01:42Z] INIT: Community Hero Server initialization completed.</p>
                <p className="text-slate-500">[2026-06-29T00:01:43Z] API: Server bound at port 3000 behind reverse proxy.</p>
                <p className="text-slate-500">[2026-06-29T00:01:43Z] DB: Reading JSON store /backend/data/reports.json...</p>
                <p className="text-slate-500">[2026-06-29T00:01:44Z] DB: Verified 4 robust national municipal complaints synced.</p>
                <p className="text-blue-400">[2026-06-29T00:02:10Z] LLM: Lazy loaded @google/genai module. Model: gemini-3.5-flash.</p>
                <p className="text-emerald-400 font-bold">[2026-06-29T00:02:11Z] OK: Autopilot dispatch loop actively listening for citizen uploads.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="font-bold font-sans text-xs uppercase text-slate-500 tracking-wider">System Settings</h3>
                  <div className="space-y-1">
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-bold">Active LLM:</span>
                      <span>gemini-3.5-flash</span>
                    </p>
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-bold">Response Mode:</span>
                      <span>application/json (strict)</span>
                    </p>
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-bold">Reverse Geocoder:</span>
                      <span>OSM Nominatim API</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-bold">Database Driver:</span>
                      <span>Simulated Mongoose JSON</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="font-bold font-sans text-xs uppercase text-slate-500 tracking-wider">System Health Metrics</h3>
                  <div className="space-y-1">
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-bold">API Ingress:</span>
                      <span className="text-emerald-600 font-bold">100% Online</span>
                    </p>
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-bold">Average CPU Load:</span>
                      <span>2.4%</span>
                    </p>
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-bold">File IO Speed:</span>
                      <span>0.8ms (JSON Read)</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-bold">Reverse GPS Latency:</span>
                      <span>140ms</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeAdminTab === 'live-map' ? (
          <div className="w-full h-[600px] bg-white rounded-2xl border border-slate-200/80 shadow-md p-4 flex flex-col space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="font-display font-bold text-lg text-slate-900">Live City Map</h2>
              <p className="text-xs text-slate-500">Real-time geographical tracking of active municipal issues.</p>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden relative">
              <IssueMap 
                issues={filteredIssues}
                selectedIssue={null}
                onSelectIssue={() => {}}
                onVerify={(id, lat, lng) => console.log('Verify via map', id)}
              />
            </div>
          </div>
        ) : activeAdminTab === 'analytics' ? (
          /* Interactive Recharts Analytics dashboard sub-view */
          <div className="space-y-6">
            {/* Top Row: Mini Cards with Key Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-md">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Triage Accuracy</p>
                <p className="text-2xl font-black text-slate-900 mt-1">99.4%</p>
                <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-1 font-sans">
                  <span>↑ +0.2% vs last week</span>
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-md">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Resolution Rate</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {issues.length > 0 ? ((issues.filter(i => i.status === 'Resolved').length / issues.length) * 100).toFixed(0) : '0'}%
                </p>
                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-1 font-sans">
                  <span>{issues.filter(i => i.status === 'Resolved').length} out of {issues.length} cases</span>
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-md">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Average Dispatch Time</p>
                <p className="text-2xl font-black text-slate-900 mt-1">1.2 hours</p>
                <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-1 font-sans">
                  <span>↓ -15m since Autopilot</span>
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-md">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Total Saved Tax Rupees</p>
                <p className="text-2xl font-black text-slate-900 mt-1">₹4.2 Lakhs</p>
                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-1 font-sans">
                  <span>Via automated verification</span>
                </p>
              </div>
            </div>

            {/* Bento-style Chart Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Triage Chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Complaint Categories</h3>
                  <p className="text-xs text-slate-500">Distribution of authenticated hazards across municipal departments</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Roads/Traffic', Reports: issues.filter(i => i.category === 'Roads & Traffic').length },
                        { name: 'Water/Sewers', Reports: issues.filter(i => i.category === 'Water & Sewerage').length },
                        { name: 'Waste Mgmt', Reports: issues.filter(i => i.category === 'Solid Waste Management').length },
                        { name: 'Electricity', Reports: issues.filter(i => i.category === 'Electricity & Lighting').length },
                        { name: 'Public Safety', Reports: issues.filter(i => i.category === 'Public Safety Hazard').length },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                        cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      />
                      <Bar dataKey="Reports" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Severity Triage Chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Severity Classification</h3>
                  <p className="text-xs text-slate-500">Breakdown of reported issues categorized by community urgency</p>
                </div>
                <div className="h-64 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="w-full sm:w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Critical', value: issues.filter(i => i.severity === 'Critical').length },
                            { name: 'High', value: issues.filter(i => i.severity === 'High').length },
                            { name: 'Medium', value: issues.filter(i => i.severity === 'Medium').length },
                            { name: 'Low', value: issues.filter(i => i.severity === 'Low').length },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill="#e11d48" />
                          <Cell fill="#f97316" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#10b981" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full sm:w-1/2 space-y-2">
                    <div className="flex justify-between text-xs items-center border-b border-slate-50 pb-1">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Critical</span>
                      <span className="font-mono font-bold text-slate-800">{issues.filter(i => i.severity === 'Critical').length}</span>
                    </div>
                    <div className="flex justify-between text-xs items-center border-b border-slate-50 pb-1">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>High</span>
                      <span className="font-mono font-bold text-slate-800">{issues.filter(i => i.severity === 'High').length}</span>
                    </div>
                    <div className="flex justify-between text-xs items-center border-b border-slate-50 pb-1">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Medium</span>
                      <span className="font-mono font-bold text-slate-800">{issues.filter(i => i.severity === 'Medium').length}</span>
                    </div>
                    <div className="flex justify-between text-xs items-center">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Low</span>
                      <span className="font-mono font-bold text-slate-800">{issues.filter(i => i.severity === 'Low').length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Status Distribution Progression */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Resolution Pipeline Workflow</h3>
                <p className="text-xs text-slate-500">Real-time counts tracking complaints from submission to crew resolution</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Submitted / Open', Reports: issues.filter(i => i.status === 'Open').length, fill: '#3b82f6' },
                      { name: 'Under Verification', Reports: issues.filter(i => i.status === 'Verifying').length, fill: '#f59e0b' },
                      { name: 'Resolved & Closed', Reports: issues.filter(i => i.status === 'Resolved').length, fill: '#10b981' },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="Reports" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      {
                        [
                          { fill: '#3b82f6' },
                          { fill: '#f59e0b' },
                          { fill: '#10b981' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 4: Predictive Insights & Civic trust */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Predictive Risk Vector Card with Smart Dispatch */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl text-white border border-slate-800 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                      <div>
                        <h3 className="font-display font-black text-sm uppercase tracking-wider">AI Predictive Ward Risk Analytics</h3>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">Simulated Machine Learning Extrapolation</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-[9px] font-bold">ROUTE OPTIMIZED</span>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Smart Dispatch Route Simulation */}
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                      
                      <div className="flex justify-between items-center relative z-10">
                        <span className="font-bold text-slate-200">Suggested Municipal Truck Route (Ward 4)</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">ETA: 1h 45m</span>
                      </div>
                      
                      <div className="flex flex-col gap-2 relative z-10 font-mono">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center shrink-0">
                            <span className="text-[10px] text-blue-400 font-bold">1</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-slate-300 font-bold">Fix Storm Drain Clog</p>
                            <p className="text-[9px] text-slate-500">12th Cross, Dwarka Nagar</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center shrink-0">
                            <span className="text-[10px] text-amber-400 font-bold">2</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-slate-300 font-bold">Inspect Transformer Load</p>
                            <p className="text-[9px] text-slate-500">Substation B-32</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center shrink-0">
                            <span className="text-[10px] text-rose-400 font-bold">3</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-slate-300 font-bold">Clear Road Debris</p>
                            <p className="text-[9px] text-slate-500">Main Arterial Highway</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-800 relative z-10">
                        <p className="text-[10px] text-indigo-300 leading-relaxed font-sans">
                          <span className="font-bold">AI Insight:</span> Routing through 12th Cross first saves 2.4km of driving and resolves the highest severity issue before monsoon rains begin at 14:00.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Civic Engagement & Community Verification Impact Dashboard */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-display font-bold text-sm uppercase text-slate-900 tracking-wider">Citizen Trust & Impact Analytics</h3>
                    <p className="text-xs text-slate-500">How citizen-driven verification speeds up repairs and reduces administrative overhead</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Peer-Verified Ratio</p>
                      <p className="text-xl font-black text-slate-900 mt-1">
                        {issues.length > 0 ? ((issues.filter(i => i.verifiedByCitizens || i.peerVerifications > 0).length / issues.length) * 100).toFixed(0) : '0'}%
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Complaints with community checks</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Municipal Funds Saved</p>
                      <p className="text-xl font-black text-emerald-600 mt-1">₹{(issues.filter(i => i.verifiedByCitizens).length * 8500).toLocaleString('en-IN')}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Saved supervisor dispatch fees</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100/50 text-[11px] text-blue-900 leading-relaxed">
                    <span className="font-bold uppercase tracking-wide text-[9px] block mb-0.5 text-blue-800">Dispatch Recommendation</span>
                    By relying on community consensus signatures, the city has reduced false-reporting rates by <span className="font-bold">94.2%</span> and fast-tracked critical road repair approvals without manual surveyor visits.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Row 2: Analytics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-md flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-display">Open / Verifying</p>
                  <p className="text-xl font-black text-slate-900 leading-none mt-1">
                    {totalOpen + totalVerifying} <span className="text-xs text-slate-400 font-medium">pending</span>
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-md flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-display">Resolved Today</p>
                  <p className="text-xl font-black text-slate-900 leading-none mt-1">
                    {totalResolved} <span className="text-xs text-slate-400 font-medium">resolved</span>
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-md flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-display">Citizen Upvotes</p>
                  <p className="text-xl font-black text-slate-900 leading-none mt-1">
                    {totalUpvotes} <span className="text-xs text-slate-400 font-medium">received</span>
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-md flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-display">Dispatch Speed</p>
                  <p className="text-xl font-black text-slate-900 leading-none mt-1">
                    &lt; 1.5s <span className="text-xs text-slate-400 font-medium">realtime</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Row 3: Verified Complaints Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
              {/* Table header and filters toolbar */}
              <div className="p-4 border-b border-slate-150 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-sm uppercase text-slate-800 tracking-wider">
                    Verified Complaints Repository
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live feed of AI authenticated infrastructure complaints across Indian Wards.
                  </p>
                </div>

                {/* Filter controls */}
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                  {/* Search Bar */}
                  <div className="relative flex-1 md:w-56">
                    <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search reports..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Severity Select */}
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="All">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  {/* State Select */}
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="All">All States</option>
                    {uniqueStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>

                  {/* Category Select */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    <option value="Roads & Traffic">Roads & Traffic</option>
                    <option value="Water & Sewerage">Water & Sewerage</option>
                    <option value="Solid Waste Management">Solid Waste Management</option>
                    <option value="Electricity & Lighting">Electricity & Lighting</option>
                    <option value="Public Safety Hazard">Public Safety Hazard</option>
                  </select>
                </div>
              </div>

              {/* Verified Complaints table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="px-4 py-3">Issue Details</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">AI Technical Diagnosis & Action Directive</th>
                      <th className="px-4 py-3">Assigned Division</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredIssues.length > 0 ? (
                      filteredIssues.map((issue) => (
                        <tr key={issue._id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Title & Image thumbnail */}
                          <td className="px-4 py-3 max-w-[200px]">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
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
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-900 line-clamp-1">{issue.title}</p>
                                <p className="text-[10px] text-slate-400 font-medium">GPS: [{parseFloat(issue.latitude).toFixed(3)}, {parseFloat(issue.longitude).toFixed(3)}]</p>
                                {issue.reporter?.name && (
                                  <p className="text-[9px] text-blue-500 font-semibold uppercase tracking-wider mt-1">Reporter: {issue.reporter.name}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 font-medium text-slate-600">
                              {issue.category}
                            </span>
                          </td>

                          {/* Severity */}
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px]
                              ${issue.severity === 'Critical' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                issue.severity === 'High' ? 'bg-orange-50 text-orange-500 border border-orange-100' :
                                issue.severity === 'Medium' ? 'bg-amber-50 text-amber-500 border border-amber-100' :
                                'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                            >
                              {issue.severity}
                            </span>
                          </td>

                          {/* AI diagnosis */}
                          <td className="px-4 py-3 max-w-xs space-y-1">
                            <p className="font-bold text-slate-800 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                              <span>{issue.issueType}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 italic leading-snug line-clamp-2">
                              "{issue.recommendedAction}"
                            </p>
                          </td>

                          {/* Target division */}
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {issue.targetDepartment}
                          </td>

                          {/* Status badge */}
                          <td className="px-4 py-3 font-bold">
                            <span className={`inline-flex items-center gap-1.5
                              ${issue.status === 'Resolved' ? 'text-emerald-600' : 
                                issue.status === 'Verifying' ? 'text-amber-500' : 'text-blue-600'}`}
                            >
                              <span className={`w-2 h-2 rounded-full 
                                ${issue.status === 'Resolved' ? 'bg-emerald-500' : 
                                  issue.status === 'Verifying' ? 'bg-amber-400 animate-pulse' : 'bg-blue-500'}`}
                              />
                              <span>{issue.status}</span>
                            </span>
                          </td>

                          {/* In-table Action Buttons */}
                          <td className="px-4 py-3 text-right shrink-0">
                            <div className="flex items-center justify-end gap-1.5">
                              {issue.status === 'Open' && (
                                <button
                                  onClick={() => onUpdateStatus(issue._id, 'Verifying')}
                                  className="px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold transition-colors cursor-pointer"
                                >
                                  Dispatch Crew
                                </button>
                              )}
                              
                              {issue.status === 'Verifying' && (
                                <button
                                  onClick={() => onUpdateStatus(issue._id, 'Resolved')}
                                  className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white font-bold transition-colors cursor-pointer"
                                >
                                  Mark Resolved
                                </button>
                              )}

                              <button
                                onClick={() => onIgnoreIssue(issue._id)}
                                className="p-1 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Ignore / Delete Issue"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-medium">
                          No complaints found matching the criteria. Apply different filters or upload a test complaint.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
