import React, { useMemo } from 'react';
import { Issue } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Activity, TrendingUp, CheckCircle, AlertOctagon } from 'lucide-react';

interface CityHealthIndexProps {
  issues: Issue[];
}

export default function CityHealthIndex({ issues }: CityHealthIndexProps) {
  // Aggregate data for resolution rates
  const stats = useMemo(() => {
    const total = issues.length;
    const resolved = issues.filter(i => i.status === 'Resolved').length;
    const open = issues.filter(i => i.status === 'Open').length;
    const verifying = issues.filter(i => i.status === 'Verifying').length;
    const critical = issues.filter(i => i.severity === 'Critical').length;
    
    return {
      total,
      resolved,
      open,
      verifying,
      critical,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0
    };
  }, [issues]);

  // Data for charts
  const categoryData = useMemo(() => {
    const categories = Array.from(new Set(issues.map(i => i.category)));
    return categories.map(cat => ({
      name: cat,
      Resolved: issues.filter(i => i.category === cat && i.status === 'Resolved').length,
      Active: issues.filter(i => i.category === cat && i.status !== 'Resolved').length,
    }));
  }, [issues]);

  // Calculate some timeline data based on createdAt (grouping by date)
  const timelineData = useMemo(() => {
    const dates = issues.reduce((acc, issue) => {
      const date = new Date(issue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!acc[date]) {
        acc[date] = { date, Reports: 0, Resolved: 0 };
      }
      acc[date].Reports += 1;
      if (issue.status === 'Resolved') {
        acc[date].Resolved += 1;
      }
      return acc;
    }, {} as Record<string, { date: string, Reports: number, Resolved: number }>);

    // Sort by date roughly (this assumes simple sorting or just return as is if all recent)
    return Object.values(dates);
  }, [issues]);

  const COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#3b82f6'];

  const severityData = useMemo(() => {
    return [
      { name: 'Critical', value: issues.filter(i => i.severity === 'Critical').length },
      { name: 'High', value: issues.filter(i => i.severity === 'High').length },
      { name: 'Medium', value: issues.filter(i => i.severity === 'Medium').length },
      { name: 'Low', value: issues.filter(i => i.severity === 'Low').length },
    ];
  }, [issues]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2">
            <Activity className="w-6 h-6 text-teal-600" />
            City Health Index
          </h1>
          <p className="text-slate-500 text-sm mt-1">Real-time infrastructure efficiency and resolution metrics.</p>
        </div>
        
        {/* Overall Health Score */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 w-full md:w-auto">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health Score</p>
            <p className="text-2xl font-black text-teal-600">{stats.resolutionRate + 20}<span className="text-sm text-slate-400 font-normal">/100</span></p>
          </div>
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-teal-600" />
          </div>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Reports</p>
            <p className="text-xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Resolved Issues</p>
            <p className="text-xl font-bold text-slate-900">{stats.resolved}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Resolution Rate</p>
            <p className="text-xl font-bold text-slate-900">{stats.resolutionRate}%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Critical Alerts</p>
            <p className="text-xl font-bold text-slate-900">{stats.critical}</p>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resolution Rate by Category (Bar Chart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-6 font-display">Resolution Status by Category</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Resolved" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Active" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution (Pie Chart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-6 font-display">Issue Severity Breakdown</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.name === 'Critical' ? '#e11d48' :
                      entry.name === 'High' ? '#f97316' :
                      entry.name === 'Medium' ? '#f59e0b' : '#10b981'
                    } />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-6 font-display">Report Volume & Resolution Trend</h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="Reports" stroke="#3b82f6" fillOpacity={1} fill="url(#colorReports)" strokeWidth={2} />
              <Area type="monotone" dataKey="Resolved" stroke="#10b981" fillOpacity={1} fill="url(#colorResolved)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
