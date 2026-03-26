'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import type { Student } from '@/types/student';
import StudentForm from '../../_components/StudentForm';

export default function EditStudentPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudent = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await apiRequest<{ success: boolean; data: Student }>(
        `/api/students/${id}`,
        { token }
      );
      setStudent(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load student');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Student not found</p>
      </div>
    );
  }

  return <StudentForm student={student} />;
}
