'use client';

/**
 * Fee Structure Configuration Page
 * Phase 23: Fee Management System
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { FeeStructureItem, FeeType } from '@/types/fees';
import { getFeeTypeName, formatCurrency } from '@/lib/feeHelpers';

export default function FeeStructurePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feeItems, setFeeItems] = useState<FeeStructureItem[]>([]);
  const [classes, setClasses] = useState<Map<string, string>>(new Map());
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [customFeeTypes, setCustomFeeTypes] = useState<string[]>([]);
  const [showAddFeeType, setShowAddFeeType] = useState(false);
  const [newFeeTypeName, setNewFeeTypeName] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    feeType: 'tuition' as FeeType,
    customName: '',
    description: '',
    amount: '',
    isMandatory: true,
    classId: '',
    dueDate: '',
    latePenaltyPercentage: '',
    earlyDiscountPercentage: '',
    earlyDiscountDeadline: '',
  });

  useEffect(() => {
    if (!user?.tenantId) return;
    loadData();
  }, [user, selectedTerm]);

  const loadData = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);

      // Load custom fee types from tenant config
      const tenantDoc = await getDoc(doc(db, 'tenants', user.tenantId));
      if (tenantDoc.exists()) {
        const tenantData = tenantDoc.data();
        setCustomFeeTypes(tenantData.customFeeTypes || []);
      }

      // Load terms
      const termsQuery = query(
        collection(db, 'terms'),
        where('tenantId', '==', user.tenantId),
        where('isActive', '==', true)
      );
      const termsSnapshot = await getDocs(termsQuery);
      const termsData = termsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setTerms(termsData);

      if (termsData.length > 0 && !selectedTerm) {
        setSelectedTerm(termsData[0].id);
        return; // Will reload with selectedTerm
      }

      // Load classes
      const classesQuery = query(
        collection(db, 'classes'),
        where('tenantId', '==', user.tenantId),
        where('isActive', '==', true)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const classesMap = new Map<string, string>();
      classesSnapshot.docs.forEach((doc) => {
        classesMap.set(doc.id, doc.data().name);
      });
      setClasses(classesMap);

      // Load fee structure items for selected term
      if (selectedTerm) {
        const feesQuery = query(
          collection(db, 'feeStructureItems'),
          where('tenantId', '==', user.tenantId),
          where('termId', '==', selectedTerm),
          where('isActive', '==', true)
        );
        const feesSnapshot = await getDocs(feesQuery);
        const feesData = feesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as FeeStructureItem[];
        setFeeItems(feesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      feeType: 'tuition',
      customName: '',
      description: '',
      amount: '',
      isMandatory: true,
      classId: '',
      dueDate: '',
      latePenaltyPercentage: '',
      earlyDiscountPercentage: '',
      earlyDiscountDeadline: '',
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleEdit = (item: FeeStructureItem) => {
    setFormData({
      feeType: item.feeType,
      customName: item.customName || '',
      description: item.description,
      amount: item.amount.toString(),
      isMandatory: item.isMandatory,
      classId: item.classId || '',
      dueDate: item.dueDate instanceof Date
        ? item.dueDate.toISOString().split('T')[0]
        : item.dueDate.toDate().toISOString().split('T')[0],
      latePenaltyPercentage: item.latePenaltyPercentage?.toString() || '',
      earlyDiscountPercentage: item.earlyDiscountPercentage?.toString() || '',
      earlyDiscountDeadline: item.earlyDiscountDeadline
        ? item.earlyDiscountDeadline instanceof Date
          ? item.earlyDiscountDeadline.toISOString().split('T')[0]
          : item.earlyDiscountDeadline.toDate().toISOString().split('T')[0]
        : '',
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!user?.tenantId || !selectedTerm) return;

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!formData.dueDate) {
      alert('Please select a due date');
      return;
    }

    try {
      setSaving(true);

      const feeData: any = {
        tenantId: user.tenantId,
        feeType: formData.feeType,
        description: formData.description,
        amount,
        isMandatory: formData.isMandatory,
        termId: selectedTerm,
        dueDate: Timestamp.fromDate(new Date(formData.dueDate)),
        isActive: true,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      // Only add optional fields if they have values
      if (formData.feeType === 'other' && formData.customName) {
        feeData.customName = formData.customName;
      }

      if (formData.classId) {
        feeData.classId = formData.classId;
      }

      if (formData.latePenaltyPercentage) {
        feeData.latePenaltyPercentage = parseFloat(formData.latePenaltyPercentage);
      }

      if (formData.earlyDiscountPercentage) {
        feeData.earlyDiscountPercentage = parseFloat(formData.earlyDiscountPercentage);
      }

      if (formData.earlyDiscountDeadline) {
        feeData.earlyDiscountDeadline = Timestamp.fromDate(new Date(formData.earlyDiscountDeadline));
      }

      if (editingId) {
        // Update existing
        await updateDoc(doc(db, 'feeStructureItems', editingId), feeData);
      } else {
        // Create new
        await addDoc(collection(db, 'feeStructureItems'), {
          ...feeData,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving fee item:', error);
      alert('Failed to save fee item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this fee item?')) return;

    try {
      await updateDoc(doc(db, 'feeStructureItems', id), {
        isActive: false,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      loadData();
    } catch (error) {
      console.error('Error deleting fee item:', error);
      alert('Failed to delete fee item');
    }
  };

  const handleAddCustomFeeType = async () => {
    if (!user?.tenantId || !newFeeTypeName.trim()) {
      alert('Please enter a fee type name');
      return;
    }

    const feeTypeName = newFeeTypeName.trim().toLowerCase().replace(/\s+/g, '_');

    // Check if it already exists
    if (customFeeTypes.includes(feeTypeName) || baseFeeTypeOptions.includes(feeTypeName as FeeType)) {
      alert('This fee type already exists');
      return;
    }

    try {
      const updatedCustomTypes = [...customFeeTypes, feeTypeName];

      await setDoc(
        doc(db, 'tenants', user.tenantId),
        { customFeeTypes: updatedCustomTypes },
        { merge: true }
      );

      setCustomFeeTypes(updatedCustomTypes);
      setNewFeeTypeName('');
      setShowAddFeeType(false);
      alert('Custom fee type added successfully!');
    } catch (error) {
      console.error('Error adding custom fee type:', error);
      alert('Failed to add custom fee type');
    }
  };

  const baseFeeTypeOptions: FeeType[] = [
    'tuition',
    'registration',
    'books',
    'uniform',
    'transport',
    'lunch',
    'sports',
    'examination',
    'lab',
    'library',
    'hostel',
    'development',
    'pta',
    'excursion',
    'technology',
    'other',
  ];

  const allFeeTypeOptions = [...baseFeeTypeOptions, ...customFeeTypes] as FeeType[];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fee Structure</h1>
          <p className="text-gray-600 mt-1">Configure fees for each term and class</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/dashboard/fees')}>
            Back to Dashboard
          </Button>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Fee Item
            </Button>
          )}
        </div>
      </div>

      {/* Term Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="font-medium text-gray-900">Select Term:</label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="mb-6 border-2 border-blue-500">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Fee Item' : 'Add New Fee Item'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fee Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fee Type *
                </label>
                <div className="flex gap-2">
                  <Select
                    value={formData.feeType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, feeType: value as FeeType })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allFeeTypeOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {getFeeTypeName(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddFeeType(!showAddFeeType)}
                    title="Add new fee type"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>

                {/* Add Custom Fee Type */}
                {showAddFeeType && (
                  <div className="mt-2 p-3 border border-blue-200 rounded-lg bg-blue-50">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      New Fee Type Name
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={newFeeTypeName}
                        onChange={(e) => setNewFeeTypeName(e.target.value)}
                        placeholder="e.g., Vocational Studies"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddCustomFeeType}
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAddFeeType(false);
                          setNewFeeTypeName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Name (for 'other' type) */}
              {formData.feeType === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Fee Name *
                  </label>
                  <Input
                    value={formData.customName}
                    onChange={(e) =>
                      setFormData({ ...formData, customName: e.target.value })
                    }
                    placeholder="e.g., Computer Lab Fee"
                  />
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₦) *
                </label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Class (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class (Leave empty for all classes)
                </label>
                <Select
                  value={formData.classId || 'all'}
                  onValueChange={(value) => setFormData({ ...formData, classId: value === 'all' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {Array.from(classes.entries()).map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              {/* Mandatory */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="mandatory"
                  checked={formData.isMandatory}
                  onChange={(e) =>
                    setFormData({ ...formData, isMandatory: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="mandatory" className="text-sm font-medium text-gray-700">
                  Mandatory Fee
                </label>
              </div>

              {/* Late Penalty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Late Penalty (%)
                </label>
                <Input
                  type="number"
                  value={formData.latePenaltyPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, latePenaltyPercentage: e.target.value })
                  }
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              {/* Early Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Early Discount (%)
                </label>
                <Input
                  type="number"
                  value={formData.earlyDiscountPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, earlyDiscountPercentage: e.target.value })
                  }
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              {/* Early Discount Deadline */}
              {formData.earlyDiscountPercentage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Early Discount Deadline
                  </label>
                  <Input
                    type="date"
                    value={formData.earlyDiscountDeadline}
                    onChange={(e) =>
                      setFormData({ ...formData, earlyDiscountDeadline: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Additional details about this fee..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} disabled={saving}>
                <CheckIcon className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fee Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Fees</CardTitle>
        </CardHeader>
        <CardContent>
          {feeItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No fee items configured for this term yet.</p>
              <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Fee Item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fee Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Class
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {feeItems.map((item) => {
                    const dueDate =
                      item.dueDate instanceof Date
                        ? item.dueDate
                        : item.dueDate.toDate();

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900">
                            {item.customName || getFeeTypeName(item.feeType)}
                          </p>
                          {item.description && (
                            <p className="text-sm text-gray-600">{item.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {item.classId ? classes.get(item.classId) || 'Unknown' : 'All Classes'}
                        </td>
                        <td className="px-4 py-4 font-medium text-gray-900">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {dueDate.toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              item.isMandatory
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.isMandatory ? 'Mandatory' : 'Optional'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
