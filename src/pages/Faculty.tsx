import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, 
  Search, 
  MoreVertical, 
  Mail, 
  Phone, 
  Briefcase, 
  Building2,
  X,
  Check,
  Trash2,
  ShieldCheck,
  Eye,
  UserCog,
  History,
  Activity,
  FileUp,
  Info,
  LayoutGrid,
  List as ListIcon,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface FacultyMember {
  id: number;
  empId: string;
  name: string;
  role: string;
  designation: string;
  department: string;
  mobile: string;
  email: string;
  maxWorkload?: number;
}

const Faculty: React.FC = () => {
  const { token, user } = useAuth();
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [csvData, setCsvData] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('All Departments');
  const [filterDesignation, setFilterDesignation] = useState('All Designations');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [newFaculty, setNewFaculty] = useState({
    empId: '',
    name: '',
    role: 'faculty',
    designation: '',
    department: 'Vignan Foundation',
    mobile: '',
    email: '',
    password: '',
    maxWorkload: 40
  });

  const fetchFaculty = async () => {
    try {
      const res = await fetch('/api/faculty', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setFaculty(data);
    } catch (err) {
      console.error('Failed to fetch faculty', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAuditLogs(data);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    }
  };

  const fetchWorkloads = async () => {
    try {
      const res = await fetch('/api/workloads', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setWorkloads(data);
    } catch (err) {
      console.error('Failed to fetch workloads', err);
    }
  };

  useEffect(() => {
    fetchFaculty();
    fetchAuditLogs();
    fetchWorkloads();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/faculty', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(newFaculty)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchFaculty();
        setNewFaculty({
          empId: '',
          name: '',
          role: 'faculty',
          designation: '',
          department: 'Vignan Foundation',
          mobile: '',
          email: '',
          password: ''
        });
      }
    } catch (err) {
      console.error('Failed to add faculty', err);
    }
  };

  const handleUpdateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;
    try {
      const res = await fetch(`/api/faculty/${selectedFaculty.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(selectedFaculty)
      });
      if (res.ok) {
        setIsRoleModalOpen(false);
        fetchFaculty();
      }
    } catch (err) {
      console.error('Failed to update faculty', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this faculty member? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/faculty/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchFaculty();
      }
    } catch (err) {
      console.error('Failed to delete faculty', err);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const rows = csvData.split('\n').filter(row => row.trim());
    if (rows.length < 2) return;

    const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
    
    const parsedFaculty = rows.slice(1).map(row => {
      const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const faculty: any = {};
      headers.forEach((header, index) => {
        // Map common CSV headers to our schema
        if (header.includes('emp') || header.includes('id')) faculty.empId = values[index];
        else if (header.includes('name')) faculty.name = values[index];
        else if (header.includes('desig')) faculty.designation = values[index];
        else if (header.includes('mobile') || header.includes('phone')) faculty.mobile = values[index];
        else if (header.includes('email')) faculty.email = values[index];
        else if (header.includes('dept')) faculty.department = values[index];
      });
      
      // Defaults
      if (!faculty.role) faculty.role = 'faculty';
      if (!faculty.department) faculty.department = 'CSE';
      
      return faculty;
    }).filter(f => f.empId && f.name);

    try {
      const res = await fetch('/api/faculty/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(parsedFaculty)
      });
      if (res.ok) {
        setIsImportModalOpen(false);
        setCsvData('');
        fetchFaculty();
        fetchAuditLogs();
        alert('Bulk import successful!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to import faculty');
      }
    } catch (err) {
      console.error('Bulk import error', err);
    }
  };

  const filteredFaculty = faculty.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         f.empId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDepartment === 'All Departments' || f.department === filterDepartment;
    const matchesDesig = filterDesignation === 'All Designations' || f.designation === filterDesignation;
    const matchesRole = filterRole === 'All Roles' || f.role === filterRole.toLowerCase();
    
    return matchesSearch && matchesDept && matchesDesig && matchesRole;
  });

  const departments = Array.from(new Set(faculty.map(f => f.department).filter(Boolean)));
  const designations = Array.from(new Set(faculty.map(f => f.designation).filter(Boolean)));
  const roles = ['Faculty', 'Admin', 'Dual', 'TA'];
  const isAdminUser = user?.role === 'admin' || user?.role === 'dual';

  const getFacultyWorkload = (empId: string) => {
    const facultyWorkloads = workloads.filter(w => w.facultyId === empId);
    const l = facultyWorkloads.reduce((sum, w) => sum + (w.l || 0), 0);
    const t = facultyWorkloads.reduce((sum, w) => sum + (w.t || 0), 0);
    const p = facultyWorkloads.reduce((sum, w) => sum + (w.p || 0), 0);
    return { l, t, p, total: l + t + p };
  };

  const chartData = filteredFaculty.map(f => {
    const workload = getFacultyWorkload(f.empId);
    return {
      name: f.name.split(' ').slice(0, 2).join(' '),
      L: workload.l,
      T: workload.t,
      P: workload.p,
      Total: workload.total
    };
  }).filter(d => d.Total > 0).slice(0, 10); // Show top 10 with workload for clarity

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Faculty Management</h1>
        <div className="flex items-center gap-3">
          {isAdminUser && (
            <>
              <button 
                onClick={() => {
                  fetchAuditLogs();
                  setIsAuditModalOpen(true);
                }}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-all"
              >
                <History size={20} />
                Audit Trail
              </button>
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-all"
              >
                <FileUp size={20} />
                Bulk Import
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-100 transition-all"
              >
                <UserPlus size={20} />
                Add Faculty
              </button>
            </>
          )}
        </div>
      </div>

      {/* Workload Visualization */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Workload Distribution</h2>
            <p className="text-sm text-slate-500">L-T-P hours distribution across faculty members</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-slate-600">Lecture</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-600">Tutorial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-slate-600">Practical</span>
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                />
                <Bar dataKey="L" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} barSize={40} />
                <Bar dataKey="T" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={40} />
                <Bar dataKey="P" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Activity size={48} className="mb-4 opacity-20" />
              <p className="font-medium">No workload data available for current filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by name or employee ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 mr-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid View"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="List View"
            >
              <ListIcon size={20} />
            </button>
          </div>
          <select 
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="flex-1 md:w-44 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>All Departments</option>
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
          <select 
            value={filterDesignation}
            onChange={(e) => setFilterDesignation(e.target.value)}
            className="flex-1 md:w-44 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>All Designations</option>
            {designations.map(desig => <option key={desig} value={desig}>{desig}</option>)}
          </select>
          <select 
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="flex-1 md:w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>All Roles</option>
            {roles.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
      </div>

      {/* Faculty Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFaculty.map((member) => (
            <div 
              key={member.id} 
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group cursor-pointer"
              onClick={() => {
                setSelectedFaculty(member);
                setIsViewModalOpen(true);
              }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-xl border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    {member.name.charAt(0)}
                  </div>
                  {isAdminUser && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          setSelectedFaculty(member);
                          setIsRoleModalOpen(true);
                        }}
                        className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Edit Role"
                      >
                        <UserCog size={20} />
                      </button>
                      <button 
                        onClick={() => handleDelete(member.id)}
                        className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Faculty"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-slate-900">{member.name}</h3>
                <p className="text-sm font-medium text-indigo-600">{member.empId}</p>
                
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Briefcase size={16} className="text-slate-400" />
                    <span>{member.designation || 'Faculty'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Building2 size={16} className="text-slate-400" />
                    <span>{member.department || 'Vignan Foundation'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Mail size={16} className="text-slate-400" />
                    <span className="truncate">{member.email || 'N/A'}</span>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      <span>Workload Status</span>
                      <span className={getFacultyWorkload(member.empId).total > (member.maxWorkload || 40) ? 'text-rose-600' : 'text-indigo-600'}>
                        {getFacultyWorkload(member.empId).total} / {member.maxWorkload || 40} Hrs
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-indigo-500" 
                          style={{ width: `${(getFacultyWorkload(member.empId).l / (member.maxWorkload || 40)) * 100}%` }}
                          title={`Lecture: ${getFacultyWorkload(member.empId).l} hrs`}
                        ></div>
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${(getFacultyWorkload(member.empId).t / (member.maxWorkload || 40)) * 100}%` }}
                          title={`Tutorial: ${getFacultyWorkload(member.empId).t} hrs`}
                        ></div>
                        <div 
                          className="h-full bg-amber-500" 
                          style={{ width: `${(getFacultyWorkload(member.empId).p / (member.maxWorkload || 40)) * 100}%` }}
                          title={`Practical: ${getFacultyWorkload(member.empId).p} hrs`}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>{getFacultyWorkload(member.empId).l}L</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{getFacultyWorkload(member.empId).t}T</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{getFacultyWorkload(member.empId).p}P</span>
                      </div>
                      <span>{Math.round((getFacultyWorkload(member.empId).total / (member.maxWorkload || 40)) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                  member.role === 'admin' ? 'bg-amber-100 text-amber-700' : 
                  member.role === 'dual' ? 'bg-indigo-100 text-indigo-700' : 
                  'bg-slate-200 text-slate-600'
                }`}>
                  {member.role}
                </span>
                <button className="text-indigo-600 text-sm font-semibold hover:underline flex items-center gap-1">
                  <Eye size={14} />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Workload (L-T-P)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFaculty.map((member) => (
                  <tr 
                    key={member.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedFaculty(member);
                      setIsViewModalOpen(true);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-sm border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{member.empId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{member.designation || 'Faculty'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{member.department || 'Vignan Foundation'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 min-w-[140px]">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${getFacultyWorkload(member.empId).total > (member.maxWorkload || 40) ? 'text-rose-600' : 'text-slate-700'}`}>
                            {getFacultyWorkload(member.empId).total} / {member.maxWorkload || 40} Hrs
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {Math.round((getFacultyWorkload(member.empId).total / (member.maxWorkload || 40)) * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-indigo-500" 
                            style={{ width: `${(getFacultyWorkload(member.empId).l / (member.maxWorkload || 40)) * 100}%` }}
                          ></div>
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${(getFacultyWorkload(member.empId).t / (member.maxWorkload || 40)) * 100}%` }}
                          ></div>
                          <div 
                            className="h-full bg-amber-500" 
                            style={{ width: `${(getFacultyWorkload(member.empId).p / (member.maxWorkload || 40)) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                          <span className="text-indigo-500">{getFacultyWorkload(member.empId).l}L</span>
                          <span>•</span>
                          <span className="text-emerald-500">{getFacultyWorkload(member.empId).t}T</span>
                          <span>•</span>
                          <span className="text-amber-500">{getFacultyWorkload(member.empId).p}P</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                        member.role === 'admin' ? 'bg-amber-100 text-amber-700' : 
                        member.role === 'dual' ? 'bg-indigo-100 text-indigo-700' : 
                        member.role === 'ta' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            setSelectedFaculty(member);
                            setIsViewModalOpen(true);
                          }}
                          className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {isAdminUser && (
                          <>
                            <button 
                              onClick={() => {
                                setSelectedFaculty(member);
                                setIsRoleModalOpen(true);
                              }}
                              className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Edit Role"
                            >
                              <UserCog size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(member.id)}
                              className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete Faculty"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && selectedFaculty && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsViewModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Faculty Details</h2>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-indigo-100">
                  {selectedFaculty.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedFaculty.name}</h3>
                  <p className="text-indigo-600 font-bold">{selectedFaculty.empId}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Designation & Department</p>
                  <p className="text-slate-900 font-semibold">{selectedFaculty.designation} • {selectedFaculty.department}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Information</p>
                  <div className="space-y-1">
                    <p className="text-slate-900 font-semibold flex items-center gap-2">
                      <Mail size={14} className="text-slate-400" />
                      {selectedFaculty.email || 'N/A'}
                    </p>
                    <p className="text-slate-900 font-semibold flex items-center gap-2">
                      <Phone size={14} className="text-slate-400" />
                      {selectedFaculty.mobile || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Workload Distribution</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-indigo-600">{getFacultyWorkload(selectedFaculty.empId).l}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Lecture</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">{getFacultyWorkload(selectedFaculty.empId).t}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Tutorial</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600">{getFacultyWorkload(selectedFaculty.empId).p}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Practical</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Total Assigned</span>
                    <span className="text-sm font-bold text-indigo-600">{getFacultyWorkload(selectedFaculty.empId).total} / {selectedFaculty.maxWorkload || 40} Hrs</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">System Role</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedFaculty.role === 'admin' ? 'bg-amber-100 text-amber-700' : 
                    selectedFaculty.role === 'dual' ? 'bg-indigo-100 text-indigo-700' : 
                    selectedFaculty.role === 'ta' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {selectedFaculty.role}
                  </span>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {isRoleModalOpen && selectedFaculty && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsRoleModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Edit Faculty Settings</h2>
              <button 
                onClick={() => setIsRoleModalOpen(false)}
                className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateFaculty} className="p-8">
              <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-2xl mx-auto mb-3">
                  {selectedFaculty.name.charAt(0)}
                </div>
                <h3 className="font-bold text-slate-900">{selectedFaculty.name}</h3>
                <p className="text-sm text-slate-500">{selectedFaculty.empId}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-700">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['faculty', 'admin', 'dual', 'ta'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedFaculty({
                          ...selectedFaculty, 
                          role,
                          maxWorkload: role === 'ta' ? 20 : (selectedFaculty.maxWorkload || 40)
                        })}
                        className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all ${
                          selectedFaculty.role === role 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                            : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                        }`}
                      >
                        <span className="font-bold capitalize">{role}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-700">Max Workload (Hours)</label>
                  <input 
                    type="number"
                    value={selectedFaculty.maxWorkload}
                    onChange={(e) => setSelectedFaculty({...selectedFaculty, maxWorkload: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

              </div>

              <div className="mt-8 flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {isAuditModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsAuditModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-slate-900 p-2 rounded-lg text-white">
                  <History size={20} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Faculty Audit Trail</h2>
              </div>
              <button 
                onClick={() => setIsAuditModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-0 max-h-[70vh] overflow-y-auto">
              {auditLogs.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-6 hover:bg-slate-50 transition-all flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        log.action === 'ADD_FACULTY' ? 'bg-green-50 text-green-600' :
                        log.action === 'EDIT_FACULTY' ? 'bg-blue-50 text-blue-600' :
                        log.action === 'WORKLOAD_OVERRIDE' ? 'bg-amber-50 text-amber-600' :
                        'bg-rose-50 text-rose-600'
                      }`}>
                        <Activity size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-slate-900">{log.details}</p>
                          <span className="text-xs font-medium text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          Performed by: <span className="font-semibold text-slate-700">{log.userName}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-slate-500 font-medium">No audit logs found.</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsAuditModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                  <FileUp size={20} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Bulk Import Faculty</h2>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleBulkImport} className="p-8 space-y-6">
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                <Info size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-bold mb-1">CSV Format Requirements:</p>
                  <p>Headers should include: <code className="bg-amber-100 px-1 rounded">empId, name, designation, mobile, email</code></p>
                  <p className="mt-1 text-xs">Note: Employee ID and Name are mandatory.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Paste CSV Data</label>
                <textarea 
                  required
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-64 font-mono text-xs"
                  placeholder="empId,name,designation,mobile,email&#10;163,Dr. K.V.Krishna Kishore,Professor,9490647678,kishore@vignan.ac.in"
                />
              </div>
              
              <div className="flex items-center justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-100 transition-all"
                >
                  <Check size={20} />
                  Import Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Faculty Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Add New Faculty</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Employee ID</label>
                  <input 
                    type="text" 
                    required
                    value={newFaculty.empId}
                    onChange={(e) => setNewFaculty({...newFaculty, empId: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. FAC123"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={newFaculty.name}
                    onChange={(e) => setNewFaculty({...newFaculty, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. Dr. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Designation</label>
                  <input 
                    type="text" 
                    value={newFaculty.designation}
                    onChange={(e) => setNewFaculty({...newFaculty, designation: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. Assistant Professor"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Role</label>
                  <select 
                    value={newFaculty.role}
                    onChange={(e) => {
                      const role = e.target.value;
                      setNewFaculty({
                        ...newFaculty, 
                        role,
                        maxWorkload: role === 'ta' ? 20 : 40
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                    <option value="dual">Dual Access</option>
                    <option value="ta">TA</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <input 
                    type="email" 
                    value={newFaculty.email}
                    onChange={(e) => setNewFaculty({...newFaculty, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="john.doe@university.edu"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Mobile Number</label>
                  <input 
                    type="text" 
                    value={newFaculty.mobile}
                    onChange={(e) => setNewFaculty({...newFaculty, mobile: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Max Workload (Hrs)</label>
                  <input 
                    type="number" 
                    value={newFaculty.maxWorkload}
                    onChange={(e) => setNewFaculty({...newFaculty, maxWorkload: parseInt(e.target.value) || 40})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="40"
                  />
                </div>
              </div>
              
              <div className="mt-8 flex items-center justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-100 transition-all"
                >
                  <Check size={20} />
                  Save Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Faculty;
