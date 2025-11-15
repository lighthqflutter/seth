import {
  parseClassesCSV,
  validateClassRow,
  ClassCSVRow,
  parseSubjectsCSV,
  validateSubjectRow,
  SubjectCSVRow,
  parseTermsCSV,
  validateTermRow,
  TermCSVRow,
  parseTeachersCSV,
  validateTeacherRow,
  TeacherCSVRow
} from '@/lib/csvImport'

describe('CSV Import - Classes', () => {
  describe('parseClassesCSV', () => {
    it('should parse valid CSV with correct headers', () => {
      const csvContent = `name,level,academicYear,teacherId
JSS 1A,JSS1,2024/2025,teacher-1
JSS 2B,JSS2,2024/2025,teacher-2
SS 3C,SS3,2024/2025,`

      const result = parseClassesCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(result.data[0]).toEqual({
        name: 'JSS 1A',
        level: 'JSS1',
        academicYear: '2024/2025',
        teacherId: 'teacher-1',
      })
    })

    it('should handle CSV with extra whitespace', () => {
      const csvContent = `name,level,academicYear,teacherId
  JSS 1A  ,  JSS1  ,  2024/2025  ,  teacher-1  `

      const result = parseClassesCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data[0].name).toBe('JSS 1A')
      expect(result.data[0].level).toBe('JSS1')
    })

    it('should handle optional teacherId field', () => {
      const csvContent = `name,level,academicYear,teacherId
JSS 1A,JSS1,2024/2025,
JSS 2B,JSS2,2024/2025,teacher-2`

      const result = parseClassesCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data[0].teacherId).toBeUndefined()
      expect(result.data[1].teacherId).toBe('teacher-2')
    })

    it('should reject CSV with missing required headers', () => {
      const csvContent = `name,level
JSS 1A,JSS1`

      const result = parseClassesCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Missing required header: academicYear')
    })

    it('should reject CSV with missing required fields', () => {
      const csvContent = `name,level,academicYear,teacherId
,JSS1,2024/2025,teacher-1
JSS 2B,,2024/2025,teacher-2`

      const result = parseClassesCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Row 1: Missing required field "name"')
      expect(result.errors).toContain('Row 2: Missing required field "level"')
    })

    it('should reject empty CSV', () => {
      const csvContent = ''

      const result = parseClassesCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('CSV file is empty')
    })

    it('should handle CSV with BOM (Byte Order Mark)', () => {
      const csvContent = '\uFEFFname,level,academicYear,teacherId\nJSS 1A,JSS1,2024/2025,teacher-1'

      const result = parseClassesCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data[0].name).toBe('JSS 1A')
    })

    it('should validate academic year format', () => {
      const csvContent = `name,level,academicYear,teacherId
JSS 1A,JSS1,2024-2025,teacher-1
JSS 2B,JSS2,invalid,teacher-2`

      const result = parseClassesCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Row 1: Invalid academic year format. Use YYYY/YYYY (e.g., 2024/2025)')
      expect(result.errors).toContain('Row 2: Invalid academic year format. Use YYYY/YYYY (e.g., 2024/2025)')
    })

    it('should limit import to 100 classes at once', () => {
      let csvContent = 'name,level,academicYear,teacherId\n'
      for (let i = 1; i <= 101; i++) {
        csvContent += `Class ${i},JSS1,2024/2025,teacher-${i}\n`
      }

      const result = parseClassesCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Maximum 100 classes allowed per import')
    })

    it('should detect duplicate class names in CSV', () => {
      const csvContent = `name,level,academicYear,teacherId
JSS 1A,JSS1,2024/2025,teacher-1
JSS 1A,JSS1,2024/2025,teacher-2`

      const result = parseClassesCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Duplicate class name found: JSS 1A')
    })
  })

  describe('validateClassRow', () => {
    it('should validate a correct class row', () => {
      const row: ClassCSVRow = {
        name: 'JSS 1A',
        level: 'JSS1',
        academicYear: '2024/2025',
        teacherId: 'teacher-1',
      }

      const result = validateClassRow(row, 1)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject row with missing name', () => {
      const row: ClassCSVRow = {
        name: '',
        level: 'JSS1',
        academicYear: '2024/2025',
      }

      const result = validateClassRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Missing required field "name"')
    })

    it('should reject row with invalid academic year', () => {
      const row: ClassCSVRow = {
        name: 'JSS 1A',
        level: 'JSS1',
        academicYear: 'invalid',
      }

      const result = validateClassRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Invalid academic year format. Use YYYY/YYYY (e.g., 2024/2025)')
    })

    it('should accept row with empty teacherId', () => {
      const row: ClassCSVRow = {
        name: 'JSS 1A',
        level: 'JSS1',
        academicYear: '2024/2025',
        teacherId: '',
      }

      const result = validateClassRow(row, 1)

      expect(result.valid).toBe(true)
    })

    it('should validate name length', () => {
      const row: ClassCSVRow = {
        name: 'A'.repeat(101), // Too long
        level: 'JSS1',
        academicYear: '2024/2025',
      }

      const result = validateClassRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Class name must be 100 characters or less')
    })

    it('should validate level format', () => {
      const row: ClassCSVRow = {
        name: 'Primary 1',
        level: 'P1',
        academicYear: '2024/2025',
      }

      const result = validateClassRow(row, 1)

      expect(result.valid).toBe(true)
    })
  })
})

describe('CSV Import - Subjects', () => {
  describe('parseSubjectsCSV', () => {
    it('should parse valid CSV with correct headers', () => {
      const csvContent = `name,code,maxScore,description
Mathematics,MATH,100,Core subject
English Language,ENG,100,Language subject
Physics,PHY,100,`

      const result = parseSubjectsCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(result.data[0]).toEqual({
        name: 'Mathematics',
        code: 'MATH',
        maxScore: 100,
        description: 'Core subject',
      })
    })

    it('should handle CSV with extra whitespace', () => {
      const csvContent = `name,code,maxScore,description
  Mathematics  ,  MATH  ,  100  ,  Core subject  `

      const result = parseSubjectsCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data[0].name).toBe('Mathematics')
      expect(result.data[0].code).toBe('MATH')
    })

    it('should handle optional description field', () => {
      const csvContent = `name,code,maxScore,description
Mathematics,MATH,100,
English,ENG,100,Language subject`

      const result = parseSubjectsCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data[0].description).toBeUndefined()
      expect(result.data[1].description).toBe('Language subject')
    })

    it('should reject CSV with missing required headers', () => {
      const csvContent = `name,code
Mathematics,MATH`

      const result = parseSubjectsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Missing required header: maxScore')
    })

    it('should reject CSV with missing required fields', () => {
      const csvContent = `name,code,maxScore,description
,MATH,100,Core
Mathematics,,100,Core`

      const result = parseSubjectsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Row 1: Missing required field "name"')
      expect(result.errors).toContain('Row 2: Missing required field "code"')
    })

    it('should reject empty CSV', () => {
      const csvContent = ''

      const result = parseSubjectsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('CSV file is empty')
    })

    it('should validate maxScore is a number', () => {
      const csvContent = `name,code,maxScore,description
Mathematics,MATH,invalid,Core
English,ENG,-10,Core`

      const result = parseSubjectsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Row 1: maxScore must be a positive number')
      expect(result.errors).toContain('Row 2: maxScore must be a positive number')
    })

    it('should detect duplicate subject codes in CSV', () => {
      const csvContent = `name,code,maxScore,description
Mathematics,MATH,100,Core
Math Advanced,MATH,100,Core`

      const result = parseSubjectsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Duplicate subject code found: MATH')
    })

    it('should limit import to 50 subjects at once', () => {
      let csvContent = 'name,code,maxScore,description\n'
      for (let i = 1; i <= 51; i++) {
        csvContent += `Subject ${i},SUB${i},100,Test\n`
      }

      const result = parseSubjectsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Maximum 50 subjects allowed per import')
    })
  })

  describe('validateSubjectRow', () => {
    it('should validate a correct subject row', () => {
      const row: SubjectCSVRow = {
        name: 'Mathematics',
        code: 'MATH',
        maxScore: 100,
        description: 'Core subject',
      }

      const result = validateSubjectRow(row, 1)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject row with missing name', () => {
      const row: SubjectCSVRow = {
        name: '',
        code: 'MATH',
        maxScore: 100,
      }

      const result = validateSubjectRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Missing required field "name"')
    })

    it('should reject row with invalid maxScore', () => {
      const row: SubjectCSVRow = {
        name: 'Mathematics',
        code: 'MATH',
        maxScore: -10,
      }

      const result = validateSubjectRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: maxScore must be a positive number')
    })

    it('should accept row with empty description', () => {
      const row: SubjectCSVRow = {
        name: 'Mathematics',
        code: 'MATH',
        maxScore: 100,
        description: '',
      }

      const result = validateSubjectRow(row, 1)

      expect(result.valid).toBe(true)
    })

    it('should validate code format (uppercase alphanumeric)', () => {
      const row: SubjectCSVRow = {
        name: 'Mathematics',
        code: 'math-123',
        maxScore: 100,
      }

      const result = validateSubjectRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Code must be uppercase letters and numbers only (e.g., MATH, ENG101)')
    })

    it('should validate name length', () => {
      const row: SubjectCSVRow = {
        name: 'A'.repeat(101),
        code: 'MATH',
        maxScore: 100,
      }

      const result = validateSubjectRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Subject name must be 100 characters or less')
    })
  })
})

describe('CSV Import - Terms', () => {
  describe('parseTermsCSV', () => {
    it('should parse valid CSV with correct headers', () => {
      const csvContent = `name,startDate,endDate,isCurrent,academicYear
First Term 2024/2025,2024-09-01,2024-12-15,true,2024/2025
Second Term 2024/2025,2025-01-06,2025-04-15,false,2024/2025
Third Term 2024/2025,2025-04-20,2025-07-31,false,2024/2025`

      const result = parseTermsCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(result.data[0]).toEqual({
        name: 'First Term 2024/2025',
        startDate: '2024-09-01',
        endDate: '2024-12-15',
        isCurrent: true,
        academicYear: '2024/2025',
      })
    })

    it('should handle CSV with extra whitespace', () => {
      const csvContent = `name,startDate,endDate,isCurrent,academicYear
  First Term  ,  2024-09-01  ,  2024-12-15  ,  true  ,  2024/2025  `

      const result = parseTermsCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data[0].name).toBe('First Term')
      expect(result.data[0].startDate).toBe('2024-09-01')
    })

    it('should parse boolean isCurrent field', () => {
      const csvContent = `name,startDate,endDate,isCurrent,academicYear
First Term,2024-09-01,2024-12-15,true,2024/2025
Second Term,2025-01-06,2025-04-15,false,2024/2025`

      const result = parseTermsCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data[0].isCurrent).toBe(true)
      expect(result.data[1].isCurrent).toBe(false)
    })

    it('should reject CSV with missing required headers', () => {
      const csvContent = `name,startDate,endDate
First Term,2024-09-01,2024-12-15`

      const result = parseTermsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Missing required header: isCurrent')
      expect(result.errors).toContain('Missing required header: academicYear')
    })

    it('should reject CSV with missing required fields', () => {
      const csvContent = `name,startDate,endDate,isCurrent,academicYear
,2024-09-01,2024-12-15,true,2024/2025
First Term,,2024-12-15,true,2024/2025`

      const result = parseTermsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Row 1: Missing required field "name"')
      expect(result.errors).toContain('Row 2: Missing required field "startDate"')
    })

    it('should reject empty CSV', () => {
      const csvContent = ''

      const result = parseTermsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('CSV file is empty')
    })

    it('should validate date format (YYYY-MM-DD)', () => {
      const csvContent = `name,startDate,endDate,isCurrent,academicYear
First Term,2024/09/01,2024-12-15,true,2024/2025
Second Term,2025-01-06,invalid-date,false,2024/2025`

      const result = parseTermsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Row 1: Invalid date format for startDate. Use YYYY-MM-DD')
      expect(result.errors).toContain('Row 2: Invalid date format for endDate. Use YYYY-MM-DD')
    })

    it('should validate endDate is after startDate', () => {
      const csvContent = `name,startDate,endDate,isCurrent,academicYear
First Term,2024-12-15,2024-09-01,true,2024/2025`

      const result = parseTermsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Row 1: endDate must be after startDate')
    })

    it('should detect duplicate term names in CSV', () => {
      const csvContent = `name,startDate,endDate,isCurrent,academicYear
First Term,2024-09-01,2024-12-15,true,2024/2025
First Term,2025-01-06,2025-04-15,false,2024/2025`

      const result = parseTermsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Duplicate term name found: First Term')
    })

    it('should limit import to 20 terms at once', () => {
      let csvContent = 'name,startDate,endDate,isCurrent,academicYear\n'
      for (let i = 1; i <= 21; i++) {
        csvContent += `Term ${i},2024-09-01,2024-12-15,false,2024/2025\n`
      }

      const result = parseTermsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Maximum 20 terms allowed per import')
    })

    it('should validate academic year format', () => {
      const csvContent = `name,startDate,endDate,isCurrent,academicYear
First Term,2024-09-01,2024-12-15,true,2024-2025`

      const result = parseTermsCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Row 1: Invalid academic year format. Use YYYY/YYYY (e.g., 2024/2025)')
    })
  })

  describe('validateTermRow', () => {
    it('should validate a correct term row', () => {
      const row: TermCSVRow = {
        name: 'First Term 2024/2025',
        startDate: '2024-09-01',
        endDate: '2024-12-15',
        isCurrent: true,
        academicYear: '2024/2025',
      }

      const result = validateTermRow(row, 1)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject row with missing name', () => {
      const row: TermCSVRow = {
        name: '',
        startDate: '2024-09-01',
        endDate: '2024-12-15',
        isCurrent: true,
        academicYear: '2024/2025',
      }

      const result = validateTermRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Missing required field "name"')
    })

    it('should reject row with invalid date format', () => {
      const row: TermCSVRow = {
        name: 'First Term',
        startDate: 'invalid',
        endDate: '2024-12-15',
        isCurrent: true,
        academicYear: '2024/2025',
      }

      const result = validateTermRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Invalid date format for startDate. Use YYYY-MM-DD')
    })

    it('should reject row with endDate before startDate', () => {
      const row: TermCSVRow = {
        name: 'First Term',
        startDate: '2024-12-15',
        endDate: '2024-09-01',
        isCurrent: true,
        academicYear: '2024/2025',
      }

      const result = validateTermRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: endDate must be after startDate')
    })

    it('should validate name length', () => {
      const row: TermCSVRow = {
        name: 'A'.repeat(101),
        startDate: '2024-09-01',
        endDate: '2024-12-15',
        isCurrent: true,
        academicYear: '2024/2025',
      }

      const result = validateTermRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Term name must be 100 characters or less')
    })

    it('should validate academic year format', () => {
      const row: TermCSVRow = {
        name: 'First Term',
        startDate: '2024-09-01',
        endDate: '2024-12-15',
        isCurrent: true,
        academicYear: 'invalid',
      }

      const result = validateTermRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Invalid academic year format. Use YYYY/YYYY (e.g., 2024/2025)')
    })
  })
})

describe('CSV Import - Teachers', () => {
  describe('parseTeachersCSV', () => {
    it('should parse valid CSV with correct headers', () => {
      const csvContent = `name,email,phone
John Doe,john@school.com,1234567890
Jane Smith,jane@school.com,0987654321
Bob Johnson,bob@school.com,`

      const result = parseTeachersCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(result.data[0]).toEqual({
        name: 'John Doe',
        email: 'john@school.com',
        phone: '1234567890',
      })
    })

    it('should handle CSV with extra whitespace', () => {
      const csvContent = `name,email,phone
  John Doe  ,  john@school.com  ,  1234567890  `

      const result = parseTeachersCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data[0].name).toBe('John Doe')
      expect(result.data[0].email).toBe('john@school.com')
    })

    it('should handle optional phone field', () => {
      const csvContent = `name,email,phone
John Doe,john@school.com,
Jane Smith,jane@school.com,0987654321`

      const result = parseTeachersCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.data[0].phone).toBeUndefined()
      expect(result.data[1].phone).toBe('0987654321')
    })

    it('should reject CSV with missing required headers', () => {
      const csvContent = `name,email
John Doe,john@school.com`

      const result = parseTeachersCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Missing required header: phone')
    })

    it('should reject CSV with missing required fields', () => {
      const csvContent = `name,email,phone
,john@school.com,1234567890
John Doe,,1234567890`

      const result = parseTeachersCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Row 1: Missing required field "name"')
      expect(result.errors).toContain('Row 2: Missing required field "email"')
    })

    it('should reject empty CSV', () => {
      const csvContent = ''

      const result = parseTeachersCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('CSV file is empty')
    })

    it('should validate email format', () => {
      const csvContent = `name,email,phone
John Doe,invalid-email,1234567890
Jane Smith,jane@school,1234567890`

      const result = parseTeachersCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Row 1: Invalid email format')
      expect(result.errors).toContain('Row 2: Invalid email format')
    })

    it('should detect duplicate emails in CSV', () => {
      const csvContent = `name,email,phone
John Doe,john@school.com,1234567890
Jane Smith,john@school.com,0987654321`

      const result = parseTeachersCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Duplicate email found: john@school.com')
    })

    it('should limit import to 100 teachers at once', () => {
      let csvContent = 'name,email,phone\n'
      for (let i = 1; i <= 101; i++) {
        csvContent += `Teacher ${i},teacher${i}@school.com,123456789${i}\n`
      }

      const result = parseTeachersCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Maximum 100 teachers allowed per import')
    })
  })

  describe('validateTeacherRow', () => {
    it('should validate a correct teacher row', () => {
      const row: TeacherCSVRow = {
        name: 'John Doe',
        email: 'john@school.com',
        phone: '1234567890',
      }

      const result = validateTeacherRow(row, 1)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject row with missing name', () => {
      const row: TeacherCSVRow = {
        name: '',
        email: 'john@school.com',
        phone: '1234567890',
      }

      const result = validateTeacherRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Missing required field "name"')
    })

    it('should reject row with missing email', () => {
      const row: TeacherCSVRow = {
        name: 'John Doe',
        email: '',
        phone: '1234567890',
      }

      const result = validateTeacherRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Missing required field "email"')
    })

    it('should reject row with invalid email', () => {
      const row: TeacherCSVRow = {
        name: 'John Doe',
        email: 'invalid-email',
        phone: '1234567890',
      }

      const result = validateTeacherRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Invalid email format')
    })

    it('should accept row with empty phone', () => {
      const row: TeacherCSVRow = {
        name: 'John Doe',
        email: 'john@school.com',
        phone: '',
      }

      const result = validateTeacherRow(row, 1)

      expect(result.valid).toBe(true)
    })

    it('should validate name length', () => {
      const row: TeacherCSVRow = {
        name: 'A'.repeat(101),
        email: 'john@school.com',
        phone: '1234567890',
      }

      const result = validateTeacherRow(row, 1)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Row 1: Teacher name must be 100 characters or less')
    })
  })
})
