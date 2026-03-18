import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BookPlus, 
  Search, 
  Filter, 
  BookOpen, 
  Layers, 
  GraduationCap,
  X,
  Check,
  Clock,
  Pencil,
  Trash2,
  FileUp,
  Info,
  ChevronRight
} from 'lucide-react';

interface Course {
  id: number;
  program: string;
  courseType: string;
  year: string;
  subjectCode: string;
  subjectName: string;
  shortName: string;
  l: number;
  t: number;
  p: number;
  c: number;
  mainFacultyId?: string;
}

const Courses: React.FC = () => {
  const { token, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [totalCourses, setTotalCourses] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgram, setFilterProgram] = useState('All Programs');
  const [filterYear, setFilterYear] = useState('All Years');
  const [filterType, setFilterType] = useState('All Types');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [csvData, setCsvData] = useState('');
  const [creditMultiplier, setCreditMultiplier] = useState(0.5);
  const [newCourse, setNewCourse] = useState({
    program: 'B.Tech',
    courseType: 'Mandatory',
    year: 'I',
    subjectCode: '',
    subjectName: '',
    shortName: '',
    l: 3,
    t: 0,
    p: 0,
    c: 3,
    mainFacultyId: ''
  });

  const fetchCourses = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: searchTerm
      });
      if (filterProgram !== 'All Programs') params.append('program', filterProgram);
      if (filterYear !== 'All Years') params.append('year', filterYear);
      if (filterType !== 'All Types') params.append('courseType', filterType);

      const res = await fetch(`/api/courses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCourses(data.courses);
      setTotalCourses(data.total);
    } catch (err) {
      console.error('Failed to fetch courses', err);
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
    fetchCourses();
    fetchWorkloads();
  }, [token, currentPage, filterProgram, filterYear, filterType, searchTerm]);

  useEffect(() => {
    const calculatedC = Math.ceil(newCourse.l + newCourse.t + (newCourse.p * creditMultiplier));
    if (calculatedC !== newCourse.c) {
      setNewCourse(prev => ({ ...prev, c: calculatedC }));
    }
  }, [newCourse.l, newCourse.t, newCourse.p, creditMultiplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditing ? `/api/courses/${editingCourseId}` : '/api/courses';
      const method = isEditing ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(newCourse)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingCourseId(null);
        fetchCourses();
        setNewCourse({
          program: 'B.Tech',
          courseType: 'Mandatory',
          year: 'I',
          subjectCode: '',
          subjectName: '',
          shortName: '',
          l: 3,
          t: 0,
          p: 0,
          c: 3,
          mainFacultyId: ''
        });
      }
    } catch (err) {
      console.error('Failed to save course', err);
    }
  };

  const handleEdit = (course: Course) => {
    setNewCourse({
      program: course.program,
      courseType: course.courseType,
      year: course.year,
      subjectCode: course.subjectCode,
      subjectName: course.subjectName,
      shortName: course.shortName,
      l: course.l,
      t: course.t,
      p: course.p,
      c: course.c,
      mainFacultyId: course.mainFacultyId || ''
    });
    setIsEditing(true);
    setEditingCourseId(course.id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (course: Course) => {
    setCourseToDelete(course);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;
    
    try {
      const res = await fetch(`/api/courses/${courseToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setCourseToDelete(null);
        fetchCourses();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete course');
      }
    } catch (err) {
      console.error('Failed to delete course', err);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const rows = csvData.split('\n').filter(row => row.trim());
    const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
    
    const parsedCourses = rows.slice(1).map(row => {
      const values = row.split(',').map(v => v.trim());
      const course: any = {};
      headers.forEach((header, index) => {
        if (['l', 't', 'p', 'c', 'year'].includes(header)) {
          course[header] = parseInt(values[index]) || 0;
        } else {
          course[header] = values[index];
        }
      });
      return course;
    });

    try {
      const res = await fetch('/api/courses/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(parsedCourses)
      });
      if (res.ok) {
        setIsImportModalOpen(false);
        setCsvData('');
        fetchCourses();
        alert('Bulk import successful!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to import courses');
      }
    } catch (err) {
      console.error('Bulk import error', err);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'dual';

  const getCourseWorkload = (courseCode: string) => {
    const courseWorkloads = workloads.filter(w => w.courseCode === courseCode);
    const l = courseWorkloads.reduce((sum, w) => sum + (w.l || 0), 0);
    const t = courseWorkloads.reduce((sum, w) => sum + (w.t || 0), 0);
    const p = courseWorkloads.reduce((sum, w) => sum + (w.p || 0), 0);
    return { l, t, p, total: l + t + p };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Course Catalog</h1>
        {isAdmin && (
          <div className="flex items-center gap-3">
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
              <BookPlus size={20} />
              Add Course
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by course name or code..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="flex-1 md:w-40 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>All Types</option>
            <option value="Mandatory">Mandatory</option>
            <option value="Department Elective">Dept Elective</option>
            <option value="Open Elective">Open Elective</option>
            <option value="Minors">Minors</option>
            <option value="Honours">Honours</option>
          </select>
          <select 
            value={filterProgram}
            onChange={(e) => { setFilterProgram(e.target.value); setCurrentPage(1); }}
            className="flex-1 md:w-40 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>All Programs</option>
            <option value="B.Tech">B.Tech</option>
            <option value="M.Tech">M.Tech</option>
          </select>
          <select 
            value={filterYear}
            onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}
            className="flex-1 md:w-40 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>All Years</option>
            <option value="I">Year I</option>
            <option value="II">Year II</option>
            <option value="III">Year III</option>
            <option value="IV">Year IV</option>
          </select>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Subject</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Code</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">L-T-P-C</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Type</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Program</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Year</th>
                {isAdmin && <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((course) => (
                <tr 
                  key={course.id} 
                  className="hover:bg-slate-50 transition-all group cursor-pointer"
                  onClick={() => {
                    setSelectedCourse(course);
                    setIsViewModalOpen(true);
                  }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{course.subjectName}</p>
                      <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-indigo-600">{course.subjectCode}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">{course.l}</span>
                      <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded text-xs font-bold">{course.t}</span>
                      <span className="bg-fuchsia-50 text-fuchsia-700 px-2 py-0.5 rounded text-xs font-bold">{course.p}</span>
                      <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-xs font-bold">{course.c}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      course.courseType === 'Mandatory' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {course.courseType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{course.program}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{course.year || 'N/A'}</td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(course)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Edit Course"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(course)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Course"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {courses.length === 0 && (
          <div className="p-12 text-center">
            <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="text-slate-300 w-8 h-8" />
            </div>
            <p className="text-slate-500 font-medium">No courses found matching your search.</p>
          </div>
        )}
      </div>

      {/* View Course Details Modal */}
      {isViewModalOpen && selectedCourse && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsViewModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                  <BookOpen size={20} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Course Details</h2>
              </div>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded mb-2 inline-block">
                    {selectedCourse.subjectCode}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedCourse.subjectName}</h3>
                  <p className="text-sm text-slate-500 font-medium">{selectedCourse.shortName}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedCourse.courseType === 'Mandatory' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {selectedCourse.courseType}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Program</p>
                  <p className="font-semibold text-slate-700">{selectedCourse.program}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Academic Year</p>
                  <p className="font-semibold text-slate-700">{selectedCourse.year ? `Year ${selectedCourse.year}` : 'N/A'}</p>
                </div>
                {selectedCourse.mainFacultyId && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Main Faculty ID</p>
                    <p className="font-semibold text-slate-700">{selectedCourse.mainFacultyId}</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Credit Distribution (L-T-P-C)</p>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-2xl font-bold text-indigo-600">{selectedCourse.l}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Lecture</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-2xl font-bold text-violet-600">{selectedCourse.t}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tutorial</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-2xl font-bold text-fuchsia-600">{selectedCourse.p}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Practical</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl shadow-lg">
                    <p className="text-2xl font-bold text-white">{selectedCourse.c}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Total Assigned Workload</p>
                  <span className="text-xs font-bold text-indigo-700 bg-white px-2 py-1 rounded-lg shadow-sm">
                    {getCourseWorkload(selectedCourse.subjectCode).total} Hrs Total
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white/50 p-3 rounded-xl border border-indigo-100">
                    <p className="text-xl font-bold text-indigo-700">{getCourseWorkload(selectedCourse.subjectCode).l}</p>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase">Assigned L</p>
                  </div>
                  <div className="bg-white/50 p-3 rounded-xl border border-indigo-100">
                    <p className="text-xl font-bold text-indigo-700">{getCourseWorkload(selectedCourse.subjectCode).t}</p>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase">Assigned T</p>
                  </div>
                  <div className="bg-white/50 p-3 rounded-xl border border-indigo-100">
                    <p className="text-xl font-bold text-indigo-700">{getCourseWorkload(selectedCourse.subjectCode).p}</p>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase">Assigned P</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl font-bold transition-all"
                >
                  Close Details
                </button>
              </div>
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
                <h2 className="text-xl font-bold text-slate-900">Bulk Import Courses</h2>
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
                  <p>First row must be headers: <code className="bg-amber-100 px-1 rounded">code, name, l, t, p, c, type, program, year</code></p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Paste CSV Data</label>
                  <textarea 
                    required
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-64 font-mono text-xs"
                    placeholder="program,courseType,year,subjectCode,subjectName,shortName,l,t,p,c,mainFacultyId&#10;B.Tech,Mandatory,I,25CS102,Problem Solving through Python,PSP,2,0,2,3,"
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
                  Import Courses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setIsModalOpen(false);
            setIsEditing(false);
            setEditingCourseId(null);
          }}
        >
          <div 
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Course' : 'Add New Course'}</h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setIsEditing(false);
                  setEditingCourseId(null);
                  setNewCourse({
                    program: 'B.Tech',
                    courseType: 'Mandatory',
                    year: 'I',
                    subjectCode: '',
                    subjectName: '',
                    shortName: '',
                    l: 3,
                    t: 0,
                    p: 0,
                    c: 3,
                    mainFacultyId: ''
                  });
                }}
                className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Program</label>
                  <select 
                    value={newCourse.program}
                    onChange={(e) => setNewCourse({...newCourse, program: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    required
                  >
                    <option value="B.Tech">B.Tech</option>
                    <option value="M.Tech">M.Tech</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Course Type</label>
                  <select 
                    value={newCourse.courseType}
                    onChange={(e) => setNewCourse({...newCourse, courseType: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    required
                  >
                    <option value="Mandatory">Mandatory</option>
                    <option value="Department Elective">Department Elective</option>
                    <option value="Open Elective">Open Elective</option>
                    <option value="Minors">Minors</option>
                    <option value="Honours">Honours</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Year</label>
                  <select 
                    value={newCourse.year}
                    onChange={(e) => setNewCourse({...newCourse, year: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="">N/A (M.Tech)</option>
                    <option value="I">Year I</option>
                    <option value="II">Year II</option>
                    <option value="III">Year III</option>
                    <option value="IV">Year IV</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Subject Code</label>
                  <input 
                    type="text" 
                    required
                    value={newCourse.subjectCode}
                    onChange={(e) => setNewCourse({...newCourse, subjectCode: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. 25CS102"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Subject Name</label>
                  <input 
                    type="text" 
                    required
                    value={newCourse.subjectName}
                    onChange={(e) => setNewCourse({...newCourse, subjectName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Full course name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Short Name</label>
                  <input 
                    type="text" 
                    required
                    value={newCourse.shortName}
                    onChange={(e) => setNewCourse({...newCourse, shortName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Abbreviation"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Main Faculty ID (Optional)</label>
                  <input 
                    type="text" 
                    value={newCourse.mainFacultyId}
                    onChange={(e) => setNewCourse({...newCourse, mainFacultyId: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Faculty ID"
                  />
                </div>
                
                <div className="grid grid-cols-4 gap-4 md:col-span-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Lecture (L)</label>
                    <input 
                      type="number" 
                      value={newCourse.l}
                      onChange={(e) => setNewCourse({...newCourse, l: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Tutorial (T)</label>
                    <input 
                      type="number" 
                      value={newCourse.t}
                      onChange={(e) => setNewCourse({...newCourse, t: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Practical (P)</label>
                    <input 
                      type="number" 
                      value={newCourse.p}
                      onChange={(e) => setNewCourse({...newCourse, p: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Credits (C)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={newCourse.c}
                        readOnly
                        className="w-full px-4 py-2 bg-slate-900 text-white border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <div className="absolute -top-10 right-0 bg-indigo-600 text-[10px] text-white px-2 py-1 rounded shadow-lg whitespace-nowrap">
                        Auto-calc: L + T + ({creditMultiplier} × P)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Credit Multiplier for Practical (P)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1"
                      value={creditMultiplier}
                      onChange={(e) => setCreditMultiplier(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="bg-slate-100 px-3 py-1 rounded-lg font-bold text-slate-700 min-w-12 text-center">
                      {creditMultiplier}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Adjust how much practical hours contribute to total credits.</p>
                </div>
              </div>
              
              <div className="mt-8 flex items-center justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditing(false);
                    setEditingCourseId(null);
                    setNewCourse({
                      program: 'B.Tech',
                      courseType: 'Mandatory',
                      year: 'I',
                      subjectCode: '',
                      subjectName: '',
                      shortName: '',
                      l: 3,
                      t: 0,
                      p: 0,
                      c: 3,
                      mainFacultyId: ''
                    });
                  }}
                  className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-100 transition-all"
                >
                  <Check size={20} />
                  {isEditing ? 'Update Course' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && courseToDelete && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => {
            setIsDeleteModalOpen(false);
            setCourseToDelete(null);
          }}
        >
          <div 
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Delete</h3>
              <p className="text-slate-500 mb-6">
                Are you sure you want to delete <span className="font-bold text-slate-900">{courseToDelete.subjectName}</span>? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setCourseToDelete(null);
                  }}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
