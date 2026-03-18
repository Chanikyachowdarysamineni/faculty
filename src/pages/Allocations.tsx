
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Filter, 
  User, 
  BookOpen, 
  Clock, 
  X,
  Check,
  ChevronRight,
  AlertCircle,
  Pencil,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  ShieldCheck,
  Info,
  Download
} from 'lucide-react';
import { validateAllocation, AllocationRequest, AllocationDecision, MAX_WORKLOAD_HOURS } from '../services/allocationService';

interface Allocation {
  id: number;
  facultyId: string;
  facultyName: string;
  courseCode: string;
  courseName: string;
  year: number;
  section: string;
  l: number;
  t: number;
  p: number;
  role: string;
  position?: number;
}

const Allocations: React.FC = () => {
  const { token, user } = useAuth();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedYear, setSelectedYear] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('All Years');
  const [filterSection, setFilterSection] = useState('All Sections');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingAllocationId, setEditingAllocationId] = useState<number | null>(null);

  const [newAllocation, setNewAllocation] = useState<Partial<AllocationRequest>>({
    facultyId: '',
    role: 'Main Faculty',
    l: 0,
    t: 0,
    p: 0,
    position: 0
  });

  const [decision, setDecision] = useState<AllocationDecision | null>(null);
  const [isOverride, setIsOverride] = useState(false);

  const fetchData = async () => {
    try {
      const [allocRes, facultyRes, courseRes] = await Promise.all([
        fetch('/api/workloads', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/faculty', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/courses?limit=1000', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const allocData = await allocRes.json();
      const facultyData = await facultyRes.json();
      const courseData = await courseRes.json();

      setAllocations(Array.isArray(allocData) ? allocData : []);
      setFaculty(Array.isArray(facultyData) ? facultyData : []);
      setCourses(courseData.courses || []);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (newAllocation.facultyId && selectedCourse) {
      const req: AllocationRequest = {
        facultyId: newAllocation.facultyId,
        courseCode: selectedCourse.subjectCode,
        year: selectedYear,
        section: selectedSection,
        role: newAllocation.role as any,
        l: newAllocation.l || 0,
        t: newAllocation.t || 0,
        p: newAllocation.p || 0,
        position: newAllocation.position
      };
      
      const f = faculty.find(f => f.empId === req.facultyId);
      const existing = allocations.filter(a => 
        a.courseCode === req.courseCode && 
        a.year === req.year && 
        a.section === req.section &&
        (!isEditing || a.id !== editingAllocationId)
      );
      
      const d = validateAllocation(req, f, selectedCourse, existing, allocations);
      setDecision(d);

      // Check for override
      let isManualOverride = false;
      if (req.role === 'Main Faculty') {
        isManualOverride = req.l !== selectedCourse.l || req.t !== selectedCourse.t || req.p !== selectedCourse.p;
      } else {
        // Supporting/TA - default is 0L, and course T/P
        isManualOverride = req.l > 0 || req.t !== selectedCourse.t || req.p !== selectedCourse.p;
      }
      setIsOverride(isManualOverride);
    } else {
      setDecision(null);
      setIsOverride(false);
    }
  }, [newAllocation, selectedCourse, selectedYear, selectedSection, faculty, allocations, isEditing, editingAllocationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (decision?.status === 'REJECTED') return;

    try {
      const payload = {
        facultyId: newAllocation.facultyId,
        courseCode: selectedCourse.subjectCode,
        year: selectedYear,
        section: selectedSection,
        l: newAllocation.l || 0,
        t: newAllocation.t || 0,
        p: newAllocation.p || 0,
        role: newAllocation.role,
        position: newAllocation.position,
        isOverride
      };
      
      const url = isEditing ? `/api/workloads/${editingAllocationId}` : '/api/workloads';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingAllocationId(null);
        fetchData();
        setNewAllocation({
          facultyId: '',
          role: 'Main Faculty',
          l: 0,
          t: 0,
          p: 0,
          position: 0
        });
      }
    } catch (err) {
      console.error('Failed to save allocation', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this allocation?')) return;
    try {
      const res = await fetch(`/api/workloads/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete allocation', err);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = (c.subjectName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (c.subjectCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = filterYear === 'All Years' || c.year === parseInt(filterYear.replace('Year ', ''));
    return matchesSearch && matchesYear;
  });

  const getCourseAllocations = (courseCode: string, year: number, section: string) => {
    return allocations.filter(a => a.courseCode === courseCode && a.year === year && a.section === section);
  };

  const getComponentTotal = (courseCode: string, section: string, component: 'L' | 'T' | 'P') => {
    return allocations
      .filter(a => a.courseCode === courseCode && a.section === section)
      .reduce((sum, a) => sum + (component === 'L' ? a.l : component === 'T' ? a.t : a.p), 0);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'dual';

  const filteredAllocations = allocations.filter(a => {
    const matchesSearch = (a.facultyName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (a.courseName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (a.courseCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = filterYear === 'All Years' || a.year === parseInt(filterYear.replace('Year ', ''));
    const matchesSection = filterSection === 'All Sections' || `Section ${a.section}` === filterSection;
    const matchesRole = filterRole === 'All Roles' || a.role === filterRole;
    return matchesSearch && matchesYear && matchesSection && matchesRole;
  });

  const exportToCSV = () => {
    const headers = ['Faculty Name', 'Course Code', 'Course Name', 'Year', 'Section', 'Role', 'L', 'T', 'P', 'Total Hours'];
    const rows = filteredAllocations.map(a => [
      a.facultyName,
      a.courseCode,
      a.courseName,
      a.year,
      a.section,
      a.role,
      a.l,
      a.t,
      a.p,
      a.l + a.t + a.p
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `workload_allocations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Allocation Management</h1>
          <p className="text-slate-500 text-sm">Assign faculty to course components (L, T, P) and validate workload.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid View"
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="List View"
            >
              <ListIcon size={20} />
            </button>
          </div>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search courses..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="flex-1 md:w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>All Years</option>
            <option>Year 1</option>
            <option>Year 2</option>
            <option>Year 3</option>
            <option>Year 4</option>
          </select>
          <select 
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="flex-1 md:w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>All Sections</option>
            <option>Section A</option>
            <option>Section B</option>
            <option>Section C</option>
          </select>
          <select 
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="flex-1 md:w-40 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>All Roles</option>
            <option>Main Faculty</option>
            <option>Supporting Faculty</option>
            <option>TA</option>
          </select>
        </div>
      </div>

      {/* Course-Centric Allocation Grid or List View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCourses.map((course) => (
            <div key={course.subjectCode} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded mb-1 inline-block">
                      {course.subjectCode}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{course.subjectName}</h3>
                    <p className="text-xs text-slate-400 font-medium">Year {course.year} • {course.courseType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="text-center px-3 py-1 bg-white rounded-lg border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">L</p>
                        <p className="font-bold text-slate-900">{course.l}</p>
                     </div>
                     <div className="text-center px-3 py-1 bg-white rounded-lg border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">T</p>
                        <p className="font-bold text-slate-900">{course.t}</p>
                     </div>
                     <div className="text-center px-3 py-1 bg-white rounded-lg border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">P</p>
                        <p className="font-bold text-slate-900">{course.p}</p>
                     </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1">
                {['A', 'B', 'C'].filter(s => filterSection === 'All Sections' || `Section ${s}` === filterSection).map(section => {
                  const sectionAllocations = getCourseAllocations(course.subjectCode, course.year, section)
                    .filter(a => filterRole === 'All Roles' || a.role === filterRole);
                  
                  const lTotal = getComponentTotal(course.subjectCode, section, 'L');
                  const tTotal = getComponentTotal(course.subjectCode, section, 'T');
                  const pTotal = getComponentTotal(course.subjectCode, section, 'P');

                  const isLNearing = course.l > 0 && lTotal >= course.l;
                  const isTNearing = course.t > 0 && tTotal >= course.t;
                  const isPNearing = course.p > 0 && pTotal >= course.p;

                  return (
                    <div key={section} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <span className="w-6 h-6 bg-slate-900 text-white rounded flex items-center justify-center text-[10px]">{section}</span>
                            Section {section}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            {course.l > 0 && (
                              <div className={`w-2 h-2 rounded-full ${isLNearing ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} title={`Lecture: ${lTotal}/${course.l} hrs`} />
                            )}
                            {course.t > 0 && (
                              <div className={`w-2 h-2 rounded-full ${isTNearing ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} title={`Tutorial: ${tTotal}/${course.t} hrs`} />
                            )}
                            {course.p > 0 && (
                              <div className={`w-2 h-2 rounded-full ${isPNearing ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} title={`Practical: ${pTotal}/${course.p} hrs`} />
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <button 
                            onClick={() => {
                              setSelectedCourse(course);
                              setSelectedSection(section);
                              setSelectedYear(course.year);
                              setIsEditing(false);
                              setEditingAllocationId(null);
                              setNewAllocation({
                                facultyId: '',
                                role: 'Main Faculty',
                                l: course.l,
                                t: course.t,
                                p: course.p,
                                position: 0
                              });
                              setIsModalOpen(true);
                            }}
                            className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1"
                          >
                            <Plus size={14} />
                            Assign Faculty
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {sectionAllocations.length > 0 ? (
                          sectionAllocations.map(alloc => (
                            <div key={alloc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                                  <User size={16} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900">{alloc.facultyName}</p>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      alloc.role === 'Main Faculty' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                      {alloc.role}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                      {alloc.l > 0 ? 'Lecture' : alloc.t > 0 ? 'Tutorial' : 'Practical'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right mr-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                                    <span className={alloc.l > 0 ? 'text-indigo-600' : ''}>{alloc.l}L</span>
                                    <span>•</span>
                                    <span className={alloc.t > 0 ? 'text-emerald-600' : ''}>{alloc.t}T</span>
                                    <span>•</span>
                                    <span className={alloc.p > 0 ? 'text-amber-600' : ''}>{alloc.p}P</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-medium text-right mt-0.5">{alloc.l + alloc.t + alloc.p} total hrs</p>
                                </div>
                                {isAdmin && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => {
                                        setSelectedCourse(course);
                                        setSelectedSection(section);
                                        setSelectedYear(course.year);
                                        setNewAllocation({
                                          facultyId: alloc.facultyId,
                                          role: alloc.role as any,
                                          l: alloc.l,
                                          t: alloc.t,
                                          p: alloc.p,
                                          position: alloc.position
                                        });
                                        setIsEditing(true);
                                        setEditingAllocationId(alloc.id);
                                        setIsModalOpen(true);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                      title="Edit Allocation"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(alloc.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                      title="Delete Allocation"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic py-2">No faculty assigned to this section yet.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Section</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Workload (L-T-P)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAllocations.length > 0 ? (
                  filteredAllocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {alloc.facultyName.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-slate-900">{alloc.facultyName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{alloc.courseName}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{alloc.courseCode} • Year {alloc.year}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="w-6 h-6 bg-slate-100 text-slate-700 rounded flex items-center justify-center text-[10px] font-bold">
                          {alloc.section}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          alloc.role === 'Main Faculty' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {alloc.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                            <span className={alloc.l > 0 ? 'text-indigo-600' : ''}>{alloc.l}L</span>
                            <span>•</span>
                            <span className={alloc.t > 0 ? 'text-emerald-600' : ''}>{alloc.t}T</span>
                            <span>•</span>
                            <span className={alloc.p > 0 ? 'text-amber-600' : ''}>{alloc.p}P</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">{alloc.l + alloc.t + alloc.p} total hrs</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => {
                                const course = courses.find(c => c.subjectCode === alloc.courseCode);
                                if (course) {
                                  setSelectedCourse(course);
                                  setSelectedSection(alloc.section);
                                  setSelectedYear(alloc.year);
                                  setNewAllocation({
                                    facultyId: alloc.facultyId,
                                    role: alloc.role as any,
                                    l: alloc.l,
                                    t: alloc.t,
                                    p: alloc.p,
                                    position: alloc.position
                                  });
                                  setIsEditing(true);
                                  setEditingAllocationId(alloc.id);
                                  setIsModalOpen(true);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(alloc.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                      No allocations found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {isModalOpen && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
            {/* Form Side */}
            <div className="flex-1 p-8 border-r border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Allocation' : 'New Allocation'}</h2>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditing(false);
                    setEditingAllocationId(null);
                  }}
                  className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Select Faculty</label>
                    <select 
                      required
                      value={newAllocation.facultyId}
                      onChange={(e) => setNewAllocation({...newAllocation, facultyId: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="">Choose faculty member...</option>
                      {faculty.map(f => (
                        <option key={f.empId} value={f.empId}>{f.name} ({f.empId})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Role</label>
                    <select 
                      value={newAllocation.role}
                      onChange={(e) => {
                        const newRole = e.target.value as any;
                        setNewAllocation({
                          ...newAllocation, 
                          role: newRole,
                          l: newRole === 'Main Faculty' ? selectedCourse.l : 0,
                          t: selectedCourse.t,
                          p: selectedCourse.p,
                          position: newRole === 'Main Faculty' ? 0 : 1
                        });
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="Main Faculty">Main Faculty</option>
                      <option value="Supporting Faculty">Supporting Faculty</option>
                      <option value="TA">TA</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700">Workload Components (Hours)</label>
                      {isOverride && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wider">
                          <AlertCircle size={10} />
                          Manual Override
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Lecture (L)</label>
                        <input 
                          type="number"
                          value={newAllocation.l}
                          onChange={(e) => setNewAllocation({...newAllocation, l: parseInt(e.target.value) || 0})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tutorial (T)</label>
                        <input 
                          type="number"
                          value={newAllocation.t}
                          onChange={(e) => setNewAllocation({...newAllocation, t: parseInt(e.target.value) || 0})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Practical (P)</label>
                        <input 
                          type="number"
                          value={newAllocation.p}
                          onChange={(e) => setNewAllocation({...newAllocation, p: parseInt(e.target.value) || 0})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {(newAllocation.role === 'TA' || newAllocation.role === 'Supporting Faculty') && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Position (Slot)</label>
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(pos => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setNewAllocation({...newAllocation, position: pos})}
                            className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                              newAllocation.position === pos 
                                ? 'bg-indigo-600 text-white border-indigo-600' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
                            }`}
                          >
                            R{pos + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-end gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={decision?.status === 'REJECTED'}
                    className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold shadow-lg transition-all ${
                      decision?.status === 'REJECTED' 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                    }`}
                  >
                    <Check size={20} />
                    Confirm Allocation
                  </button>
                </div>
              </form>
            </div>

            {/* Decision Side */}
            <div className="w-full md:w-80 bg-slate-50 p-8 flex flex-col">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Allocation Decision</h3>
              
              {decision ? (
                <div className="space-y-6 flex-1">
                  <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    decision.status === 'APPROVED' ? 'bg-green-50 border-green-100 text-green-700' :
                    decision.status === 'CONDITIONAL' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                    'bg-rose-50 border-rose-100 text-rose-700'
                  }`}>
                    {decision.status === 'APPROVED' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                    <div>
                      <p className="font-bold text-sm">{decision.status}</p>
                      <p className="text-xs mt-1 leading-relaxed">{decision.reasoning}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Workload Projection</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">Current</span>
                        <span className="text-xs font-bold text-slate-700">{decision.currentWorkload.total} hrs</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Projected</span>
                        <span className={`text-sm font-bold ${decision.projectedWorkload.total > MAX_WORKLOAD_HOURS ? 'text-rose-600' : 'text-indigo-600'}`}>
                          {decision.projectedWorkload.total} hrs
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${decision.projectedWorkload.total > MAX_WORKLOAD_HOURS ? 'bg-rose-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(100, (decision.projectedWorkload.total / MAX_WORKLOAD_HOURS) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Constraints</p>
                      {decision.constraints.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] font-medium text-slate-600">
                          {c.includes('SATISFIED') ? <Check size={12} className="text-green-500" /> : <X size={12} className="text-rose-500" />}
                          {c}
                        </div>
                      ))}
                    </div>

                    {decision.alternatives && decision.alternatives.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Alternatives</p>
                        {decision.alternatives.map((a, i) => (
                          <div key={i} className="flex items-start gap-2 text-[10px] font-medium text-indigo-600">
                            <Info size={12} className="mt-0.5" />
                            {a}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl">
                  <User className="text-slate-300 mb-4" size={32} />
                  <p className="text-xs text-slate-400">Select a faculty member to see the allocation decision and workload impact.</p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-[10px] text-slate-400 italic">System uses real-time validation based on current database state.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Allocations;
