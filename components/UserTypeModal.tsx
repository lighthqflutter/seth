'use client';

import { useRouter } from 'next/navigation';
import { XMarkIcon, UserIcon, AcademicCapIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface UserTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserTypeModal({ isOpen, onClose }: UserTypeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleSelection = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Select User Type</h2>
            <p className="text-gray-600 mt-1">
              Choose the type of user account you want to create
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Admin Option */}
            <button
              onClick={() => handleSelection('/dashboard/admin/users/new')}
              className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                <UserIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin</h3>
              <p className="text-sm text-gray-600 text-center">
                System administrators with full access to all features
              </p>
            </button>

            {/* Teacher Option */}
            <button
              onClick={() => handleSelection('/dashboard/teachers/new')}
              className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <AcademicCapIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Teacher</h3>
              <p className="text-sm text-gray-600 text-center">
                Teachers with class and subject assignments
              </p>
            </button>

            {/* Guardian Option */}
            <button
              onClick={() => handleSelection('/dashboard/guardians/new')}
              className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <UserGroupIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Parent/Guardian</h3>
              <p className="text-sm text-gray-600 text-center">
                Parents or guardians linked to students
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
