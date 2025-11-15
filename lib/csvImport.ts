/**
 * CSV Import Utilities for School Portal
 * Handles parsing and validation of CSV files for bulk imports
 */

export interface ClassCSVRow {
  name: string;
  level: string;
  academicYear: string;
  teacherId?: string;
}

export interface SubjectCSVRow {
  name: string;
  code: string;
  maxScore: number;
  description?: string;
}

export interface TermCSVRow {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  academicYear: string;
}

export interface TeacherCSVRow {
  name: string;
  email: string;
  phone?: string;
}

export interface CSVParseResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Parse Classes CSV file
 */
export function parseClassesCSV(csvContent: string): CSVParseResult<ClassCSVRow> {
  const errors: string[] = [];
  const data: ClassCSVRow[] = [];

  // Remove BOM if present
  const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();

  if (!cleanContent) {
    return {
      success: false,
      data: [],
      errors: ['CSV file is empty'],
    };
  }

  const lines = cleanContent.split('\n').map(line => line.trim()).filter(line => line);

  if (lines.length === 0) {
    return {
      success: false,
      data: [],
      errors: ['CSV file is empty'],
    };
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim());
  const requiredHeaders = ['name', 'level', 'academicYear'];
  const optionalHeaders = ['teacherId'];

  // Validate required headers
  for (const required of requiredHeaders) {
    if (!header.includes(required)) {
      errors.push(`Missing required header: ${required}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors };
  }

  // Get header indices
  const headerMap: Record<string, number> = {};
  header.forEach((h, i) => {
    headerMap[h] = i;
  });

  // Parse rows
  const classNames = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',').map(v => v.trim());

    const row: ClassCSVRow = {
      name: values[headerMap['name']] || '',
      level: values[headerMap['level']] || '',
      academicYear: values[headerMap['academicYear']] || '',
      teacherId: values[headerMap['teacherId']] || undefined,
    };

    // Validate row
    const validation = validateClassRow(row, i);
    if (!validation.valid) {
      errors.push(...validation.errors);
      continue;
    }

    // Check for duplicates
    if (classNames.has(row.name)) {
      errors.push(`Duplicate class name found: ${row.name}`);
      continue;
    }

    classNames.add(row.name);
    data.push(row);
  }

  // Check row limit
  if (data.length > 100) {
    return {
      success: false,
      data: [],
      errors: ['Maximum 100 classes allowed per import'],
    };
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : [],
    errors,
  };
}

/**
 * Validate a single class row
 */
export function validateClassRow(row: ClassCSVRow, rowNumber: number): ValidationResult {
  const errors: string[] = [];

  // Validate required fields
  if (!row.name || row.name.trim() === '') {
    errors.push(`Row ${rowNumber}: Missing required field "name"`);
  }

  if (!row.level || row.level.trim() === '') {
    errors.push(`Row ${rowNumber}: Missing required field "level"`);
  }

  if (!row.academicYear || row.academicYear.trim() === '') {
    errors.push(`Row ${rowNumber}: Missing required field "academicYear"`);
  }

  // Validate name length
  if (row.name && row.name.length > 100) {
    errors.push(`Row ${rowNumber}: Class name must be 100 characters or less`);
  }

  // Validate academic year format (YYYY/YYYY)
  if (row.academicYear) {
    const academicYearRegex = /^\d{4}\/\d{4}$/;
    if (!academicYearRegex.test(row.academicYear)) {
      errors.push(`Row ${rowNumber}: Invalid academic year format. Use YYYY/YYYY (e.g., 2024/2025)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate sample CSV template for classes
 */
export function generateClassesCSVTemplate(): string {
  return `name,level,academicYear,teacherId
JSS 1A,JSS1,2024/2025,teacher-id-1
JSS 2B,JSS2,2024/2025,teacher-id-2
SS 3C,SS3,2024/2025,`;
}

/**
 * Convert array of objects to CSV string
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  headers: string[]
): string {
  if (data.length === 0) {
    return headers.join(',');
  }

  const csvRows: string[] = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      // Escape commas and quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parse Subjects CSV file
 */
export function parseSubjectsCSV(csvContent: string): CSVParseResult<SubjectCSVRow> {
  const errors: string[] = [];
  const data: SubjectCSVRow[] = [];

  // Remove BOM if present
  const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();

  if (!cleanContent) {
    return {
      success: false,
      data: [],
      errors: ['CSV file is empty'],
    };
  }

  const lines = cleanContent.split('\n').map(line => line.trim()).filter(line => line);

  if (lines.length === 0) {
    return {
      success: false,
      data: [],
      errors: ['CSV file is empty'],
    };
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim());
  const requiredHeaders = ['name', 'code', 'maxScore'];

  // Validate required headers
  for (const required of requiredHeaders) {
    if (!header.includes(required)) {
      errors.push(`Missing required header: ${required}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors };
  }

  // Get header indices
  const headerMap: Record<string, number> = {};
  header.forEach((h, i) => {
    headerMap[h] = i;
  });

  // Parse rows
  const subjectCodes = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',').map(v => v.trim());

    const maxScoreValue = values[headerMap['maxScore']] || '';
    const maxScore = parseInt(maxScoreValue, 10);

    const row: SubjectCSVRow = {
      name: values[headerMap['name']] || '',
      code: values[headerMap['code']] || '',
      maxScore: isNaN(maxScore) ? -1 : maxScore,
      description: values[headerMap['description']] || undefined,
    };

    // Validate row
    const validation = validateSubjectRow(row, i);
    if (!validation.valid) {
      errors.push(...validation.errors);
      continue;
    }

    // Check for duplicate codes
    if (subjectCodes.has(row.code)) {
      errors.push(`Duplicate subject code found: ${row.code}`);
      continue;
    }

    subjectCodes.add(row.code);
    data.push(row);
  }

  // Check row limit
  if (data.length > 50) {
    return {
      success: false,
      data: [],
      errors: ['Maximum 50 subjects allowed per import'],
    };
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : [],
    errors,
  };
}

/**
 * Validate a single subject row
 */
export function validateSubjectRow(row: SubjectCSVRow, rowNumber: number): ValidationResult {
  const errors: string[] = [];

  // Validate required fields
  if (!row.name || row.name.trim() === '') {
    errors.push(`Row ${rowNumber}: Missing required field "name"`);
  }

  if (!row.code || row.code.trim() === '') {
    errors.push(`Row ${rowNumber}: Missing required field "code"`);
  }

  // Validate name length
  if (row.name && row.name.length > 100) {
    errors.push(`Row ${rowNumber}: Subject name must be 100 characters or less`);
  }

  // Validate code format (uppercase letters and numbers only)
  if (row.code) {
    const codeRegex = /^[A-Z0-9]+$/;
    if (!codeRegex.test(row.code)) {
      errors.push(`Row ${rowNumber}: Code must be uppercase letters and numbers only (e.g., MATH, ENG101)`);
    }
  }

  // Validate maxScore
  if (!row.maxScore || row.maxScore <= 0) {
    errors.push(`Row ${rowNumber}: maxScore must be a positive number`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate sample CSV template for subjects
 */
export function generateSubjectsCSVTemplate(): string {
  return `name,code,maxScore,description
Mathematics,MATH,100,Core subject
English Language,ENG,100,Language and communication
Physics,PHY,100,Science subject`;
}

/**
 * Parse Terms CSV file
 */
export function parseTermsCSV(csvContent: string): CSVParseResult<TermCSVRow> {
  const errors: string[] = [];
  const data: TermCSVRow[] = [];

  // Remove BOM if present
  const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();

  if (!cleanContent) {
    return {
      success: false,
      data: [],
      errors: ['CSV file is empty'],
    };
  }

  const lines = cleanContent.split('\n').map(line => line.trim()).filter(line => line);

  if (lines.length === 0) {
    return {
      success: false,
      data: [],
      errors: ['CSV file is empty'],
    };
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim());
  const requiredHeaders = ['name', 'startDate', 'endDate', 'isCurrent', 'academicYear'];

  // Validate required headers
  for (const required of requiredHeaders) {
    if (!header.includes(required)) {
      errors.push(`Missing required header: ${required}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors };
  }

  // Get header indices
  const headerMap: Record<string, number> = {};
  header.forEach((h, i) => {
    headerMap[h] = i;
  });

  // Parse rows
  const termNames = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',').map(v => v.trim());

    const isCurrentValue = values[headerMap['isCurrent']]?.toLowerCase();
    const isCurrent = isCurrentValue === 'true' || isCurrentValue === '1' || isCurrentValue === 'yes';

    const row: TermCSVRow = {
      name: values[headerMap['name']] || '',
      startDate: values[headerMap['startDate']] || '',
      endDate: values[headerMap['endDate']] || '',
      isCurrent,
      academicYear: values[headerMap['academicYear']] || '',
    };

    // Validate row
    const validation = validateTermRow(row, i);
    if (!validation.valid) {
      errors.push(...validation.errors);
      continue;
    }

    // Check for duplicates
    if (termNames.has(row.name)) {
      errors.push(`Duplicate term name found: ${row.name}`);
      continue;
    }

    termNames.add(row.name);
    data.push(row);
  }

  // Check row limit
  if (data.length > 20) {
    return {
      success: false,
      data: [],
      errors: ['Maximum 20 terms allowed per import'],
    };
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : [],
    errors,
  };
}

/**
 * Validate a single term row
 */
export function validateTermRow(row: TermCSVRow, rowNumber: number): ValidationResult {
  const errors: string[] = [];

  // Validate required fields
  if (!row.name || row.name.trim() === '') {
    errors.push(`Row ${rowNumber}: Missing required field "name"`);
  }

  if (!row.startDate || row.startDate.trim() === '') {
    errors.push(`Row ${rowNumber}: Missing required field "startDate"`);
  }

  if (!row.endDate || row.endDate.trim() === '') {
    errors.push(`Row ${rowNumber}: Missing required field "endDate"`);
  }

  if (!row.academicYear || row.academicYear.trim() === '') {
    errors.push(`Row ${rowNumber}: Missing required field "academicYear"`);
  }

  // Validate name length
  if (row.name && row.name.length > 100) {
    errors.push(`Row ${rowNumber}: Term name must be 100 characters or less`);
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (row.startDate && !dateRegex.test(row.startDate)) {
    errors.push(`Row ${rowNumber}: Invalid date format for startDate. Use YYYY-MM-DD`);
  }

  if (row.endDate && !dateRegex.test(row.endDate)) {
    errors.push(`Row ${rowNumber}: Invalid date format for endDate. Use YYYY-MM-DD`);
  }

  // Validate endDate is after startDate
  if (row.startDate && row.endDate && dateRegex.test(row.startDate) && dateRegex.test(row.endDate)) {
    const start = new Date(row.startDate);
    const end = new Date(row.endDate);
    if (end <= start) {
      errors.push(`Row ${rowNumber}: endDate must be after startDate`);
    }
  }

  // Validate academic year format (YYYY/YYYY)
  if (row.academicYear) {
    const academicYearRegex = /^\d{4}\/\d{4}$/;
    if (!academicYearRegex.test(row.academicYear)) {
      errors.push(`Row ${rowNumber}: Invalid academic year format. Use YYYY/YYYY (e.g., 2024/2025)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate sample CSV template for terms
 */
export function generateTermsCSVTemplate(): string {
  return `name,startDate,endDate,isCurrent,academicYear
First Term 2024/2025,2024-09-01,2024-12-15,true,2024/2025
Second Term 2024/2025,2025-01-06,2025-04-15,false,2024/2025
Third Term 2024/2025,2025-04-20,2025-07-31,false,2024/2025`;
}

/**
 * Parse Teachers CSV file
 */
export function parseTeachersCSV(csvContent: string): CSVParseResult<TeacherCSVRow> {
  const errors: string[] = [];
  const data: TeacherCSVRow[] = [];

  // Remove BOM if present
  const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();

  if (!cleanContent) {
    return {
      success: false,
      data: [],
      errors: ['CSV file is empty'],
    };
  }

  const lines = cleanContent.split('\n').map(line => line.trim()).filter(line => line);

  if (lines.length === 0) {
    return {
      success: false,
      data: [],
      errors: ['CSV file is empty'],
    };
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim());
  const requiredHeaders = ['name', 'email', 'phone'];

  // Validate required headers
  for (const required of requiredHeaders) {
    if (!header.includes(required)) {
      errors.push(`Missing required header: ${required}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors };
  }

  // Get header indices
  const headerMap: Record<string, number> = {};
  header.forEach((h, i) => {
    headerMap[h] = i;
  });

  // Parse rows
  const emails = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',').map(v => v.trim());

    const row: TeacherCSVRow = {
      name: values[headerMap['name']] || '',
      email: values[headerMap['email']] || '',
      phone: values[headerMap['phone']] || undefined,
    };

    // Validate row
    const validation = validateTeacherRow(row, i);
    if (!validation.valid) {
      errors.push(...validation.errors);
      continue;
    }

    // Check for duplicate emails
    if (emails.has(row.email)) {
      errors.push(`Duplicate email found: ${row.email}`);
      continue;
    }

    emails.add(row.email);
    data.push(row);
  }

  // Check row limit
  if (data.length > 100) {
    return {
      success: false,
      data: [],
      errors: ['Maximum 100 teachers allowed per import'],
    };
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : [],
    errors,
  };
}

/**
 * Validate a single teacher row
 */
export function validateTeacherRow(row: TeacherCSVRow, rowNumber: number): ValidationResult {
  const errors: string[] = [];

  // Validate required fields
  if (!row.name || row.name.trim() === '') {
    errors.push(`Row ${rowNumber}: Missing required field "name"`);
  }

  if (!row.email || row.email.trim() === '') {
    errors.push(`Row ${rowNumber}: Missing required field "email"`);
  }

  // Validate name length
  if (row.name && row.name.length > 100) {
    errors.push(`Row ${rowNumber}: Teacher name must be 100 characters or less`);
  }

  // Validate email format
  if (row.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      errors.push(`Row ${rowNumber}: Invalid email format`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate sample CSV template for teachers
 */
export function generateTeachersCSVTemplate(): string {
  return `name,email,phone
John Doe,john.doe@school.com,1234567890
Jane Smith,jane.smith@school.com,0987654321
Bob Johnson,bob.johnson@school.com,`;
}
