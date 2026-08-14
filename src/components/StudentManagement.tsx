import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import {
  getAllRegisteredStudents,
  createRegisteredStudent,
  deleteStudent,
  deleteAllStudentsExceptKiran,
  INITIAL_REGISTERED_STUDENTS,
} from '../services/db';
import {
  UserPlus,
  Search,
  Filter,
  Trash2,
  Key,
  Copy,
  Check,
  Phone,
  GraduationCap,
  Sparkles,
  RefreshCw,
  X,
  Share2,
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('Class 6');
  const [section, setSection] = useState('A');
  const [rollNumber, setRollNumber] = useState('');
  const [parentMobile, setParentMobile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Generated Credentials Modal State
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);
  const [copied, setCopied] = useState(false);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const list = await getAllRegisteredStudents();
      setStudents(list);
    } catch (err) {
      console.error('Error loading students:', err);
      setStudents(INITIAL_REGISTERED_STUDENTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter the student full name');
      return;
    }
    if (!parentMobile.trim() || parentMobile.trim().length < 10) {
      setFormError('Please enter a valid 10-digit Parent Mobile Number');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      const newStudent = await createRegisteredStudent({
        name: name.trim(),
        class: studentClass,
        section: section.trim() || 'A',
        rollNumber: rollNumber.trim(),
        parentMobile: parentMobile.trim(),
      });

      setShowAddModal(false);
      setName('');
      setRollNumber('');
      setParentMobile('');
      setSection('A');

      // Show generated credentials modal
      setCreatedStudent(newStudent);
      await loadStudents();
    } catch (err) {
      console.error('Failed to create student:', err);
      setFormError('Failed to create student. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    const isProtected =
      student.studentId?.toLowerCase() === 'c6-2026-0012' ||
      (student.name?.toLowerCase() === 'kiran' && student.class === 'Class 6');

    if (isProtected) {
      alert('Primary registered student kiran (c6-2026-0012) is protected and cannot be deleted.');
      return;
    }

    if (!window.confirm(`Delete student ${student.name} (${student.studentId || student.id})?`)) return;

    // Immediately update UI state
    setStudents((prev) => prev.filter((s) => s.id !== student.id && s.studentId !== student.studentId));

    // Delete from database & local storage
    await deleteStudent(student.id, student.studentId, student.name);
  };

  const handleDeleteAllExceptKiran = async () => {
    if (!window.confirm('Delete all students except kiran (c6-2026-0012)? This will remove all other records from the database.')) return;
    setIsLoading(true);
    try {
      const remaining = await deleteAllStudentsExceptKiran();
      setStudents(remaining);
    } catch (err) {
      console.error('Failed to clear students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdStudent) return;
    const text = `CBSE Maths Portal Login Credentials\nStudent ID: ${createdStudent.studentId || createdStudent.id}\nPassword: ${createdStudent.password}\nClass: ${createdStudent.class}\nName: ${createdStudent.name}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredStudents = students.filter((s) => {
    const matchesClass =
      classFilter === 'All' || s.class.toLowerCase() === classFilter.toLowerCase();
    const matchesQuery =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.parentMobile && s.parentMobile.includes(searchQuery));
    return matchesClass && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#2563EB] rounded-[14px] p-6 shadow-[0_2px_8px_rgba(11,61,145,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-[#0B3D91] text-white text-xs px-3 py-1 rounded-full font-bold">
            Admin Management
          </span>
          <h2 className="text-xl font-extrabold text-[#0B3D91] mt-2">Student Registration & Credentials</h2>
          <p className="text-xs font-semibold text-[#0B3D91]/80 mt-1">
            Register students, generate temporary access credentials, and store parent mobile numbers for automated performance card alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDeleteAllExceptKiran}
            title="Delete all students except c6-2026-0012 ID"
            className="btn-danger text-xs flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Trash2 className="w-3.5 h-3.5 text-white" />
            <span>Delete All Except c6-2026-0012</span>
          </button>

          <button
            onClick={loadStudents}
            className="flex items-center gap-2 bg-white border border-[#D6E4FF] hover:bg-[#F8FBFF] text-[#0B3D91] px-3.5 py-2 rounded-[8px] text-xs font-bold cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0B3D91] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs flex items-center gap-2 shadow-md cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-white" />
            <span>Add New Student</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FFFFFF] p-4 border border-[#D6E4FF] rounded-[14px] shadow-[0_2px_8px_rgba(11,61,145,0.08)]">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#0B3D91] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Student Name, ID, or Parent Mobile..."
            className="w-full bg-white border border-[#D6E4FF] rounded-[8px] pl-9 pr-4 py-2 text-xs text-[#0B3D91] font-medium placeholder-[#0B3D91]/50 focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#0B3D91]" />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-white border border-[#D6E4FF] rounded-[8px] px-3 py-2 text-xs text-[#0B3D91] font-bold focus:outline-none focus:border-[#2563EB] cursor-pointer w-full sm:w-auto"
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
          <GraduationCap className="w-12 h-12 text-[#2563EB] mx-auto" />
          <h3 className="text-lg font-bold text-[#0B3D91]">No Registered Students Found</h3>
          <p className="text-xs font-semibold text-[#0B3D91]/80">
            Click "Add New Student" above to generate credentials for students.
          </p>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] border border-[#D6E4FF] rounded-[14px] overflow-hidden shadow-[0_2px_8px_rgba(11,61,145,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0B3D91]">
              <thead className="bg-[#0B3D91] text-white uppercase font-bold border-b border-[#D6E4FF]">
                <tr>
                  <th className="px-6 py-3.5">Student ID</th>
                  <th className="px-6 py-3.5">Student Name</th>
                  <th className="px-6 py-3.5">Class / Sec</th>
                  <th className="px-6 py-3.5">Roll No.</th>
                  <th className="px-6 py-3.5">Parent Mobile</th>
                  <th className="px-6 py-3.5">Passkey Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6E4FF] text-[#0B3D91]">
                {filteredStudents.map((s) => {
                  const isProtected = s.studentId?.toLowerCase() === 'c6-2026-0012';

                  return (
                    <tr key={s.id} className="hover:bg-[#F8FBFF] transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[#0B3D91]">
                        {s.studentId || s.id}
                      </td>
                      <td className="px-6 py-4 font-bold text-[#0B3D91]">{s.name}</td>
                      <td className="px-6 py-4">
                        <span className="bg-white border border-[#D6E4FF] text-[#0B3D91] px-2.5 py-1 rounded-[6px] font-bold">
                          {s.class} {s.section ? `(${s.section})` : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#0B3D91]">{s.rollNumber || '-'}</td>
                      <td className="px-6 py-4 font-mono text-[#0B3D91] font-bold flex items-center gap-1.5 pt-4">
                        <Phone className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                        <span>{s.parentMobile || 'Not provided'}</span>
                      </td>
                      <td className="px-6 py-4">
                        {s.isPasswordChanged ? (
                          <span className="bg-[#2563EB] text-white border border-[#2563EB] text-[11px] px-2.5 py-1 rounded-full font-bold">
                            Custom Set
                          </span>
                        ) : (
                          <span className="bg-white text-[#0B3D91] border border-[#D6E4FF] text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-max">
                            <Key className="w-3 h-3 text-[#2563EB]" />
                            Temp ({s.password})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          disabled={isProtected}
                          onClick={() => handleDeleteStudent(s)}
                          className={
                            isProtected
                              ? 'p-1.5 text-slate-400 opacity-40 cursor-not-allowed rounded-lg'
                              : 'p-1.5 text-[#DC2626] hover:bg-[#DC2626] hover:text-white border border-[#DC2626] rounded-[6px] cursor-pointer transition-colors'
                          }
                          title={isProtected ? 'Primary registered student cannot be deleted' : 'Delete Student'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#0052CC]/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#0052CC] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-[#0052CC] hover:opacity-70 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#0052CC]/20 pb-4">
              <div className="p-2.5 bg-[#0052CC] rounded-xl text-white">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0052CC]">Register New Student</h3>
                <p className="text-xs font-semibold text-[#0052CC]/80">Auto-generates Student ID and Temporary Password</p>
              </div>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0052CC] block">
                  Student Full Name <span className="text-[#D32F2F]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kiran"
                  className="w-full bg-white border border-[#0052CC] rounded-xl px-4 py-2.5 text-sm text-[#0052CC] font-bold placeholder-[#0052CC]/50 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-[#0052CC] block">Class / Grade *</label>
                  <select
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full bg-white border border-[#0052CC] rounded-xl px-3 py-2.5 text-sm text-[#0052CC] font-bold focus:outline-none focus:ring-2 focus:ring-[#0052CC] cursor-pointer"
                  >
                    <option value="Class 6">Class 6</option>
                    <option value="Class 7">Class 7</option>
                    <option value="Class 8">Class 8</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0052CC] block">Section</label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="A"
                    className="w-full bg-white border border-[#0052CC] rounded-xl px-3 py-2.5 text-sm text-[#0052CC] font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#0052CC] uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0052CC] block">Roll Number (Optional)</label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 23"
                  className="w-full bg-white border border-[#0052CC] rounded-xl px-4 py-2.5 text-sm text-[#0052CC] font-bold placeholder-[#0052CC]/50 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0052CC] block">
                  Parent Mobile Number <span className="text-[#D32F2F]">*</span>
                </label>
                <input
                  type="tel"
                  value={parentMobile}
                  onChange={(e) => setParentMobile(e.target.value)}
                  placeholder="10-digit mobile (e.g. 9876543210)"
                  className="w-full bg-white border border-[#0052CC] rounded-xl px-4 py-2.5 text-sm text-[#0052CC] font-bold placeholder-[#0052CC]/50 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  required
                />
                <p className="text-[10px] text-[#0052CC]/80 font-bold mt-1">
                  Required to send automated WhatsApp/SMS performance progress cards.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-[#D32F2F]/10 border border-[#D32F2F] rounded-xl text-xs font-bold text-[#D32F2F]">
                  {formError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#0052CC] text-[#0052CC] hover:bg-[#0052CC] hover:text-white text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0052CC] hover:bg-[#003d99] text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? 'Creating Student...' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Confirmation Modal */}
      {createdStudent && (
        <div className="fixed inset-0 z-50 bg-[#0052CC]/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#0052CC] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center relative">
            <div className="w-14 h-14 bg-[#0052CC] text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-[#0052CC]">Student Account Created!</h3>
              <p className="text-xs font-bold text-[#0052CC]/80 mt-1">
                Generated login credentials for <strong className="text-[#0052CC]">{createdStudent.name}</strong>
              </p>
            </div>

            <div className="bg-white border-2 border-[#0052CC] rounded-xl p-5 text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-[#0052CC]/20 pb-2">
                <span className="text-[#0052CC] font-sans font-bold">Student ID :</span>
                <span className="text-[#0052CC] font-bold text-sm">{createdStudent.studentId || createdStudent.id}</span>
              </div>

              <div className="flex justify-between items-center border-b border-[#0052CC]/20 pb-2">
                <span className="text-[#0052CC] font-sans font-bold">Temp Password :</span>
                <span className="text-[#D32F2F] font-bold text-sm">{createdStudent.password}</span>
              </div>

              <div className="flex justify-between items-center border-b border-[#0052CC]/20 pb-2">
                <span className="text-[#0052CC] font-sans font-bold">Class / Section :</span>
                <span className="text-[#0052CC] font-sans font-bold">{createdStudent.class} ({createdStudent.section || 'A'})</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#0052CC] font-sans font-bold">Parent Mobile :</span>
                <span className="text-[#0052CC] font-sans font-bold">{createdStudent.parentMobile}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 bg-white border border-[#0052CC] hover:bg-[#0052CC] hover:text-white text-[#0052CC] font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-[#0052CC]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Info'}</span>
              </button>

              <a
                href={`https://wa.me/91${createdStudent.parentMobile}?text=${encodeURIComponent(
                  `Dear Parent, Student login details for ${createdStudent.name} on CBSE Maths Examination Portal:\nStudent ID: ${createdStudent.studentId || createdStudent.id}\nTemporary Password: ${createdStudent.password}\nPlease log in to start taking practice exams.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-[#0052CC] hover:bg-[#003d99] text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Send via WhatsApp</span>
              </a>
            </div>

            <button
              onClick={() => setCreatedStudent(null)}
              className="w-full bg-[#0052CC] hover:bg-[#003d99] text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
