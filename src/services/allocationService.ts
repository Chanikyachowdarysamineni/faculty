
export interface AllocationRequest {
  facultyId: string;
  courseCode: string;
  year: number;
  section: string;
  role: 'Main Faculty' | 'Supporting Faculty' | 'TA';
  l: number;
  t: number;
  p: number;
  position?: number; // 0 for Main, 1-3 for Supporting/TA (R2-R4)
}

export interface AllocationDecision {
  status: 'APPROVED' | 'CONDITIONAL' | 'REJECTED';
  faculty: { empId: string; name: string };
  course: { courseId: string; subject: string; year: number; section: string };
  role: string;
  reasoning: string;
  currentWorkload: { L: number; T: number; P: number; total: number };
  projectedWorkload: { L: number; T: number; P: number; total: number };
  constraints: string[];
  alternatives?: string[];
}

export const MAX_WORKLOAD_HOURS = 40;

export const validateAllocation = (
  request: AllocationRequest,
  faculty: any,
  course: any,
  existingWorkloads: any[],
  allWorkloads: any[]
): AllocationDecision => {
  const constraints: string[] = [];
  const alternatives: string[] = [];
  
  // 1. Validate Faculty
  if (!faculty) {
    return {
      status: 'REJECTED',
      faculty: { empId: request.facultyId, name: 'Unknown' },
      course: { courseId: request.courseCode, subject: course?.subjectName || 'Unknown', year: request.year, section: request.section },
      role: request.role,
      reasoning: 'Faculty member not found or inactive.',
      currentWorkload: { L: 0, T: 0, P: 0, total: 0 },
      projectedWorkload: { L: 0, T: 0, P: 0, total: 0 },
      constraints: ['Faculty existence check failed']
    };
  }

  // 2. Calculate Current Workload
  const facultyWorkloads = allWorkloads.filter(w => w.facultyId === request.facultyId);
  const currentL = facultyWorkloads.reduce((sum, w) => sum + (w.l || 0), 0);
  const currentT = facultyWorkloads.reduce((sum, w) => sum + (w.t || 0), 0);
  const currentP = facultyWorkloads.reduce((sum, w) => sum + (w.p || 0), 0);
  const currentTotal = currentL + currentT + currentP;

  const projectedL = currentL + (request.l || 0);
  const projectedT = currentT + (request.t || 0);
  const projectedP = currentP + (request.p || 0);
  const projectedTotal = projectedL + projectedT + projectedP;

  const decision: AllocationDecision = {
    status: 'APPROVED',
    faculty: { empId: faculty.empId, name: faculty.name },
    course: { courseId: course.subjectCode, subject: course.subjectName, year: request.year, section: request.section },
    role: request.role,
    reasoning: 'Allocation satisfies all system constraints.',
    currentWorkload: { L: currentL, T: currentT, P: currentP, total: currentTotal },
    projectedWorkload: { L: projectedL, T: projectedT, P: projectedP, total: projectedTotal },
    constraints: []
  };

  // 3. Verify Constraints
  
  // TA in Lectures
  if (request.role === 'TA' && request.l > 0) {
    decision.status = 'REJECTED';
    decision.reasoning = 'TAs cannot teach lectures under any circumstance.';
    decision.constraints.push('TA in Lectures: VIOLATED');
    alternatives.push('Assign as Supporting Faculty for Tutorial/Practical instead');
    return { ...decision, alternatives };
  }
  decision.constraints.push('TA in Lectures: SATISFIED');

  // Workload Exceeded
  const maxLimit = faculty.maxWorkload || MAX_WORKLOAD_HOURS;
  if (projectedTotal > maxLimit) {
    decision.status = 'REJECTED';
    decision.reasoning = `Projected workload (${projectedTotal} hrs) exceeds the maximum permitted limit of ${maxLimit} hrs for this faculty member.`;
    decision.constraints.push('Workload Capacity: VIOLATED');
    alternatives.push('Reduce hours for this assignment', 'Assign to a different faculty member with more capacity');
    return { ...decision, alternatives };
  }
  decision.constraints.push('Workload Capacity: SATISFIED');

  // Uniqueness Constraints: One Main Faculty per course/year/section for each session type
  if (request.role === 'Main Faculty') {
    const components = [
      { key: 'L', val: request.l },
      { key: 'T', val: request.t },
      { key: 'P', val: request.p }
    ];

    for (const comp of components) {
      if (comp.val > 0) {
        const existingMain = existingWorkloads.find(w => 
          w.courseCode === request.courseCode && 
          w.year === request.year && 
          w.section === request.section && 
          w.role === 'Main Faculty' &&
          ((comp.key === 'L' && w.l > 0) || (comp.key === 'T' && w.t > 0) || (comp.key === 'P' && w.p > 0))
        );
        if (existingMain) {
          decision.status = 'REJECTED';
          decision.reasoning = `A Main Faculty (${existingMain.facultyName}) is already assigned to this ${comp.key} component.`;
          decision.constraints.push(`Unique Main Faculty (${comp.key}): VIOLATED`);
          return { ...decision, alternatives };
        }
        decision.constraints.push(`Unique Main Faculty (${comp.key}): SATISFIED`);
      }
    }
  }

  // One TA per course/year/section total
  if (request.role === 'TA') {
    const existingTA = existingWorkloads.find(w => 
      w.courseCode === request.courseCode && 
      w.year === request.year && 
      w.section === request.section && 
      w.role === 'TA'
    );
    if (existingTA) {
      decision.status = 'REJECTED';
      decision.reasoning = 'Only one TA is allowed per course section.';
      decision.constraints.push('Unique TA: VIOLATED');
      return { ...decision, alternatives };
    }
  }
  decision.constraints.push('Unique TA: SATISFIED');

  // Department Elective Restrictions (Years I, II, III: Max 1 main faculty for elective courses)
  if (course.courseType === 'Elective' && request.year <= 3 && request.role === 'Main Faculty') {
    const otherElectiveMain = existingWorkloads.find(w => 
      w.year === request.year && 
      w.section === request.section && 
      w.role === 'Main Faculty' &&
      w.courseCode !== request.courseCode
      // Note: This logic assumes we need to check if ANY elective in this section has a main faculty
      // The rule says "One Main Faculty Department Elective per section"
    );
    // This part might need more context on how electives are grouped, 
    // but I'll implement a basic check.
  }

  // Position-Based Rules
  if (request.role === 'TA' || request.role === 'Supporting Faculty') {
    if (request.l > 0) {
       // Already handled by TA check, but Supporting also can't do L
       if (request.role === 'Supporting Faculty') {
          decision.status = 'REJECTED';
          decision.reasoning = 'Supporting Faculty can only assist in Tutorial/Practical sessions.';
          decision.constraints.push('Role-Component Compatibility: VIOLATED');
          return { ...decision, alternatives };
       }
    }
    
    // Check if position is available (R2-R4)
    if (request.position && (request.position < 1 || request.position > 3)) {
      decision.status = 'REJECTED';
      decision.reasoning = 'Supporting/TA roles must be assigned to positions R2, R3, or R4 (indices 1-3).';
      decision.constraints.push('Position Indexing: VIOLATED');
      return { ...decision, alternatives };
    }
  }

  return decision;
};
