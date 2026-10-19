const DEFAULT_GRADES = [
  { grade: 'A+', minMark: 80, gradePoint: 5.0, isFail: false },
  { grade: 'A', minMark: 70, gradePoint: 4.0, isFail: false },
  { grade: 'A-', minMark: 60, gradePoint: 3.5, isFail: false },
  { grade: 'B', minMark: 50, gradePoint: 3.0, isFail: false },
  { grade: 'C', minMark: 40, gradePoint: 2.0, isFail: false },
  { grade: 'D', minMark: 33, gradePoint: 1.0, isFail: false },
  { grade: 'F', minMark: 0, gradePoint: 0, isFail: true },
];

/**
 * Calculate grade from totalMark using a school's gradeScale.
 * Bangladeshi system: raw mark compared against minMark thresholds (not percentage).
 * @param {number} totalMark
 * @param {Array<{grade, minMark, gradePoint, isFail}>} grades
 * @returns {{ grade: string, gradePoint: number, isFail: boolean }}
 */
function calcGrade(totalMark, grades) {
  const scale = Array.isArray(grades) && grades.length > 0 ? grades : DEFAULT_GRADES;
  const sorted = [...scale].sort((a, b) => b.minMark - a.minMark);

  for (const entry of sorted) {
    if (totalMark >= entry.minMark) {
      return {
        grade: entry.grade,
        gradePoint: entry.gradePoint,
        isFail: Boolean(entry.isFail),
      };
    }
  }

  // Fallback: below all thresholds -> F / fail
  const failEntry = sorted.find((g) => g.isFail) || sorted[sorted.length - 1];
  return {
    grade: failEntry ? failEntry.grade : 'F',
    gradePoint: 0,
    isFail: true,
  };
}

module.exports = { calcGrade, DEFAULT_GRADES };
