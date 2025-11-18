'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, query, where, getDocs, collection, Timestamp, orderBy } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/auditLogger';
import { CloudArrowUpIcon, TrashIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FormData {
  firstName: string;
  middleName: string;
  lastName: string;
  admissionNumber: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | '';
  currentClassId: string;
  address: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface ParentUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const studentId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    admissionNumber: '',
    dateOfBirth: '',
    gender: '',
    currentClassId: '',
    address: '',
  });
  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);

  // Photo upload state
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Guardian management state
  const [guardianIds, setGuardianIds] = useState<string[]>([]);
  const [guardians, setGuardians] = useState<ParentUser[]>([]);
  const [availableParents, setAvailableParents] = useState<ParentUser[]>([]);
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [updatingGuardians, setUpdatingGuardians] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load student data
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        if (!studentDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const data = studentDoc.data();
        const initialData = {
          firstName: data.firstName || '',
          middleName: data.middleName || '',
          lastName: data.lastName || '',
          admissionNumber: data.admissionNumber || '',
          dateOfBirth: data.dateOfBirth?.toDate().toISOString().split('T')[0] || '',
          gender: data.gender || '',
          currentClassId: data.currentClassId || '',
          address: data.address || '',
        };
        setFormData(initialData);
        setOriginalData(initialData);

        // Set photo URL
        setPhotoUrl(data.photoUrl || '');

        // Set guardian IDs
        const studentGuardianIds = data.guardianIds || [];
        setGuardianIds(studentGuardianIds);

        // Load classes
        const tenantId = data.tenantId;
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', tenantId),
          orderBy('name')
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classOptions = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setClasses(classOptions);

        // Load all parent users
        const parentsQuery = query(
          collection(db, 'users'),
          where('tenantId', '==', tenantId),
          where('role', '==', 'parent')
        );
        const parentsSnapshot = await getDocs(parentsQuery);
        const parentsData = parentsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email,
          phone: doc.data().phone,
        })) as ParentUser[];

        // Separate current guardians from available parents
        const currentGuardians = parentsData.filter(p => studentGuardianIds.includes(p.id));
        const available = parentsData.filter(p => !studentGuardianIds.includes(p.id));

        setGuardians(currentGuardians);
        setAvailableParents(available);

        setLoading(false);
      } catch (error) {
        console.error('Error loading student:', error);
        setNotFound(true);
        setLoading(false);
      }
    };

    if (studentId) loadData();
  }, [studentId]);

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.admissionNumber.trim()) {
      newErrors.admissionNumber = 'Admission number is required';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      if (dob >= today) {
        newErrors.dateOfBirth = 'Date of birth must be in the past';
      }
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.currentClassId) {
      newErrors.currentClassId = 'Class is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.tenantId) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (PNG or JPG)');
      return;
    }

    // Validate file size (2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      alert(`Photo file size must be less than 2MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      return;
    }

    setUploading(true);
    try {
      // Create a reference to the storage location
      const fileExtension = file.name.split('.').pop();
      const fileName = `students/${user.tenantId}/${studentId}/photo.${fileExtension}`;
      const storageRef = ref(storage, fileName);

      // Upload the file
      await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore with the new photo URL
      await updateDoc(doc(db, 'students', studentId), {
        photoUrl: downloadURL,
        updatedAt: new Date(),
      });

      setPhotoUrl(downloadURL);
      alert('Photo uploaded successfully!');

      // Audit log
      if (user) {
        await logAudit({
          user: {
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
          action: 'update',
          entityType: 'student',
          entityId: studentId,
          entityName: `${formData.firstName} ${formData.lastName}`,
          metadata: { action: 'upload_photo' },
        });
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!user?.tenantId || !photoUrl) return;

    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      // Delete from storage if it's a Firebase Storage URL
      if (photoUrl.includes('firebasestorage.googleapis.com')) {
        const extensions = ['png', 'jpg', 'jpeg'];
        for (const ext of extensions) {
          try {
            const storageRef = ref(storage, `students/${user.tenantId}/${studentId}/photo.${ext}`);
            await deleteObject(storageRef);
          } catch (e) {
            // Ignore errors - file might not exist with this extension
          }
        }
      }

      // Update Firestore to remove photoUrl
      await updateDoc(doc(db, 'students', studentId), {
        photoUrl: null,
        updatedAt: new Date(),
      });

      setPhotoUrl('');
      alert('Photo deleted successfully!');

      // Audit log
      if (user) {
        await logAudit({
          user: {
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
          action: 'update',
          entityType: 'student',
          entityId: studentId,
          entityName: `${formData.firstName} ${formData.lastName}`,
          metadata: { action: 'delete_photo' },
        });
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo. Please try again.');
    }
  };

  const handleAddGuardian = async (parentId: string) => {
    if (!user) return;

    const parent = availableParents.find(p => p.id === parentId);
    if (!parent) return;

    // Check limit of 3 guardians
    if (guardianIds.length >= 3) {
      alert('Maximum of 3 guardians allowed per student.');
      return;
    }

    const confirmed = confirm(
      `Link ${parent.name} (${parent.email}) as a guardian for ${formData.firstName} ${formData.lastName}?`
    );
    if (!confirmed) return;

    setUpdatingGuardians(true);

    try {
      const updatedGuardianIds = [...guardianIds, parentId];

      await updateDoc(doc(db, 'students', studentId), {
        guardianIds: updatedGuardianIds,
        updatedAt: new Date(),
      });

      // Audit log
      await logAudit({
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        action: 'update',
        entityType: 'student',
        entityId: studentId,
        entityName: `${formData.firstName} ${formData.lastName}`,
        metadata: {
          action: 'add_guardian',
          guardianId: parentId,
          guardianName: parent.name,
        },
      });

      // Update local state
      setGuardians([...guardians, parent]);
      setAvailableParents(availableParents.filter(p => p.id !== parentId));
      setGuardianIds(updatedGuardianIds);
      setShowAddGuardian(false);

      alert('Guardian linked successfully!');
    } catch (error: any) {
      console.error('Error adding guardian:', error);
      alert('Failed to link guardian. Please try again.');
    } finally {
      setUpdatingGuardians(false);
    }
  };

  const handleRemoveGuardian = async (parentId: string) => {
    if (!user) return;

    const parent = guardians.find(g => g.id === parentId);
    if (!parent) return;

    const confirmed = confirm(
      `Remove ${parent.name} as a guardian for ${formData.firstName} ${formData.lastName}? They will no longer be able to view this student's results.`
    );
    if (!confirmed) return;

    setUpdatingGuardians(true);

    try {
      const updatedGuardianIds = guardianIds.filter(id => id !== parentId);

      await updateDoc(doc(db, 'students', studentId), {
        guardianIds: updatedGuardianIds,
        updatedAt: new Date(),
      });

      // Audit log
      await logAudit({
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        action: 'update',
        entityType: 'student',
        entityId: studentId,
        entityName: `${formData.firstName} ${formData.lastName}`,
        metadata: {
          action: 'remove_guardian',
          guardianId: parentId,
          guardianName: parent.name,
        },
      });

      // Update local state
      setGuardians(guardians.filter(g => g.id !== parentId));
      setAvailableParents([...availableParents, parent]);
      setGuardianIds(updatedGuardianIds);

      alert('Guardian unlinked successfully!');
    } catch (error: any) {
      console.error('Error removing guardian:', error);
      alert('Failed to unlink guardian. Please try again.');
    } finally {
      setUpdatingGuardians(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        admissionNumber: formData.admissionNumber.trim(),
        dateOfBirth: Timestamp.fromDate(new Date(formData.dateOfBirth)),
        gender: formData.gender,
        currentClassId: formData.currentClassId,
        address: formData.address.trim() || undefined,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'students', studentId), updateData);

      // Audit log: Student updated
      if (user && originalData) {
        await logAudit({
          user: {
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
          action: 'update',
          entityType: 'student',
          entityId: studentId,
          entityName: `${formData.firstName} ${formData.lastName}`,
          before: {
            firstName: originalData.firstName,
            lastName: originalData.lastName,
            admissionNumber: originalData.admissionNumber,
            gender: originalData.gender,
            currentClassId: originalData.currentClassId,
          },
          after: {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            admissionNumber: formData.admissionNumber.trim(),
            gender: formData.gender,
            currentClassId: formData.currentClassId,
          },
          metadata: {
            classChanged: originalData.currentClassId !== formData.currentClassId,
          },
        });
      }

      router.push('/dashboard/students');
    } catch (error: any) {
      console.error('Error updating student:', error);
      setSaveError('Failed to update student. Please try again.');
      setSaving(false);

      // Audit log: Failed to update student
      if (user) {
        await logAudit({
          user: {
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
          action: 'update',
          entityType: 'student',
          entityId: studentId,
          success: false,
          errorMessage: error.message || 'Failed to update student',
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Student Not Found</h3>
            <p className="text-gray-600 mb-4">The student you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push('/dashboard/students')}>Back to Students</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Student</h1>
        <p className="text-gray-600 mt-1">Update student information</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h2>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Photo (Optional)
                </label>
                <div className="flex items-center gap-4">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Student photo"
                      className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-gray-200">
                      <span className="text-3xl">👤</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                        {uploading ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Upload Photo'}
                      </Button>
                      {photoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDeletePhoto}
                          disabled={uploading}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Supported formats: JPG, PNG (max 2MB)
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                </div>

                <div>
                  <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-2">
                    Middle Name
                  </label>
                  <Input
                    id="middleName"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className={errors.dateOfBirth ? 'border-red-500' : ''}
                  />
                  {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | '' })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.gender ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
                </div>
              </div>
            </div>

            {/* Academic Information Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Academic Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="admissionNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Admission Number *
                  </label>
                  <Input
                    id="admissionNumber"
                    value={formData.admissionNumber}
                    onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                    className={errors.admissionNumber ? 'border-red-500' : ''}
                  />
                  {errors.admissionNumber && <p className="mt-1 text-sm text-red-600">{errors.admissionNumber}</p>}
                </div>

                <div>
                  <label htmlFor="currentClassId" className="block text-sm font-medium text-gray-700 mb-2">
                    Current Class *
                  </label>
                  <select
                    id="currentClassId"
                    value={formData.currentClassId}
                    onChange={(e) => setFormData({ ...formData, currentClassId: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.currentClassId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                  {errors.currentClassId && <p className="mt-1 text-sm text-red-600">{errors.currentClassId}</p>}
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact Information</h2>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            {/* Guardian/Parent Linking Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-semibold text-gray-900">Parent/Guardian Accounts</h2>
                {guardianIds.length < 3 && availableParents.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddGuardian(!showAddGuardian)}
                  >
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Link Guardian
                  </Button>
                )}
              </div>

              {/* Current Guardians */}
              {guardians.length > 0 ? (
                <div className="space-y-2">
                  {guardians.map((guardian) => (
                    <div
                      key={guardian.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{guardian.name}</p>
                        <p className="text-sm text-gray-600">{guardian.email}</p>
                        {guardian.phone && (
                          <p className="text-sm text-gray-500">{guardian.phone}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveGuardian(guardian.id)}
                        disabled={updatingGuardians}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ No parent/guardian accounts linked to this student. Parents will not be able to view results.
                  </p>
                </div>
              )}

              {/* Add Guardian Dropdown */}
              {showAddGuardian && availableParents.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-blue-900">
                    Select a parent/guardian account to link:
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableParents.map((parent) => (
                      <button
                        key={parent.id}
                        type="button"
                        onClick={() => handleAddGuardian(parent.id)}
                        disabled={updatingGuardians}
                        className="w-full flex items-center justify-between p-3 bg-white rounded border hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{parent.name}</p>
                          <p className="text-sm text-gray-600">{parent.email}</p>
                        </div>
                        <UserPlusIcon className="h-5 w-5 text-gray-400" />
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddGuardian(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Info about guardian limit */}
              <div className="text-xs text-gray-500">
                <p>• Students can be linked to up to 3 parent/guardian accounts</p>
                <p>• Linked guardians can view student results and attendance</p>
                <p>• You can unlink guardians if they were added by mistake</p>
              </div>
            </div>

            {/* Error Message */}
            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{saveError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/students')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
