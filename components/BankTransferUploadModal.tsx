'use client';

import { useState } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface BankTransferUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  fee: {
    id: string;
    feeName: string;
    studentName: string;
    amountOutstanding: number;
  };
  userId: string;
  tenantId: string;
  bankAccountInfo?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    instructions?: string;
  };
  onUploadSuccess?: () => void;
}

export default function BankTransferUploadModal({
  isOpen,
  onClose,
  fee,
  userId,
  tenantId,
  bankAccountInfo,
  onUploadSuccess,
}: BankTransferUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image (JPG, PNG) or PDF file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Upload file to Firebase Storage
      const timestamp = Date.now();
      const fileName = `bank-transfers/${tenantId}/${fee.id}/${timestamp}_${selectedFile.name}`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, selectedFile);
      const fileUrl = await getDownloadURL(storageRef);

      // Create bank transfer record
      const response = await fetch('/api/payments/bank-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentFeeId: fee.id,
          userId,
          tenantId,
          amount: fee.amountOutstanding, // Use full outstanding amount
          proofUrl: fileUrl,
          fileName: selectedFile.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit bank transfer');
      }

      // Success
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Reset form
      setSelectedFile(null);
      setPreviewUrl('');

      onClose();
    } catch (err: any) {
      console.error('Bank transfer upload error:', err);
      setError(err.message || 'Failed to upload bank transfer proof');
      setUploading(false);
    }
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
            disabled={uploading}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Upload Bank Transfer Proof</h2>
            <p className="text-gray-600 mt-1">
              Upload proof of your bank transfer payment for verification
            </p>
          </div>

          {/* Fee Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fee:</span>
                <span className="text-sm font-medium text-gray-900">{fee.feeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Student:</span>
                <span className="text-sm font-medium text-gray-900">{fee.studentName}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-base font-semibold text-gray-900">Outstanding Amount:</span>
                <span className="text-xl font-bold text-blue-600">
                  {formatCurrency(fee.amountOutstanding)}
                </span>
              </div>
            </div>
          </div>

          {/* Bank Account Details */}
          {bankAccountInfo && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">
                Bank Account Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">Bank Name:</span>
                  <span className="text-sm font-semibold text-blue-900">
                    {bankAccountInfo.bankName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">Account Name:</span>
                  <span className="text-sm font-semibold text-blue-900">
                    {bankAccountInfo.accountName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">Account Number:</span>
                  <span className="text-base font-bold text-blue-900">
                    {bankAccountInfo.accountNumber}
                  </span>
                </div>
                {bankAccountInfo.instructions && (
                  <div className="pt-2 border-t border-blue-200">
                    <p className="text-xs text-blue-700">
                      <strong>Instructions:</strong> {bankAccountInfo.instructions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Proof <span className="text-red-500">*</span>
              </label>
              <div className="mt-2">
                <label
                  htmlFor="file-upload"
                  className="flex justify-center px-6 py-8 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-blue-400 transition-colors"
                >
                  {selectedFile ? (
                    <div className="text-center">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="mx-auto h-32 w-auto mb-2 rounded"
                        />
                      ) : (
                        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                      )}
                      <p className="text-sm text-gray-600">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, PDF up to 5MB
                      </p>
                    </div>
                  )}
                  <input
                    id="file-upload"
                    type="file"
                    className="sr-only"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={uploading || !selectedFile}
                className="flex-1"
              >
                {uploading ? 'Uploading...' : 'Submit for Verification'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={uploading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>

          {/* Info Note */}
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> Your payment will be verified by the finance team within 24-48 hours.
              You will receive a notification once your payment is approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
