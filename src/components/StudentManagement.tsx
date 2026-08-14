import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import {
  getAllRegisteredStudents,
  updateStudentStatus,
  updateStudentClassAndSection,
  deleteStudent,
} from '../services/db';
import {
  Search,
  Filter,
  Trash2,
  GraduationCap,
  RefreshCw,
  Edit2,
  Check,
  X,
  Mail,
  UserCheck,
  UserX,
  Clock,
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');

  // Edit Class/Section Modal State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editClass, setEditClass] = useState('Class 6');
  const [editSection, setEditSection] = useState('A');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const list = await getAllRegisteredStudents();
      setStudents(list);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleToggleStatus = async (student: Student) => {
    const newStatus = student.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, status: newStatus } : s))
    );
    try {
      await updateStudentStatus(student.id, newStatus);
    } catch (err) {
      console.error('Error toggling student status:', err);
      loadStudents();
    }
  };

  const handleSaveClassEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setIsUpdating(true);
    try {
      await updateStudentClassAndSection(editingStudent.id, editClass, editSection);
      setEditingStudent(null);
      await loadStudents();
    } catch (err) {
      console.error('Error updating student class:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    const isProtected = student.name?.toLowerCase() === 'kiran' && student.email?.includes('kiran');
    if (isProtected) {
      alert('Primary registered student Kiran is protected and cannot be deleted.');
      return;
    }

    if (!window.confirm(`Delete student record for ${student.name} (${student.email || student.id})?`)) return;

    setStudents((prev) => prev.filter((s) => s.id !== student.id));
    await deleteStudent(student.id, student.studentId, student.name);
  };

  const filteredStudents = students.filter((s) => {
    const matchesClass =
      classFilter === 'All' || (s.class && s.class.toLowerCase() === classFilter.toLowerCase());
    const matchesQuery =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesClass && matchesQuery;
  });

  const formatLastLogin = (ts?: string) => {
    if (!ts) return 'First Login Pending';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return 'First Login Pending';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'First Login Pending';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#16449B] rounded-[14px] p-6 shadow-[0_2px_8px_rgba(11,61,145,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-[#16449B] text-white text-xs px-3 py-1 rounded-full font-bold">
            Admin Management
          </span>
          <h2 className="text-xl font-extrabold text-[#16449B] mt-2">Registered Students & Google Accounts</h2>
          <p className="text-xs font-semibold text-[#16449B]/80 mt-1">
            View Google authenticated students, track recent activity, update enrolled class or section, and manage account access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStudents}
            className="flex items-center gap-2 bg-white border border-[#D6E4FF] hover:bg-[#F8FBFF] text-[#16449B] px-3.5 py-2 rounded-[8px] text-xs font-bold cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#16449B] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Roster</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FFFFFF] p-4 border border-[#D6E4FF] rounded-[14px] shadow-[0_2px_8px_rgba(11,61,145,0.08)]">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#16449B] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Student Name or Gmail address..."
            className="w-full bg-white border border-[#D6E4FF] rounded-[8px] pl-9 pr-4 py-2 text-xs text-[#16449B] font-medium placeholder-[#16449B]/50 focus:outline-none focus:border-[#16449B]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#16449B]" />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-white border border-[#D6E4FF] rounded-[8px] px-3 py-2 text-xs text-[#16449B] font-bold focus:outline-none focus:border-[#16449B] cursor-pointer w-full sm:w-auto"
          >
            <option value="All">All Classes</option>
            <option value="Class 6">Class 6</option>
            <option value="Class 7">Class 7</option>
            <option value="Class 8">Class 8</option>
            <option value="Class 9">Class 9</option>
            <option value="Class 10">Class 10</option>
          </select>
        </div>
      </div>

      {/* Student Table */}
      {filteredStudents.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#D6E4FF] rounded-[14px] p-12 text-center space-y-3 shadow-[0_2px_8px_rgba(11,61,145,0.08)]">
          <GraduationCap className="w-12 h-12 text-[#16449B] mx-auto" />
          <h3 className="text-lg font-bold text-[#16449B]">No Registered Students Found</h3>
          <p className="text-xs font-semibold text-[#16449B]/80">
            Students will automatically appear here once they log in via Google.
          </p>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] border border-[#D6E4FF] rounded-[14px] overflow-hidden shadow-[0_2px_8px_rgba(11,61,145,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#16449B]">
              <thead className="bg-[#16449B] text-white uppercase font-bold border-b border-[#D6E4FF]">
                <tr>
                  <th className="px-6 py-3.5">Student Name</th>
                  <th className="px-6 py-3.5">Gmail Address</th>
                  <th className="px-6 py-3.5">Enrolled Class</th>
                  <th className="px-6 py-3.5">Last Login</th>
                  <th className="px-6 py-3.5">Access Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6E4FF] text-[#16449B]">
                {filteredStudents.map((s) => {
                  const isActive = s.status !== 'INACTIVE';

                  return (
                    <tr key={s.id} className="hover:bg-[#F8FBFF] transition-colors">
                      <td className="px-6 py-4 font-bold text-[#16449B] flex items-center gap-3">
                        {s.photoURL ? (
                          <img
                            src={s.photoURL}
                            alt={s.name}
                            className="w-8 h-8 rounded-full border border-[#D6E4FF] object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#16449B] text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                        )}
                        <span>{s.name}</span>
                      </td>

                      <td className="px-6 py-4 font-mono font-medium text-[#16449B] flex items-center gap-1.5 pt-5">
                        <Mail className="w-3.5 h-3.5 text-[#16449B]/70 shrink-0" />
                        <span>{s.email || 'Not connected'}</span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="bg-white border border-[#D6E4FF] text-[#16449B] px-2.5 py-1 rounded-[6px] font-bold inline-flex items-center gap-1">
                          {s.class || 'Pending'} {s.section ? `(${s.section})` : ''}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-medium text-[#16449B]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#16449B]/70 shrink-0" />
                          <span>{formatLastLogin(s.lastLoginAt)}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(s)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-[#16449B]/10 text-[#16449B] border border-[#16449B]'
                              : 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <UserCheck className="w-3 h-3 text-[#16449B]" />
                              <span>ACTIVE</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3 text-[#DC2626]" />
                              <span>DISABLED</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingStudent(s);
                              setEditClass(s.class || 'Class 6');
                              setEditSection(s.section || 'A');
                            }}
                            className="p-1.5 text-[#16449B] hover:bg-[#16449B] hover:text-white border border-[#16449B] rounded-[6px] cursor-pointer transition-colors"
                            title="Edit Class / Section"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteStudent(s)}
                            className="p-1.5 text-[#DC2626] hover:bg-[#DC2626] hover:text-white border border-[#DC2626] rounded-[6px] cursor-pointer transition-colors"
                            title="Delete Student Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-[#16449B]/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#16449B] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setEditingStudent(null)}
              className="absolute right-4 top-4 text-[#16449B] hover:opacity-70 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-[#16449B]">Update Class & Section</h3>
              <p className="text-xs font-semibold text-[#16449B]/80 mt-0.5">{editingStudent.name}</p>
            </div>

            <form onSubmit={handleSaveClassEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#16449B] block">Class / Grade</label>
                <select
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  className="w-full bg-white border border-[#16449B] rounded-xl px-3 py-2.5 text-sm text-[#16449B] font-bold focus:outline-none focus:ring-2 focus:ring-[#16449B] cursor-pointer"
                >
                  <option value="Class 6">Class 6</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#16449B] block">Section</label>
                <input
                  type="text"
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value.toUpperCase())}
                  placeholder="e.g. A"
                  className="w-full bg-white border border-[#16449B] rounded-xl px-3 py-2.5 text-sm text-[#16449B] font-bold focus:outline-none focus:ring-2 focus:ring-[#16449B]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl border border-[#16449B] text-[#16449B] hover:bg-[#16449B] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-[#16449B] hover:bg-[#16449B]/90 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
