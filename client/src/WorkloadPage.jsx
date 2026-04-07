import React, { useState, useMemo, useEffect, useCallback } from 'react';
import './WorkloadPage.css';
import API from './config';
import { exportAsCSV, exportAsExcel, exportAsPDF } from './utils/exportUtils';
import { fetchAllPages, authJsonHeaders } from './utils/apiFetchAll';
import {
  DEFAULT_SECTIONS,
  fetchSectionsConfig,
  addSectionConfig,
  renameSectionConfig,
  deleteSectionConfig,
} from './utils/sectionsApi';

const DEFAULT_DEPARTMENT = 'CSE';

const YEAR_SECTIONS = {
  'I':      Array.from({ length: 19 }, (_, i) => String(i + 1)),
  'II':     Array.from({ length: 22 }, (_, i) => String(i + 1)),
  'III':    Array.from({ length: 19 }, (_, i) => String(i + 1)),
  'IV':     Array.from({ length:  9 }, (_, i) => String(i + 1)),
  'M.Tech': ['1', '2'],
};
const YEARS = ['I', 'II', 'III', 'IV', 'M.Tech'];
const YEAR_OPTIONS = [
  { value: 'I', label: 'I Year' },
  { value: 'II', label: 'II Year' },
  { value: 'III', label: 'III Year' },
  { value: 'IV', label: 'IV Year' },
  { value: 'M.Tech', label: 'M.Tech' },
  { value: '__other__', label: 'Others' },
];
const COURSE_TYPES = ['Mandatory', 'Department Elective', 'Open Elective', 'Minors', 'Honours'];
const FACULTY_ROLES = ['Main Faculty', 'Supporting Faculty', 'TA'];
const AUTO_REFRESH_MS = 60000;

const normalizeCourseTypeKey = (courseType = '') => {
  const normalized = String(courseType || '').trim().toLowerCase();
  if (normalized === 'de' || normalized === 'department elective') return 'DE';
  if (normalized === 'mandatory') return 'MANDATORY';
  return 'OTHER';
};

const isRestrictedDeYear = (year = '') => ['I', 'II', 'III'].includes(String(year || '').trim());

// AICTE workload norms → full weekly contact-hour target by designation
const getWorkloadTarget = (designation = '') => {
  const d = designation.toLowerCase();
  if (d.includes('dean') || d.includes('hod')) return 14;
  if (d.includes('professor') && !d.includes('asst') && !d.includes('assoc') && !d.includes('assistant')) return 14;
  if (d.includes('assoc')) return 16;
  if (d.includes('sr. asst') || d.includes('senior level')) return 16;
  if (d.includes('contract') || d === 'cap' || d.includes('internal cap') || d === 'ta' || d.includes('teaching instructor')) return 18;
  return 16; // default (Asst. Prof / Assistant Professor)
};

const emptyForm = {
  empId: '', empName: '', designation: '', mobile: '', facultyRole: 'Main Faculty',
  taAllocationRow: 'R2',
  courseId: '', year: 'I', section: '1',
  courseType: 'Mandatory',
  manualL: '', manualT: '', manualP: '',
  // 'Other' free-text companions
  yearOther: '', sectionOther: '', courseTypeOther: '',
  empIdOther: '', empNameOther: '', designationOther: '', mobileOther: '', courseOther: '',
};

// helper: auth header from localStorage token
const authHeader = () => authJsonHeaders();

// ─────────────────────────────────────────────────
const WorkloadPage = ({ submissions }) => {
  const [workloads,    setWorkloads]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState('');
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState(emptyForm);
  const [showForm,     setShowForm]     = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [errors,       setErrors]       = useState({});
  const [toast,        setToast]        = useState('');
  const [search,       setSearch]       = useState('');
  const [filterEmp,    setFilterEmp]    = useState('');
  const [activeYear,   setActiveYear]   = useState('All'); // year-tab filter
  const [showForms,    setShowForms]    = useState(false);
  const [sectionsConfig, setSectionsConfig] = useState(DEFAULT_SECTIONS);
  // New: allocation data for selected course/year/section
  const [allocation, setAllocation] = useState(null);
  const [allocLoading, setAllocLoading] = useState(false);
  const [facultyList, setFacultyList] = useState([]);
  const [courseList, setCourseList] = useState([]);

  // Faculty workload hours tracking
  const [facultyWorkloadSummary, setFacultyWorkloadSummary] = useState(null);
  const [workloadHoursLoading, setWorkloadHoursLoading] = useState(false);
  const [workloadHoursError, setWorkloadHoursError] = useState('');

  const fetchMasterData = useCallback(async () => {
    try {
      const [fRes, cRes] = await Promise.all([
        fetchAllPages('/api/faculty', {}, { headers: authHeader() }),
        fetchAllPages('/api/courses', {}, { headers: authHeader() }),
      ]);
      if (fRes.success) setFacultyList(fRes.data || []);
      if (cRes.success) setCourseList(cRes.data || []);
    } catch {
    }
  }, []);

  useEffect(() => { fetchMasterData(); }, [fetchMasterData]);
  // ── Fetch allocation for selected course/year/section ──
  useEffect(() => {
    // Only fetch if form is open and courseId/year/section are set and not '__other__'
    if (!showForm || !form.courseId || !form.year || !form.section) {
      setAllocation(null);
      return;
    }
    if (form.courseId === '__other__' || form.year === '__other__' || form.section === '__other__') {
      setAllocation(null);
      return;
    }
    const fetchAllocation = async () => {
      setAllocLoading(true);
      try {
        const res = await fetch(`${API}/api/allocations?courseId=${form.courseId}&year=${encodeURIComponent(form.year)}&section=${encodeURIComponent(form.section)}`, { headers: authHeader() });
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setAllocation(data.data[0]);
        } else {
          setAllocation(null);
        }
      } catch {
        setAllocation(null);
      } finally {
        setAllocLoading(false);
      }
    };
    fetchAllocation();
  }, [showForm, form.courseId, form.year, form.section]);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const loadSectionsConfig = useCallback(async () => {
    try {
      const cfg = await fetchSectionsConfig();
      setSectionsConfig(cfg);
    } catch {
      setSectionsConfig(DEFAULT_SECTIONS);
    }
  }, []);

  useEffect(() => { loadSectionsConfig(); }, [loadSectionsConfig]);

  // ── Fetch workloads from server on mount ──────────────────
  const fetchWorkloads = useCallback(async ({ withLoader = true } = {}) => {
    if (withLoader) setLoading(true);
    setFetchError('');
    try {
      const data = await fetchAllPages('/api/workloads', {}, { headers: authHeader() });
      if (data.success) {
        const normalized = (data.data || []).map(w => ({
          ...w,
          empId: w.empId || '',
          empName: w.empName || 'Unknown Faculty',
          facultyRole: w.facultyRole || 'Main Faculty',
          mobile: w.mobile || '',
          department: w.department || DEFAULT_DEPARTMENT,
          designation: w.designation || '—',
          subjectCode: w.subjectCode || '—',
          subjectName: w.subjectName || '—',
          shortName: w.shortName || '',
          year: w.year || '—',
          section: w.section || '—',
          fixedL: Number(w.fixedL || 0),
          fixedT: Number(w.fixedT || 0),
          fixedP: Number(w.fixedP || 0),
          C: Number(w.C || 0),
          manualL: Number(w.manualL || 0),
          manualT: Number(w.manualT || 0),
          manualP: Number(w.manualP || 0),
          allocationRow: w.allocationRow ?? null,
        }));
        setWorkloads(normalized);
        
        // Comprehensive logging for debugging
        console.log('✅ Workloads Fetched Successfully:', {
          totalCount: normalized.length,
          breakdown: {
            mainFaculty: normalized.filter(w => w.facultyRole === 'Main Faculty').length,
            supportingFaculty: normalized.filter(w => w.facultyRole === 'Supporting Faculty').length,
            ta: normalized.filter(w => w.facultyRole === 'TA').length,
          },
          sectionDistribution: Array.from(
            new Set(normalized.map(w => w.section))
          ).map(sec => ({
            section: sec,
            count: normalized.filter(w => w.section === sec).length,
          })),
          sampleData: normalized.slice(0, 5),
        });
      } else {
        setWorkloads([]);
        setFetchError(data.message || 'Could not load workload details.');
        console.error('❌ Failed to fetch workloads:', data.message);
        showToast(`⚠ ${data.message || 'Could not load workload collection data.'}`);
      }
    } catch (error) {
      setWorkloads([]);
      setFetchError('Could not load workload details from server.');
      console.error('❌ Error fetching workloads:', error);
      showToast('⚠ Could not load workloads from server.');
    } finally {
      if (withLoader) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkloads({ withLoader: true }); }, [fetchWorkloads]);

  useEffect(() => {
    const id = setInterval(() => { fetchWorkloads({ withLoader: false }); }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchWorkloads]);

  // ── derived from current form ──
  const facMember      = useMemo(() => facultyList.find(f => f.empId === form.empId), [form.empId, facultyList]);
  const submission     = useMemo(() => submissions.find(s => s.empId === form.empId), [submissions, form.empId]);
  const prefCourses    = useMemo(() => {
    if (!submission || !submission.prefs?.length) return [];
    return submission.prefs.map(cid => courseList.find(c => c.id === cid)).filter(Boolean);
  }, [submission, courseList]);
  const selectedCourse = useMemo(() => courseList.find(c => c.id === +form.courseId), [form.courseId, courseList]);
  const sections       = sectionsConfig[form.year] || YEAR_SECTIONS[form.year] || ['1'];

  const allocationPreviewRows = useMemo(() => {
    if (!allocation) return [];

    const normalizeRows = (type, slots, rowCount) => {
      const compact = (Array.isArray(slots) ? slots : []).filter((slot) => slot && (slot.empId || slot.empName));
      return Array.from({ length: rowCount }, (_, idx) => {
        const slot = compact[idx] || {};
        return {
          type,
          rowLabel: `R${idx + 1}`,
          empId: slot.empId || '',
          empName: slot.empName || '',
          designation: slot.designation || '',
        };
      });
    };

    const lectureSlots = Array.isArray(allocation.lectureSlots) && allocation.lectureSlots.length > 0
      ? allocation.lectureSlots
      : (allocation.lectureSlot ? [allocation.lectureSlot] : []);

    return [
      ...normalizeRows('L', lectureSlots, 1),
      ...normalizeRows('T', allocation.tutorialSlots || [], 4),
      ...normalizeRows('P', allocation.practicalSlots || [], 4),
    ];
  }, [allocation]);

  // ── Employee ID change: auto fill name, clear course ──
  const handleEmpIdChange = val => {
    if (val === '__other__') {
      setForm(prev => ({
        ...prev,
        empId: '__other__',
        empName: '',
        designation: '',
        mobile: '',
        courseId: '', manualL: '', manualT: '', manualP: '',
      }));
      setErrors({});
      setFacultyWorkloadSummary(null);
      return;
    }
    const f = facultyList.find(f => f.empId === val);
    setForm(prev => ({
      ...prev,
      empId:       val,
      empName:     f ? f.name        : '',
      designation: f ? f.designation : '',
      mobile:      f ? (f.mobile || '') : '',
      courseId: '', manualL: '', manualT: '', manualP: '',
    }));
    setErrors({});

    // Fetch faculty workload hours summary
    if (f && f.empId) {
      fetchFacultyWorkloadHours(f.empId);
    }
  };

  // ── Fetch faculty workload hours summary ──
  const fetchFacultyWorkloadHours = async (empId) => {
    if (!empId) return;
    setWorkloadHoursLoading(true);
    setWorkloadHoursError('');
    try {
      const res = await fetch(`${API}/api/workloads/faculty-hours/${empId}`, { 
        headers: authHeader() 
      });
      const data = await res.json();
      if (data.success) {
        setFacultyWorkloadSummary(data.data);
      } else {
        setWorkloadHoursError(data.message || 'Failed to load workload hours');
        setFacultyWorkloadSummary(null);
      }
    } catch (err) {
      setWorkloadHoursError('Error loading workload hours');
      setFacultyWorkloadSummary(null);
    } finally {
      setWorkloadHoursLoading(false);
    }
  };

  // ── Course change: auto-pre-fill manual L/T/P with fixed values ──
  const handleCourseChange = cid => {
    if (cid === '__other__') {
      setForm(prev => ({ ...prev, courseId: '__other__', courseType: 'Mandatory', manualL: '', manualT: '', manualP: '' }));
      return;
    }
    const c = courseList.find(c => c.id === +cid);
    const autoYear = c ? (c.year || (c.program === 'M.Tech' ? 'M.Tech' : 'I')) : '';
    setForm(prev => ({
      ...prev,
      courseId: cid,
      courseType: c?.courseType || prev.courseType,
      manualL:  c ? String(c.L) : '',
      manualT:  c ? String(c.T) : '',
      manualP:  c ? String(c.P) : '',
      year:     autoYear || prev.year,
      section:  autoYear ? ((sectionsConfig[autoYear] || YEAR_SECTIONS[autoYear])?.[0] || prev.section) : prev.section,
    }));
  };

  const handleAddSection = async () => {
    const targetYear = form.year && form.year !== '__other__' ? form.year : 'I';
    const section = window.prompt(`Add section for ${targetYear}:`);
    if (!section) return;
    const data = await addSectionConfig(targetYear, section.trim());
    if (!data.success) return showToast(`⚠ ${data.message || 'Could not add section.'}`);
    await loadSectionsConfig();
    if (targetYear === form.year) setForm(p => ({ ...p, section: section.trim() }));
    showToast('Section added.');
  };

  const handleEditSection = async () => {
    if (!form.section || form.section === '__other__') return;
    const targetYear = form.year && form.year !== '__other__' ? form.year : 'I';
    const next = window.prompt(`Rename section '${form.section}'`, form.section);
    if (!next || next.trim() === form.section) return;
    const data = await renameSectionConfig(targetYear, form.section, next.trim());
    if (!data.success) return showToast(`⚠ ${data.message || 'Could not edit section.'}`);
    await loadSectionsConfig();
    setForm(p => ({ ...p, section: next.trim() }));
    showToast('Section updated.');
  };

  const handleDeleteSection = async () => {
    if (!form.section || form.section === '__other__') return;
    const targetYear = form.year && form.year !== '__other__' ? form.year : 'I';
    if (!window.confirm(`Delete section '${form.section}' for ${targetYear}?`)) return;
    const data = await deleteSectionConfig(targetYear, form.section);
    if (!data.success) return showToast(`⚠ ${data.message || 'Could not delete section.'}`);
    const refreshed = await fetchSectionsConfig().catch(() => DEFAULT_SECTIONS);
    setSectionsConfig(refreshed);
    const nextList = refreshed[targetYear] || YEAR_SECTIONS[targetYear] || ['1'];
    setForm(p => ({ ...p, section: nextList[0] || '1' }));
    showToast('Section deleted.');
  };

  // ── Validation ──
  const validate = () => {
    const e = {};
    if (!form.empId)                                                       e.empId    = 'Select an employee.';
    else if (form.empId === '__other__' && !form.empIdOther.trim())         e.empId    = 'Type the employee ID.';
    if (form.empId === '__other__' && !form.mobileOther.trim())              e.mobile   = 'Type mobile number for other faculty.';
    if (!form.courseId)                                                    e.courseId = 'Select a course.';
    else if (form.courseId === '__other__' && !form.courseOther.trim())     e.courseId = 'Type the course name.';
    if (form.courseId === '__other__' && !form.courseType)                  e.courseType = 'Select course type.';
    if (form.courseId === '__other__' && form.courseType === '__other__' && !form.courseTypeOther.trim())
      e.courseType = 'Type course type.';
    if (form.year === '__other__' && !form.yearOther.trim())                e.year = 'Type Year / Department.';
    if (!form.year)      e.year     = 'Select year.';
    if (!form.section)   e.section  = 'Select section.';
    return e;
  };

  // ── Open Add form ──
  const openAdd = () => {
    setForm(emptyForm);
    setEditTarget(null);
    setErrors({});
    setShowForm(true);
  };

  // ── Open Edit form ──
  const openEdit = w => {
    const isOtherFac = !facultyList.find(f => f.empId === w.empId);
    const isOtherCrs = !courseList.find(c => c.id === w.courseId);
    setForm({
      empId:            isOtherFac ? '__other__' : w.empId,
      empName:          w.empName,
      designation:      w.designation,
      facultyRole:      w.facultyRole || 'Main Faculty',
      mobile:           w.mobile || '',
      empIdOther:       isOtherFac ? w.empId       : '',
      empNameOther:     isOtherFac ? w.empName      : '',
      designationOther: isOtherFac ? w.designation  : '',
      mobileOther:      isOtherFac ? (w.mobile || '') : '',
      courseId:         isOtherCrs ? '__other__' : String(w.courseId),
      courseType:       isOtherCrs
        ? (COURSE_TYPES.includes(w.courseType) ? w.courseType : '__other__')
        : (w.courseType || 'Mandatory'),
      courseOther:      isOtherCrs ? w.subjectName  : '',
      courseTypeOther:  isOtherCrs && !COURSE_TYPES.includes(w.courseType) ? (w.courseType || '') : '',
      year:        w.year,
      section:     w.section,
      manualL:     String(w.manualL),
      manualT:     String(w.manualT),
      manualP:     String(w.manualP),
      taAllocationRow: { 1: 'R2', 2: 'R3', 3: 'R4' }[w.allocationRow] || 'R2',
      yearOther: '', sectionOther: '',
    });
    setEditTarget(w);
    setErrors({});
    setShowForm(true);
  };

  // ── Save (add / update): calls server API ──────────────────
  // keepOpen=true → after save, reset course fields but keep faculty & form open
  const saveWorkload = async (keepOpen = false) => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setSaving(true);
    try {
      // Resolve 'Other' free-text values
      const resolvedYear    = form.year    === '__other__' ? form.yearOther.trim()    || 'Other' : form.year;
      const resolvedSection = form.section === '__other__' ? form.sectionOther.trim() || 'Other' : form.section;
      const resolvedEmpId   = form.empId   === '__other__' ? form.empIdOther.trim()   || 'OTHER' : form.empId;
      const resolvedCrsId   = form.courseId === '__other__' ? 0 : +form.courseId;
      const resolvedCourseType = form.courseId === '__other__'
        ? (form.courseType === '__other__' ? (form.courseTypeOther.trim() || 'Other') : form.courseType)
        : (selectedCourse?.courseType || form.courseType || 'Other');
      const courseTypeKey = normalizeCourseTypeKey(resolvedCourseType);

      const selectedRole = form.facultyRole || 'Main Faculty';

      if (selectedRole === 'Main Faculty' && courseTypeKey === 'DE' && isRestrictedDeYear(resolvedYear)) {
        const conflict = workloads.find((w) => (
          String(w.year) === String(resolvedYear)
          && String(w.section) === String(resolvedSection)
          && normalizeCourseTypeKey(w.courseType) === 'DE'
          && (String(w.facultyRole || 'Main Faculty') === 'Main Faculty')
          && (!editTarget || String(w.id) !== String(editTarget.id))
        ));
        if (conflict) {
          setErrors((prev) => ({
            ...prev,
            section: 'Only one Department Elective can be assigned to this section for I/II/III years.',
          }));
          showToast('⚠ Only one Department Elective can be assigned to this section for I/II/III years.');
          setSaving(false);
          return;
        }
      }

      if (selectedRole === 'TA') {
        const duplicateTa = workloads.find((w) => (
          String(w.facultyRole || 'Main Faculty') === 'TA'
          && Number(w.courseId || 0) === Number(resolvedCrsId || 0)
          && String(w.year) === String(resolvedYear)
          && String(w.section) === String(resolvedSection)
          && (!editTarget || String(w.id) !== String(editTarget.id))
        ));

        if (duplicateTa) {
          setErrors((prev) => ({
            ...prev,
            facultyRole: 'Only one TA can be assigned for the same subject and section.',
          }));
          showToast('⚠ TA is already assigned for this subject and section. Only one TA is allowed per section.');
          setSaving(false);
          return;
        }
      }

      // ── WORKLOAD HOURS VALIDATION ──
      // Check if assignment would exceed faculty capacity
      if (form.empId !== '__other__' && facultyWorkloadSummary) {
        const hoursToAssign = (Number(form.manualL) || 0) + (Number(form.manualT) || 0) + (Number(form.manualP) || 0);
        const currentLoad = facultyWorkloadSummary.currentLoad;
        const totalCapacity = facultyWorkloadSummary.totalWorkingHours;
        
        // If updating, subtract the old workload hours from current load
        let adjustedCurrentLoad = currentLoad;
        if (editTarget) {
          const oldHours = (editTarget.manualL || editTarget.fixedL || 0) + 
                          (editTarget.manualT || editTarget.fixedT || 0) + 
                          (editTarget.manualP || editTarget.fixedP || 0);
          adjustedCurrentLoad = Math.max(0, currentLoad - oldHours);
        }

        const newTotal = adjustedCurrentLoad + hoursToAssign;

        if (newTotal > totalCapacity) {
          const exceededBy = newTotal - totalCapacity;
          const errorMsg = `Cannot assign ${hoursToAssign}h. Faculty would exceed capacity by ${exceededBy}h (would be ${newTotal}h/${totalCapacity}h)`;
          setErrors((prev) => ({
            ...prev,
            manualL: errorMsg,
          }));
          showToast(`⚠ ${errorMsg}`);
          setSaving(false);
          return;
        }
      }

      const payload = {
        empId:    resolvedEmpId,
        courseId: resolvedCrsId,
        facultyRole: selectedRole,
        year:     resolvedYear,
        section:  resolvedSection,
        manualL:  +form.manualL || 0,
        manualT:  +form.manualT || 0,
        manualP:  +form.manualP || 0,
        ...(form.empId    === '__other__' && {
          empNameOverride:     form.empNameOther.trim()     || 'Other Faculty',
          designationOverride: form.designationOther.trim() || 'Other',
          mobileOverride:      form.mobileOther.trim(),
        }),
        ...(form.courseId === '__other__' && {
          courseNameOverride: form.courseOther.trim() || 'Other Course',
          courseTypeOverride: form.courseType === '__other__'
            ? (form.courseTypeOther.trim() || 'Other')
            : form.courseType,
        }),
        ...(selectedRole === 'TA' && {
          allocationRow: { R2: 1, R3: 2, R4: 3 }[form.taAllocationRow] || 1,
        }),
      };

      let res;
      if (editTarget) {
        res = await fetch(`${API}/api/workloads/${editTarget.id}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body:    JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API}/api/workloads`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body:    JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!data.success) {
        showToast(`⚠ ${data.message || 'Save failed.'}`);
        setSaving(false);
        return;
      }

      await fetchWorkloads(); // refresh list from server
      showToast(editTarget ? 'Workload updated successfully.' : 'Workload assigned successfully.');

      if (keepOpen && !editTarget) {
        // Reset only course/LTP — keep faculty selected for rapid multi-assignment
        setForm(prev => ({
          ...prev,
          courseId: '', manualL: '', manualT: '', manualP: '',
        }));
        setErrors({});
      } else {
        setShowForm(false);
      }
    } catch {
      showToast('⚠ Server unreachable. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete: calls server API ───────────────────────────
  const confirmDelete = async () => {
    try {
      const res  = await fetch(`${API}/api/workloads/${deleteTarget.id}`, {
        method: 'DELETE', headers: authHeader(),
      });
      const data = await res.json();
      if (!data.success) { showToast(`⚠ ${data.message}`); return; }
      await fetchWorkloads();
      showToast('Workload entry removed.');
    } catch {
      showToast('⚠ Delete failed. Please try again.');
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Export CSV: download from server endpoint ──
  const exportColumns = [
    { header: 'Emp ID', key: 'empId' },
    { header: 'Faculty Name', key: 'empName' },
    { header: 'Faculty Role', key: 'facultyRole' },
    { header: 'Department', key: 'department' },
    { header: 'Designation', key: 'designation' },
    { header: 'Subject Code', key: 'subjectCode' },
    { header: 'Subject Name', key: 'subjectName' },
    { header: 'Year', key: 'year' },
    { header: 'Section', key: 'section' },
    { header: 'L', key: 'manualL' },
    { header: 'T', key: 'manualT' },
    { header: 'P', key: 'manualP' },
    { header: 'Total Assigned Load', value: (r) => (Number(r.manualL || 0) + Number(r.manualT || 0) + Number(r.manualP || 0)) },
  ];

  const exportWorkloads = (format) => {
    if (!filtered.length) {
      showToast('No rows to export for current filters.');
      return;
    }
    const payload = {
      fileName: `workloads_${activeYear === 'All' ? 'all' : activeYear}`,
      title: `Workload Export (${activeYear})`,
      columns: exportColumns,
      rows: filtered,
      sheetName: 'Workloads',
    };
    if (format === 'csv') return exportAsCSV(payload);
    if (format === 'excel') return exportAsExcel(payload);
    exportAsPDF(payload);
  };

  // ── Filtered table ──
  const filtered = useMemo(() => {
    let list = workloads;
    if (activeYear !== 'All') {
      if (activeYear === 'M.Tech') {
        list = list.filter(w => w.year === 'M.Tech');
      } else {
        list = list.filter(w => w.year === activeYear);
      }
    }
    if (filterEmp) list = list.filter(w => w.empId === filterEmp);
    const q = search.toLowerCase();
    if (q) list = list.filter(w =>
      w.empId.includes(q) || w.empName.toLowerCase().includes(q) ||
      w.subjectCode.toLowerCase().includes(q) || w.subjectName.toLowerCase().includes(q)
    );
    return list;
  }, [workloads, activeYear, search, filterEmp]);

  // ── Pending hours for selected faculty ──
  const pendingHours = useMemo(() => {
    if (!form.empId || !prefCourses.length) return null;
    const assignedL = workloads.filter(w => w.empId === form.empId).reduce((s, w) => s + (w.manualL || 0), 0);
    const assignedT = workloads.filter(w => w.empId === form.empId).reduce((s, w) => s + (w.manualT || 0), 0);
    const assignedP = workloads.filter(w => w.empId === form.empId).reduce((s, w) => s + (w.manualP || 0), 0);
    const prefL = prefCourses.reduce((s, c) => s + (c.L || 0), 0);
    const prefT = prefCourses.reduce((s, c) => s + (c.T || 0), 0);
    const prefP = prefCourses.reduce((s, c) => s + (c.P || 0), 0);
    return {
      assignedL, assignedT, assignedP,
      prefL, prefT, prefP,
      pendingL: Math.max(0, prefL - assignedL),
      pendingT: Math.max(0, prefT - assignedT),
      pendingP: Math.max(0, prefP - assignedP),
    };
  }, [form.empId, workloads, prefCourses]);

  // ── Unique employees in workloads (for quick filter) ──
  const empOptions = useMemo(() => {
    const seen = new Set();
    return workloads.filter(w => { const ok = !seen.has(w.empId); seen.add(w.empId); return ok; });
  }, [workloads]);

  // ── Per-faculty workload summary (assigned L/T/P, target, pending) ──

  // ── Grouped per-faculty forms data ──
  const facultyForms = useMemo(() => {
    const map = {};
    workloads.forEach(w => {
      if (!map[w.empId]) {
        const fm = facultyList.find(f => f.empId === w.empId);
        map[w.empId] = {
          empId:       w.empId,
          empName:     w.empName,
          department:  w.department || fm?.department || DEFAULT_DEPARTMENT,
          designation: w.designation,
          mobile:      fm?.mobile || '',
          rows:        [],
        };
      }
      map[w.empId].rows.push(w);
    });
    return Object.values(map).sort((a, b) => a.empName.localeCompare(b.empName));
  }, [workloads]);

  const facultyLoadSummary = useMemo(() => {
    const map = {};
    workloads.forEach((w) => {
      if (!map[w.empId]) {
        map[w.empId] = {
          designation: w.designation || '',
          assigned: 0,
        };
      }
      map[w.empId].assigned += Number(w.manualL || 0) + Number(w.manualT || 0) + Number(w.manualP || 0);
    });

    Object.keys(map).forEach((empId) => {
      const target = getWorkloadTarget(map[empId].designation);
      const assigned = Number(map[empId].assigned.toFixed(2));
      const remaining = Number((target - assigned).toFixed(2));
      map[empId] = {
        ...map[empId],
        target,
        assigned,
        remaining,
        status: assigned > target ? 'Overload' : 'Normal',
      };
    });

    return map;
  }, [workloads]);

  const allFacultyWorkloadBlocks = useMemo(() => {
    const map = {};
    workloads.forEach((w) => {
      if (!map[w.empId]) {
        const fm = facultyList.find((f) => f.empId === w.empId);
        map[w.empId] = {
          empId: w.empId,
          empName: w.empName,
          department: w.department || fm?.department || DEFAULT_DEPARTMENT,
          designation: w.designation,
          mobile: w.mobile || fm?.mobile || '',
          rows: [],
        };
      }
      map[w.empId].rows.push(w);
    });
    return Object.values(map).sort((a, b) => a.empName.localeCompare(b.empName));
  }, [workloads, facultyList]);

  return (
    <div className="wl-wrapper">

      {/* ── Top bar ── */}
      <div className="wl-topbar">
        <div className="wl-topbar-left">
          <h2 className="wl-heading">Work Load Assignment</h2>
          <span className="wl-count-badge">{workloads.length} assigned</span>
        </div>
        <div className="wl-topbar-right">
          <div className="wl-search-wrap">
            <svg className="wl-search-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="wl-search" placeholder="Search by ID, name, course…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="wl-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
          <button className="wl-btn wl-btn-export" onClick={() => exportWorkloads('csv')} disabled={filtered.length === 0}>
            ⬇&nbsp;Export CSV
          </button>
          <button className="wl-btn wl-btn-export" onClick={() => exportWorkloads('excel')} disabled={filtered.length === 0}>
            ⬇&nbsp;Export Excel
          </button>
          <button className="wl-btn wl-btn-export" onClick={() => exportWorkloads('pdf')} disabled={filtered.length === 0}>
            ⬇&nbsp;Export PDF
          </button>
          <button
            className={`wl-btn ${showForms ? 'wl-btn-forms-active' : 'wl-btn-forms'}`}
            disabled={workloads.length === 0}
            onClick={() => setShowForms(v => !v)}
          >
            📄&nbsp;{showForms ? 'Hide Forms' : 'Workload Forms'}
          </button>
          <button className="wl-btn wl-btn-add" onClick={openAdd}>
            +&nbsp;Assign Workload
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ marginBottom: 10, color: '#64748b', fontSize: 12 }}>
          Syncing latest workload data...
        </div>
      )}

      {fetchError && (
        <div className="wl-fetch-error" style={{ marginBottom: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span>⚠ {fetchError}</span>
          <button className="wl-btn wl-btn-export" onClick={fetchWorkloads}>Retry</button>
        </div>
      )}

      {/* ── Quick employee filter chips ── */}
      {empOptions.length > 0 && (
        <div className="wl-emp-filters">
          <button
            className={`wl-emp-chip${!filterEmp ? ' active' : ''}`}
            onClick={() => setFilterEmp('')}
          >All</button>
          {empOptions.map(w => (
            <button
              key={w.empId}
              className={`wl-emp-chip${filterEmp === w.empId ? ' active' : ''}`}
              onClick={() => setFilterEmp(filterEmp === w.empId ? '' : w.empId)}
            >
              {w.empId} — {w.empName.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          ASSIGNMENT FORM (inline card below topbar)
      ════════════════════════════════════════════════ */}
      {showForm && (
        <div className="wl-form-card">
          <div className="wl-form-header">
            <h3>{editTarget ? '✎ Edit Workload Assignment' : '+ Assign New Workload'}</h3>
            <button className="wl-close-btn" onClick={() => setShowForm(false)}>✕ Close</button>
          </div>

          {/* ── SECTION 1: Faculty ── */}
          <div className="wl-fsec-label">
            <span className="wl-fsec-dot wl-dot-blue" />
            Faculty
          </div>
          <div className="wl-form-row">
            <div className="wl-fg">
              <label>Employee ID *</label>
              <select value={form.empId} onChange={e => handleEmpIdChange(e.target.value)}>
                <option value="">— Select Faculty —</option>
                {facultyList.map(f => (
                  <option key={f.empId} value={f.empId}>
                    [{f.empId}]&nbsp; {f.name}
                  </option>
                ))}
                <option value="__other__">Other…</option>
              </select>
              {form.empId === '__other__' && (
                <input className="wl-other-input" placeholder="Type employee ID…"
                  value={form.empIdOther}
                  onChange={e => setForm(p => ({ ...p, empIdOther: e.target.value }))} />
              )}
              {errors.empId && <span className="wl-err">{errors.empId}</span>}
            </div>
            <div className="wl-fg">
              <label>Employee Name</label>
              {form.empId === '__other__' ? (
                <input placeholder="Type employee name…"
                  value={form.empNameOther}
                  onChange={e => setForm(p => ({ ...p, empNameOther: e.target.value }))} />
              ) : (
                <input value={form.empName} readOnly className="wl-readonly" placeholder="Auto-filled" />
              )}
            </div>
            <div className="wl-fg">
              <label>Designation</label>
              {form.empId === '__other__' ? (
                <input placeholder="Type designation…"
                  value={form.designationOther}
                  onChange={e => setForm(p => ({ ...p, designationOther: e.target.value }))} />
              ) : (
                <input value={facMember?.designation || ''} readOnly className="wl-readonly" placeholder="—" />
              )}
            </div>
            <div className="wl-fg">
              <label>Mobile Number {form.empId === '__other__' ? '*' : ''}</label>
              {form.empId === '__other__' ? (
                <>
                  <input placeholder="Type mobile number…"
                    value={form.mobileOther}
                    onChange={e => setForm(p => ({ ...p, mobileOther: e.target.value }))} />
                  {errors.mobile && <span className="wl-err">{errors.mobile}</span>}
                </>
              ) : (
                <input value={facMember?.mobile || form.mobile || ''} readOnly className="wl-readonly" placeholder="—" />
              )}
            </div>
            <div className="wl-fg">
              <label>Faculty Role *</label>
              <select
                value={form.facultyRole || 'Main Faculty'}
                onChange={e => setForm(p => ({ ...p, facultyRole: e.target.value }))}
              >
                {FACULTY_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
            {form.facultyRole === 'TA' && (
              <div className="wl-fg">
                <label>TA Slot in Allocation *</label>
                <select
                  value={form.taAllocationRow || 'R2'}
                  onChange={e => setForm(p => ({ ...p, taAllocationRow: e.target.value }))}
                >
                  <option value="R2">R2 — Row 2</option>
                  <option value="R3">R3 — Row 3</option>
                  <option value="R4">R4 — Row 4</option>
                </select>
              </div>
            )}
            <div className="wl-fg wl-fg-info">
              <label>Preferences Submitted</label>
              <div className={`wl-pref-status ${submission ? 'wl-pref-yes' : form.empId ? 'wl-pref-no' : 'wl-pref-na'}`}>
                {!form.empId
                  ? '—'
                  : submission
                    ? `✓ ${submission.prefs.length} preference(s) on file`
                    : '⚠ No preferences submitted yet'}
              </div>
            </div>
          </div>

          {/* ── Pending Hours Panel ── */}
          {pendingHours && (
            <div className="wl-pending-panel">
              <div className="wl-pending-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Faculty Workload Hours Summary
                <span className="wl-pending-sub">Based on submitted preferences vs assigned workloads</span>
              </div>
              <div className="wl-pending-grid">
                {[
                  { label: 'Lecture Hours (L)',   pref: pendingHours.prefL,   assigned: pendingHours.assignedL, pending: pendingHours.pendingL,   color: '#6366f1', bg: '#eef0fd' },
                  { label: 'Tutorial Hours (T)',  pref: pendingHours.prefT,   assigned: pendingHours.assignedT, pending: pendingHours.pendingT,   color: '#0ea5e9', bg: '#e0f2fe' },
                  { label: 'Practical Hours (P)', pref: pendingHours.prefP,   assigned: pendingHours.assignedP, pending: pendingHours.pendingP,   color: '#22c55e', bg: '#dcfce7' },
                ].map(({ label, pref, assigned, pending, color, bg }) => (
                  <div key={label} className="wl-pending-card" style={{ '--ph-color': color, '--ph-bg': bg }}>
                    <div className="wl-ph-label">{label}</div>
                    <div className="wl-ph-body">
                      <div className="wl-ph-stat">
                        <span className="wl-ph-val">{pref}</span>
                        <span className="wl-ph-key">From Prefs</span>
                      </div>
                      <div className="wl-ph-divider" />
                      <div className="wl-ph-stat">
                        <span className="wl-ph-val">{assigned}</span>
                        <span className="wl-ph-key">Assigned</span>
                      </div>
                      <div className="wl-ph-divider" />
                      <div className="wl-ph-stat wl-ph-stat-pending">
                        <span className="wl-ph-val">{pending}</span>
                        <span className="wl-ph-key">{pending > 0 ? '⏳ Pending' : '✅ Done'}</span>
                      </div>
                    </div>
                    <div className="wl-ph-bar-wrap">
                      <div className="wl-ph-bar-fill"
                        style={{ width: pref > 0 ? `${Math.min(100, (assigned / pref) * 100)}%` : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Faculty Workload Capacity Panel ── */}
          {form.empId && form.empId !== '__other__' && (
            <div className="wl-capacity-panel">
              {workloadHoursLoading ? (
                <div style={{ padding: '12px', color: '#64748b', fontSize: '13px' }}>
                  Loading workload capacity...
                </div>
              ) : workloadHoursError ? (
                <div style={{ padding: '12px', color: '#dc2626', fontSize: '13px' }}>
                  ⚠ {workloadHoursError}
                </div>
              ) : facultyWorkloadSummary ? (
                <>
                  <div className="wl-capacity-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 5v10M8 9h8"/>
                    </svg>
                    Weekly Teaching Hours Capacity
                  </div>
                  <div className="wl-capacity-grid">
                    <div className="wl-cap-card">
                      <div className="wl-cap-label">Total Capacity</div>
                      <div className="wl-cap-value" style={{ color: '#3b82f6' }}>{facultyWorkloadSummary.totalWorkingHours}h</div>
                    </div>
                    <div className="wl-cap-card">
                      <div className="wl-cap-label">Currently Assigned</div>
                      <div className="wl-cap-value" style={{ color: '#8b5cf6' }}>{Math.round(facultyWorkloadSummary.currentLoad)}h</div>
                    </div>
                    <div className="wl-cap-card">
                      <div className="wl-cap-label">Available Hours</div>
                      <div className="wl-cap-value" style={{ color: facultyWorkloadSummary.remainingHours <= 0 ? '#dc2626' : '#16a34a' }}>
                        {Math.round(facultyWorkloadSummary.remainingHours)}h
                      </div>
                    </div>
                    <div className="wl-cap-card">
                      <div className="wl-cap-label">Utilization</div>
                      <div className="wl-cap-value" style={{ color: facultyWorkloadSummary.utilizationPercent > 90 ? '#dc2626' : '#f59e0b' }}>
                        {facultyWorkloadSummary.utilizationPercent}%
                      </div>
                    </div>
                  </div>
                  {facultyWorkloadSummary.isOverAllocated && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 12px', borderRadius: 6, fontSize: '12px', marginTop: '8px' }}>
                      ⚠ Faculty is already over-allocated by {Math.round(facultyWorkloadSummary.currentLoad - facultyWorkloadSummary.totalWorkingHours)}h
                    </div>
                  )}
                  {form.manualL && form.manualT && form.manualP && !editTarget && (
                    <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', color: '#1e40af', padding: '10px 12px', borderRadius: 6, fontSize: '12px', marginTop: '8px' }}>
                      ℹ This assignment will use {Number(form.manualL) + Number(form.manualT) + Number(form.manualP)}h
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          <>
            <div className="wl-fsec-label">
              <span className="wl-fsec-dot wl-dot-purple" />
              Course &amp; Schedule
              {prefCourses.length > 0 && (
                <span className="wl-fsec-hint">Showing faculty's {prefCourses.length} preferred course(s)</span>
              )}
              {form.empId && prefCourses.length === 0 && (
                <span className="wl-fsec-hint wl-fsec-warn">No preferences found — showing all courses</span>
              )}
            </div>
            <div className="wl-form-row">
            <div className="wl-fg wl-fg-course">
              <label>Course to Assign *</label>
              <select value={form.courseId} onChange={e => handleCourseChange(e.target.value)}>
                <option value="">— Select a course —</option>
                {(prefCourses.length > 0 ? prefCourses : courseList).map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.subjectCode}] {c.subjectName} ({c.shortName})
                  </option>
                ))}
                <option value="__other__">Other…</option>
              </select>
              {form.courseId === '__other__' && (
                <input className="wl-other-input" placeholder="Type course name…"
                  value={form.courseOther}
                  onChange={e => setForm(p => ({ ...p, courseOther: e.target.value }))} />
              )}
              {errors.courseId && <span className="wl-err">{errors.courseId}</span>}
            </div>
            <div className="wl-fg">
              <label>Year *</label>
              <select
                value={form.year}
                onChange={e => setForm(p => ({
                  ...p,
                  year:    e.target.value,
                  section: e.target.value !== '__other__'
                    ? ((sectionsConfig[e.target.value] || YEAR_SECTIONS[e.target.value])?.[0] || '1')
                    : p.section,
                }))}
              >
                {YEAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {form.year === '__other__' && (
                <input
                  className="wl-other-input"
                  placeholder="Type Year / Department…"
                  value={form.yearOther}
                  onChange={e => setForm(p => ({ ...p, yearOther: e.target.value }))}
                />
              )}
              {errors.year && <span className="wl-err">{errors.year}</span>}
            </div>
            {form.courseId === '__other__' && (
              <div className="wl-fg">
                <label>Course Type *</label>
                <select value={form.courseType} onChange={e => setForm(p => ({ ...p, courseType: e.target.value }))}>
                  {COURSE_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                  <option value="__other__">Other</option>
                </select>
                {form.courseType === '__other__' && (
                  <input
                    className="wl-other-input"
                    placeholder="Type course type…"
                    value={form.courseTypeOther}
                    onChange={e => setForm(p => ({ ...p, courseTypeOther: e.target.value }))}
                  />
                )}
                {errors.courseType && <span className="wl-err">{errors.courseType}</span>}
              </div>
            )}
            <div className="wl-fg">
              <label>Section *</label>
              <select
                value={form.section}
                onChange={e => setForm(p => ({ ...p, section: e.target.value }))}
              >
                {sections.map(s => <option key={s}>{s}</option>)}
                <option value="__other__">Other…</option>
              </select>
              <div className="wl-sec-actions-inline">
                <button type="button" className="wl-mini-sec-btn" onClick={handleAddSection}>+ Add</button>
                <button type="button" className="wl-mini-sec-btn" onClick={handleEditSection} disabled={!form.section || form.section === '__other__'}>✎ Edit</button>
                <button type="button" className="wl-mini-sec-btn wl-mini-sec-btn-del" onClick={handleDeleteSection} disabled={!form.section || form.section === '__other__'}>✕ Delete</button>
              </div>
              {form.section === '__other__' && (
                <input
                  className="wl-other-input"
                  placeholder="Type section name…"
                  value={form.sectionOther}
                  onChange={e => setForm(p => ({ ...p, sectionOther: e.target.value }))}
                />
              )}
              {errors.section && <span className="wl-err">{errors.section}</span>}
            </div>
          </div>
          </>

          {/* ── SECTION 3: Fixed L-T-P-C from curriculum ── */}
          {selectedCourse && (
            <>
              <div className="wl-fsec-label">
                <span className="wl-fsec-dot wl-dot-gold" />
                Fixed L-T-P-C from Curriculum
                <span className="wl-badge-prog">{selectedCourse.program}</span>
                <span className="wl-badge-type">{selectedCourse.courseType}</span>
              </div>
              <div className="wl-ltpc-strip">
                {[
                  ['L', selectedCourse.L, 'Lecture hrs',  '#6366f1', '#eef0fd'],
                  ['T', selectedCourse.T, 'Tutorial hrs', '#0ea5e9', '#e0f2fe'],
                  ['P', selectedCourse.P, 'Practical hrs','#22c55e', '#dcfce7'],
                  ['C', selectedCourse.C, 'Credits',      '#f59e0b', '#fef9c3'],
                ].map(([k, v, sub, color, bg]) => (
                  <div key={k} className="wl-ltpc-cell" style={{ '--ltpc-color': color, '--ltpc-bg': bg }}>
                    <span className="wl-ltpc-key">{k}</span>
                    <span className="wl-ltpc-val">{v}</span>
                    <span className="wl-ltpc-sub">{sub}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── SECTION 3B: Allocation for this course/year/section ── */}
          {showForm && form.courseId && form.year && form.section && (
            <div className="wl-fsec-label">
              <span className="wl-fsec-dot wl-dot-orange" />
              Current Allocation for this Course/Year/Section
            </div>
          )}
          {showForm && form.courseId && form.year && form.section && (
            <div className="wl-allocation-panel">
              {allocLoading ? (
                <div style={{ color: '#888', fontSize: 13 }}>Refreshing allocation preview...</div>
              ) : allocation ? (
                <table className="wl-alloc-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Row</th>
                      <th>Emp ID</th>
                      <th>Name</th>
                      <th>Designation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationPreviewRows.map((row, idx) => (
                      <tr key={`${row.type}-${row.rowLabel}-${idx}`}>
                        <td>{row.type}</td>
                        <td>{row.rowLabel}</td>
                        <td>{row.empId || '—'}</td>
                        <td>{row.empName || '—'}</td>
                        <td>{row.designation || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: '#888', fontSize: 13 }}>No allocation found for this course/year/section.</div>
              )}
            </div>
          )}

          {/* ── SECTION 4: Admin Manual L-T-P ── */}
          <div className="wl-fsec-label">
            <span className="wl-fsec-dot wl-dot-teal" />
            Admin's Manual L-T-P
            <span className="wl-fsec-hint">C is fixed from curriculum and cannot be changed</span>
          </div>
          <div className="wl-form-row wl-form-row-4">
            {[
              ['manualL', 'L — Lecture hrs'],
              ['manualT', 'T — Tutorial hrs'],
              ['manualP', 'P — Practical hrs'],
            ].map(([key, lbl]) => (
              <div className="wl-fg" key={key}>
                <label>{lbl}</label>
                <input
                  type="number" min="0"
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="wl-fg">
              <label>C — Credits <span className="wl-locked-note">(fixed)</span></label>
              <input
                value={selectedCourse ? selectedCourse.C : ''}
                readOnly placeholder="—"
                className="wl-readonly wl-input-c"
              />
            </div>
          </div>

          {/* ── Form actions ── */}
          <div className="wl-form-actions">
            <button className="wl-btn wl-btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
            {!editTarget && (
              <button
                className="wl-btn wl-btn-add-another"
                onClick={() => saveWorkload(true)}
                disabled={saving}
                title="Save this workload and stay on the form to add another course for the same faculty"
              >
                {saving ? 'Saving…' : '+ Save & Add Another'}
              </button>
            )}
            <button className="wl-btn wl-btn-save" onClick={() => saveWorkload(false)} disabled={saving}>
              {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Assign Workload'}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          YEAR-WISE TABS
      ════════════════════════════════════════════════ */}
      {workloads.length > 0 && (
        <div className="wl-year-tabs">
          {['All', 'I', 'II', 'III', 'IV', 'M.Tech'].map(y => {
            const count = y === 'All'
              ? workloads.length
              : workloads.filter(w => w.year === y).length;
            return (
              <button
                key={y}
                className={`wl-year-tab${activeYear === y ? ' wl-year-tab-active' : ''}`}
                onClick={() => setActiveYear(y)}
              >
                {y === 'All' ? '📋 All Years' : y === 'M.Tech' ? '🎓 M.Tech' : `${y} Year`}
                {count > 0 && <span className="wl-year-tab-badge">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          WORKLOADS TABLE
      ════════════════════════════════════════════════ */}
      {workloads.length === 0 && !loading ? (
        <div className="wl-empty-state">
          <div className="wl-empty-icon">📋</div>
          <div className="wl-empty-title">No workloads assigned yet</div>
          <div className="wl-empty-sub">
            Click <strong>Assign Workload</strong> above to begin assigning faculty workloads.
          </div>
        </div>
      ) : (
        <>
          {allFacultyWorkloadBlocks.length === 0 ? (
            <div className="wl-table-wrap">
              <div className="wl-report-head">No matching records</div>
            </div>
          ) : allFacultyWorkloadBlocks.map((fac) => {
            const summary = facultyLoadSummary[fac.empId] || { remaining: 0, status: 'Normal', target: 0, assigned: 0 };
            return (
              <div className="wl-table-wrap wl-faculty-block" key={fac.empId}>
                <div className="wl-report-head wl-faculty-head">
                  <span>{fac.empName} ({fac.empId})</span>
                  <span className="wl-faculty-meta">{fac.designation || '—'} • {fac.department || DEFAULT_DEPARTMENT} • Mobile: {fac.mobile || '—'}</span>
                  <span className={`wl-report-status ${summary.status === 'Overload' ? 'wl-report-status-over' : 'wl-report-status-ok'}`}>
                    {summary.status} | Assigned: {summary.assigned} / Target: {summary.target} | Remaining: {summary.remaining}
                  </span>
                </div>
                <table className="wl-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Subject Code</th>
                      <th>Subject Name</th>
                      <th>Role</th>
                      <th>Year</th>
                      <th>Sec</th>
                      <th className="wl-th-num" title="Fixed Lecture">📌 L</th>
                      <th className="wl-th-num" title="Fixed Tutorial">📌 T</th>
                      <th className="wl-th-num" title="Fixed Practical">📌 P</th>
                      <th className="wl-th-num wl-th-c" title="Credits">C</th>
                      <th className="wl-th-num" title="Manual Lecture">✏ L</th>
                      <th className="wl-th-num" title="Manual Tutorial">✏ T</th>
                      <th className="wl-th-num" title="Manual Practical">✏ P</th>
                      <th className="wl-th-num" title="Total assigned hours">Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fac.rows.map((w, i) => {
                      const rowTotal = (w.manualL || 0) + (w.manualT || 0) + (w.manualP || 0);
                      return (
                        <tr key={w.id} className={i % 2 === 0 ? 'wl-tr-even' : 'wl-tr-odd'}>
                          <td className="wl-td-sl">{i + 1}</td>
                          <td className="wl-td-code">{w.subjectCode}</td>
                          <td className="wl-td-sname">{w.subjectName}</td>
                          <td>{w.facultyRole || 'Main Faculty'}{w.facultyRole === 'TA' && w.allocationRow ? ` (R${Number(w.allocationRow) + 1})` : ''}</td>
                          <td><span className="wl-year-pill">{w.year}</span></td>
                          <td><span className="wl-sec-pill">{w.section}</span></td>
                          <td className="wl-td-num wl-td-fixed">{w.fixedL}</td>
                          <td className="wl-td-num wl-td-fixed">{w.fixedT}</td>
                          <td className="wl-td-num wl-td-fixed">{w.fixedP}</td>
                          <td className="wl-td-num wl-td-c">{w.C}</td>
                          <td className="wl-td-num wl-td-manual">{w.manualL}</td>
                          <td className="wl-td-num wl-td-manual">{w.manualT}</td>
                          <td className="wl-td-num wl-td-manual">{w.manualP}</td>
                          <td className="wl-td-num wl-td-total">{rowTotal}</td>
                          <td>
                            <div className="wl-actions">
                              <button className="wl-action wl-edit-btn" onClick={() => openEdit(w)}>✎ Edit</button>
                              <button className="wl-action wl-del-btn" onClick={() => setDeleteTarget(w)}>✕ Del</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </>
      )}

      {/* ── Legend ── */}
      {workloads.length > 0 && (
        <div className="wl-legend">
          <span className="wl-legend-item">
            <span className="wl-legend-dot wl-ld-fixed" />📌 Fixed (from curriculum)
          </span>
          <span className="wl-legend-item">
            <span className="wl-legend-dot wl-ld-manual" />✏ Admin manual override
          </span>
          <span className="wl-legend-item">
            <span className="wl-legend-dot wl-ld-c" />C = Credits (fixed)
          </span>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          WORKLOAD FORMS (per faculty)
      ════════════════════════════════════════════════ */}
      {showForms && facultyForms.length > 0 && (
        <div className="wlf-section">
          <div className="wlf-section-header">
            <div className="wlf-section-title">📄 Faculty Workload Forms</div>
            <button className="wlf-print-all-btn" onClick={() => {
              const el = document.getElementById('wlf-print-area');
              const w  = window.open('', '', 'width=900,height=700');
              w.document.write(`<html><head><title>Workload Forms</title><style>
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Poppins', sans-serif; font-size: 12px; color: #1a202c; }
                .wlf-form-card { border: 2px solid #1a202c; padding: 20px 24px; margin-bottom: 32px; page-break-after: always; }
                .wlf-form-card:last-child { page-break-after: avoid; }
                .wlf-inst-header { text-align: center; border-bottom: 2px solid #1a202c; padding-bottom: 10px; margin-bottom: 12px; }
                .wlf-inst-name { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
                .wlf-inst-dept { font-size: 12px; font-weight: 600; margin-top: 3px; }
                .wlf-inst-sub  { font-size: 11px; color: #555; margin-top: 2px; }
                .wlf-fac-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px 16px; margin-bottom: 14px; }
                .wlf-fac-field label { font-size: 9.5px; color: #666; text-transform: uppercase; letter-spacing: .4px; display: block; }
                .wlf-fac-field span { font-size: 12px; font-weight: 600; border-bottom: 1px solid #ccc; display: block; padding-bottom: 2px; }
                table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 10px; }
                th { background: #1a202c; color: #fff; padding: 7px 8px; text-align: center; font-weight: 600; }
                td { border: 1px solid #ccc; padding: 6px 8px; text-align: center; }
                td.left { text-align: left; }
                .wlf-total-row td { background: #f0fdf4; font-weight: 700; }
                .wlf-sum-row { display: flex; gap: 24px; margin-top: 8px; font-size: 12px; }
                .wlf-sign-row { display: flex; justify-content: space-between; margin-top: 28px; font-size: 11.5px; }
                .wlf-sign-box { border-top: 1px solid #555; width: 160px; text-align: center; padding-top: 4px; }
              </style></head><body>${el.innerHTML}</body></html>`);
              w.document.close();
              w.focus();
              w.print();
              w.close();
            }}>
              🖨 Print All Forms
            </button>
          </div>

          <div id="wlf-print-area">
            {facultyForms.map(fac => {
              const totalL = fac.rows.reduce((s, r) => s + (r.manualL || 0), 0);
              const totalT = fac.rows.reduce((s, r) => s + (r.manualT || 0), 0);
              const totalP = fac.rows.reduce((s, r) => s + (r.manualP || 0), 0);
              const totalHrs = totalL + totalT + totalP;
              const target   = getWorkloadTarget(fac.designation);
              const pct      = target > 0 ? Math.round((totalHrs / target) * 100) : 0;
              const status   = totalHrs > target ? 'Overloaded' : totalHrs >= target ? 'Full Workload Met' : `${target - totalHrs} hrs pending`;
              return (
                <div className="wlf-form-card" key={fac.empId}>
                  {/* Institution header */}
                  <div className="wlf-inst-header">
                    <div className="wlf-inst-name">Vignan Foundation for Science Technology &amp; Research</div>
                    <div className="wlf-inst-dept">Department of Computer Science &amp; Engineering</div>
                    <div className="wlf-inst-sub">Faculty Workload Statement &mdash; Academic Year 2025-26</div>
                  </div>

                  {/* Faculty details */}
                  <div className="wlf-fac-grid">
                    <div className="wlf-fac-field">
                      <label>Name</label><span>{fac.empName}</span>
                    </div>
                    <div className="wlf-fac-field">
                      <label>Emp ID</label><span>{fac.empId}</span>
                    </div>
                    <div className="wlf-fac-field">
                      <label>Designation</label><span>{fac.designation}</span>
                    </div>
                    <div className="wlf-fac-field">
                      <label>Department</label><span>{fac.department || DEFAULT_DEPARTMENT}</span>
                    </div>
                    <div className="wlf-fac-field">
                      <label>Mobile</label><span>{fac.mobile || '—'}</span>
                    </div>
                  </div>

                  {/* Course table */}
                  <table className="wlf-table">
                    <thead>
                      <tr>
                        <th style={{width:'3%'}}>#</th>
                        <th style={{width:'11%'}}>Subject Code</th>
                        <th style={{width:'25%',textAlign:'left'}}>Subject Name</th>
                        <th style={{width:'10%'}}>Role</th>
                        <th style={{width:'7%'}}>Year</th>
                        <th style={{width:'6%'}}>Sec</th>
                        <th style={{width:'6%'}}>L</th>
                        <th style={{width:'6%'}}>T</th>
                        <th style={{width:'6%'}}>P</th>
                        <th style={{width:'6%'}}>C</th>
                        <th style={{width:'8%'}}>Total Hrs</th>
                        <th style={{width:'9%'}}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fac.rows.map((r, idx) => (
                        <tr key={r.id}>
                          <td>{idx + 1}</td>
                          <td>{r.subjectCode}</td>
                          <td className="wlf-td-left">{r.subjectName}</td>
                          <td>{r.facultyRole || 'Main Faculty'}</td>
                          <td>{r.year}</td>
                          <td>{r.section}</td>
                          <td>{r.manualL || 0}</td>
                          <td>{r.manualT || 0}</td>
                          <td>{r.manualP || 0}</td>
                          <td>{r.C}</td>
                          <td><strong>{(r.manualL||0)+(r.manualT||0)+(r.manualP||0)}</strong></td>
                          <td></td>
                        </tr>
                      ))}
                      <tr className="wlf-total-row">
                        <td colSpan={5} style={{textAlign:'right',fontWeight:700}}>TOTAL</td>
                        <td>{totalL}</td>
                        <td>{totalT}</td>
                        <td>{totalP}</td>
                        <td></td>
                        <td><strong>{totalHrs}</strong></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Summary & signature */}
                  <div className="wlf-summary-bar">
                    <span className="wlf-sb-item">Total Assigned: <strong>{totalHrs} hrs/week</strong></span>
                    <span className="wlf-sb-item">AICTE Target: <strong>{target} hrs/week</strong></span>
                    <span className={`wlf-sb-status ${totalHrs > target ? 'wlf-st-over' : totalHrs >= target ? 'wlf-st-done' : 'wlf-st-pend'}`}>
                      {totalHrs > target ? '⚠ Overloaded' : totalHrs >= target ? '✓ Full Workload Met' : `⏳ ${target - totalHrs} hrs remaining`}
                    </span>
                    <div className="wlf-prog-wrap">
                      <div className="wlf-prog-bar">
                        <div
                          className={`wlf-prog-fill ${totalHrs > target ? 'wlf-pf-over' : totalHrs >= target ? 'wlf-pf-done' : 'wlf-pf-pend'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className="wlf-prog-label">{pct}%</span>
                    </div>
                  </div>
                  <div className="wlf-sign-row">
                    <div className="wlf-sign-box">Deputy HoD-CSE</div>
                    <div className="wlf-sign-box">HoD-CSE</div>
                    <div className="wlf-sign-box">Dean SOCI</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}



      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <div className="wl-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="wl-modal" onClick={e => e.stopPropagation()}>
            <div className="wl-modal-head">
              <h3>Remove Workload</h3>
              <button className="wl-modal-x" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <p className="wl-confirm-text">
              Remove workload for <strong>{deleteTarget.empName}</strong> —&nbsp;
              <strong>{deleteTarget.subjectName}</strong>&nbsp;
              (Year {deleteTarget.year} – Sec {deleteTarget.section})?
              <br />This cannot be undone.
            </p>
            <div className="wl-modal-foot">
              <button className="wl-btn wl-btn-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="wl-btn wl-btn-danger" onClick={confirmDelete}>Yes, Remove</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="wl-toast">{toast}</div>}
    </div>
  );
};

export default WorkloadPage;
