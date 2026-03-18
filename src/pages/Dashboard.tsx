import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    facultyCount: 0,
    courseCount: 0,
    workloadCount: 0,
    totalHours: 0
  });

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [facultyRes, coursesRes, workloadsRes] = await Promise.all([
          fetch('/api/faculty', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/workloads', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const faculty = await facultyRes.json();
        const courses = await coursesRes.json();
        const workloads = await workloadsRes.json();

        const totalHours = workloads.reduce((acc: number, w: any) => acc + (w.l || 0) + (w.t || 0) + (w.p || 0), 0);

        setStats({
          facultyCount: faculty.length,
          courseCount: courses.length,
          workloadCount: workloads.length,
          totalHours
        });

        // Prepare chart data (hours per faculty)
        const facultyHours: Record<string, number> = {};
        workloads.forEach((w: any) => {
          facultyHours[w.facultyName] = (facultyHours[w.facultyName] || 0) + (w.l || 0) + (w.t || 0) + (w.p || 0);
        });

        const formattedChartData = Object.entries(facultyHours).map(([name, hours]) => ({ name, hours }));
        setChartData(formattedChartData.slice(0, 8)); // Top 8 for display
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };

    fetchStats();
  }, [token]);

  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user?.name}</h1>
          <p className="text-slate-500 mt-1">Here's what's happening in the department today.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="bg-green-100 p-2 rounded-lg text-green-600">
            <CheckCircle2 size={20} />
          </div>
          <span className="text-sm font-medium text-slate-700 pr-4">System Online</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Faculty', value: stats.facultyCount, icon: Users, color: 'bg-indigo-500', shadow: 'shadow-indigo-100' },
          { label: 'Active Courses', value: stats.courseCount, icon: BookOpen, color: 'bg-violet-500', shadow: 'shadow-violet-100' },
          { label: 'Assignments', value: stats.workloadCount, icon: Calendar, color: 'bg-fuchsia-500', shadow: 'shadow-fuchsia-100' },
          { label: 'Total Hours', value: stats.totalHours, icon: Clock, color: 'bg-rose-500', shadow: 'shadow-rose-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-xl text-white ${stat.shadow} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <TrendingUp size={20} className="text-green-500" />
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">Workload Distribution</h3>
            <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Current Semester</option>
              <option>Previous Semester</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h3>
          <div className="space-y-4">
            <button className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Users size={20} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">Add Faculty</p>
                <p className="text-xs text-slate-500">Register new staff member</p>
              </div>
            </button>
            <button className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50 transition-all group">
              <div className="bg-violet-100 p-2 rounded-lg text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all">
                <BookOpen size={20} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">New Course</p>
                <p className="text-xs text-slate-500">Add subject to catalog</p>
              </div>
            </button>
            <button className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-fuchsia-200 hover:bg-fuchsia-50 transition-all group">
              <div className="bg-fuchsia-100 p-2 rounded-lg text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white transition-all">
                <Calendar size={20} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">Assign Workload</p>
                <p className="text-xs text-slate-500">Allocate hours to faculty</p>
              </div>
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">System Status</h4>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Database</span>
                <span className="font-medium text-slate-700">Connected</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Storage</span>
                <span className="font-medium text-slate-700">92% Free</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Last Backup</span>
                <span className="font-medium text-slate-700">2h ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
