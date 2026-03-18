import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Star, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2,
  BookOpen,
  MessageSquare,
  ArrowUpCircle
} from 'lucide-react';

interface Preference {
  id: number;
  courseCode: string;
  courseName: string;
  priority: number;
  remarks: string;
  facultyId: string;
  facultyName?: string;
}

interface Course {
  code: string;
  name: string;
}

const Preferences: React.FC = () => {
  const { token, user } = useAuth();
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const isAdmin = user?.role === 'admin' || user?.role === 'dual';
  
  const [newPref, setNewPref] = useState({
    courseCode: '',
    priority: 1,
    remarks: ''
  });

  const fetchData = async () => {
    try {
      const [prefRes, courseRes] = await Promise.all([
        fetch('/api/preferences', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setPreferences(await prefRes.json());
      setCourses(await courseRes.json());
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch data', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(newPref)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setNewPref({ courseCode: '', priority: 1, remarks: '' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit preference');
      }
    } catch (err) {
      console.error('Failed to submit preference', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this preference?')) return;
    try {
      const res = await fetch(`/api/preferences/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete preference', err);
    }
  };

  const filteredPreferences = preferences.filter(p => 
    p.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.facultyName && p.facultyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isAdmin ? 'Faculty Preferences' : 'My Course Preferences'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isAdmin 
              ? 'Review preferences submitted by faculty for course allocation.' 
              : 'Submit your preferred subjects for the upcoming semester.'}
          </p>
        </div>
        {!isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            <Plus size={20} />
            Add Preference
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 rotate-45" />
            <input 
              type="text" 
              placeholder="Search by faculty name, course name or code..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Preferences List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium">Loading your preferences...</p>
            </div>
          ) : filteredPreferences.length > 0 ? (
            filteredPreferences.map((pref, index) => (
              <div key={pref.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-start gap-6 group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl border border-indigo-100">
                  {pref.priority}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
                      {pref.courseCode}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">• Priority {pref.priority}</span>
                    {isAdmin && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded ml-auto">
                        {pref.facultyName}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 truncate">{pref.courseName}</h3>
                  {pref.remarks && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                      <MessageSquare size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
                      <p>{pref.remarks}</p>
                    </div>
                  )}
                </div>

                {!isAdmin && (
                  <button 
                    onClick={() => handleDelete(pref.id)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Remove preference"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
              <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Star className="text-slate-300 w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No preferences submitted yet</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8">
                You haven't added any course preferences. Adding them helps the administration allocate courses that match your expertise.
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-indigo-600 font-bold flex items-center gap-2 mx-auto hover:underline"
              >
                <Plus size={18} />
                Submit your first preference
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-indigo-600 p-8 rounded-2xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12">
              <Star size={160} />
            </div>
            <h3 className="text-xl font-bold mb-4 relative z-10">Submission Guidelines</h3>
            <ul className="space-y-4 text-indigo-100 text-sm relative z-10">
              <li className="flex items-start gap-3">
                <CheckCircle2 size={18} className="flex-shrink-0 text-indigo-300" />
                <span>Submit at least 3 preferences for better allocation chances.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 size={18} className="flex-shrink-0 text-indigo-300" />
                <span>Priority 1 is your most preferred subject.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 size={18} className="flex-shrink-0 text-indigo-300" />
                <span>Include relevant experience in remarks for new subjects.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-500" />
              Important Note
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Preferences are used as a primary guide for workload allocation, but final decisions depend on departmental requirements, seniority, and overall balance.
            </p>
          </div>
        </div>
      </div>

      {/* Add Preference Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                  <Star size={20} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Add Preference</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <BookOpen size={16} className="text-slate-400" />
                  Select Course
                </label>
                <select 
                  required
                  value={newPref.courseCode}
                  onChange={(e) => setNewPref({...newPref, courseCode: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-700"
                >
                  <option value="">Choose a subject...</option>
                  {courses.map(c => (
                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <ArrowUpCircle size={16} className="text-slate-400" />
                  Priority Level
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPref({...newPref, priority: p})}
                      className={`py-3 rounded-xl font-bold transition-all border ${
                        newPref.priority === p 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">1 = Highest Priority</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <MessageSquare size={16} className="text-slate-400" />
                  Remarks (Optional)
                </label>
                <textarea 
                  value={newPref.remarks}
                  onChange={(e) => setNewPref({...newPref, remarks: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-24 resize-none"
                  placeholder="e.g. Taught this subject for 3 years, have research publications in this area..."
                />
              </div>
              
              <div className="pt-4 flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
                >
                  Submit Preference
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Preferences;
