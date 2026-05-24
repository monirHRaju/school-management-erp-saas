/**
 * Calculate grade from totalMark using a school's gradeScale.
 * Bangladeshi system: raw mark compared against minMark thresholds (not percentage).
 * @param {number} totalMark
 * @param {Array<{grade, minMark, gradePoint, isFail}>} grades
 * @returns {{ grade: string, gradePoint: number, isFail: boolean }}
 */
function calcGrade(totalMark, grades) {
  if (!grades || grades.length === 0) {
    return { grade: 'N/A', gradePoint: 0, isFail: false };
  }

  const sorted = [...grades].sort((a, b) => b.minMark - a.minMark);

  for (const entry of sorted) {
    if (totalMark >= entry.minMark) {
      return {
        grade: entry.grade,
        gradePoint: entry.gradePoint,
        isFail: entry.isFail || false,
      };
    }
  }

  // Fallback: use the fail/lowest entry
  const failEntry = sorted[sorted.length - 1];
  return {
    grade: failEntry.grade,
    gradePoint: failEntry.gradePoint,
    isFail: true,
  };
}

module.exports = { calcGrade };
