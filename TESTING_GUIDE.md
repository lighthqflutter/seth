# Testing Guide - School Portal

## 🚀 Development Servers Status

### ✅ Frontend Server (Next.js)
**Status:** Running
**URL:** http://localhost:3000
**Network URL:** http://192.168.8.168:3000

### 📋 Testing Checklist

## Phase 23: Fee Management Testing

### 1. Main Fee Dashboard
**URL:** `/dashboard/fees`

**Test Cases:**
- [ ] View financial overview cards
- [ ] Check student payment status breakdown
- [ ] View recent payments (last 10)
- [ ] View top 5 defaulters
- [ ] Click quick action buttons
- [ ] Verify all metrics calculate correctly

### 2. Fee Structure Configuration
**URL:** `/dashboard/fees/structure`

**Test Cases:**
- [ ] Select different terms
- [ ] Create new fee item (Tuition ₦50,000)
- [ ] Create fee with late penalty (5%)
- [ ] Create fee with early discount (10%)
- [ ] Create class-specific fee
- [ ] Create school-wide fee (All Classes)
- [ ] Edit existing fee item
- [ ] Delete fee item (soft delete)
- [ ] Verify all 16 fee types available
- [ ] Test "Other" fee type with custom name

### 3. Fee Assignment
**URL:** `/dashboard/fees/assign`

**Test Cases:**
- [ ] Select term
- [ ] Select "All Classes"
- [ ] Select a fee item
- [ ] View assignment summary
- [ ] Assign fees to students
- [ ] Verify duplicate prevention (try assigning twice)
- [ ] Test with single class selection
- [ ] Verify batch processing (500+ students)

### 4. Payment Recording
**URL:** `/dashboard/fees/record-payment`

**Test Cases:**
- [ ] Search for student by name
- [ ] Search for student by admission number
- [ ] Select student with pending fees
- [ ] View fee details (total, paid, outstanding)
- [ ] Record cash payment
- [ ] Record bank transfer (with bank details)
- [ ] Record cheque payment (with cheque details)
- [ ] Record POS payment
- [ ] Test payment validation (amount > outstanding)
- [ ] Test payment validation (amount = 0)
- [ ] Complete payment and verify receipt generation
- [ ] Verify receipt number increments (RCP000001, RCP000002, etc.)

### 5. Receipt Viewing
**URL:** `/dashboard/fees/receipts/[id]`

**Test Cases:**
- [ ] View receipt summary card
- [ ] View PDF preview in embedded viewer
- [ ] Download receipt PDF
- [ ] Verify receipt content:
  - [ ] School information
  - [ ] Student information
  - [ ] Payment details
  - [ ] Fee details
  - [ ] Balance summary
  - [ ] "PAID" watermark
  - [ ] Signature lines
  - [ ] Footer with contact info
- [ ] Test "FULLY PAID" stamp (when balance = 0)
- [ ] Test print functionality

### 6. Financial Reports
**URL:** `/dashboard/fees/reports`

**Test Cases:**
- [ ] Select different terms
- [ ] View summary metrics (revenue, expected, collection rate)
- [ ] View "Revenue by Fee Type" bar chart
- [ ] View "Revenue by Class" horizontal bar chart
- [ ] View "Payment Trends" line chart
- [ ] View "Payment Methods Distribution" pie chart
- [ ] Export to CSV
- [ ] Verify CSV format and data accuracy

### 7. Defaulters Management
**URL:** `/dashboard/fees/defaulters`

**Test Cases:**
- [ ] View list of students with overdue payments
- [ ] Search by student name
- [ ] Search by admission number
- [ ] Filter by class
- [ ] Sort by amount (high to low)
- [ ] Sort by days overdue
- [ ] View guardian contact information
- [ ] Click "Record Payment" button
- [ ] Click "Send Reminder" button
- [ ] Verify empty state (if no defaulters)

## Phase 22: Advanced Analytics Testing

### 1. Main Analytics Dashboard
**URL:** `/dashboard/analytics`

**Test Cases:**
- [ ] View key metrics (students, teachers, results, attendance)
- [ ] View subject performance bar chart
- [ ] View grade distribution pie chart
- [ ] View automatic insights
- [ ] View recent activity feed
- [ ] Navigate to academic analytics
- [ ] Navigate to teacher analytics
- [ ] Navigate to student analytics

### 2. Academic Performance Analytics
**URL:** `/dashboard/analytics/academic`

**Test Cases:**
- [ ] View overall statistics
- [ ] View subject performance overview
- [ ] View class performance comparison
- [ ] View subject difficulty analysis
- [ ] View top 10 performers (with medals)
- [ ] View students needing support
- [ ] View detailed subject statistics table
- [ ] Select different terms
- [ ] Test export functionality

### 3. Teacher Analytics
**URL:** `/dashboard/analytics/teachers`

**Test Cases:**
- [ ] View score entry completion tracking
- [ ] View workload distribution chart
- [ ] View teacher performance metrics
- [ ] View detailed teacher statistics table
- [ ] View overall statistics
- [ ] Select different terms

### 4. Student Analytics & Predictions
**URL:** `/dashboard/analytics/students`

**Test Cases:**
- [ ] Search for student
- [ ] View performance statistics
- [ ] View performance prediction
- [ ] View risk assessment
- [ ] View personalized recommendations
- [ ] View performance trend chart
- [ ] View subject performance radar chart
- [ ] View subject breakdown grid
- [ ] Test with students with different risk levels

## Phase 21: Attendance Testing

### 1. Attendance Dashboard
**URL:** `/dashboard/attendance`

**Test Cases:**
- [ ] View today's attendance summary
- [ ] Mark attendance for a class
- [ ] Mark individual student attendance
- [ ] Use bulk attendance marking
- [ ] View attendance analytics
- [ ] View class attendance reports
- [ ] View student attendance history

### 2. QR Check-in
**URL:** `/dashboard/attendance/qr-checkin`

**Test Cases:**
- [ ] Switch to "Scan" mode
- [ ] Test camera access
- [ ] Scan QR code (if available)
- [ ] Switch to "Generate" mode
- [ ] Generate QR codes for a class
- [ ] Download QR codes PDF
- [ ] Verify QR format (studentId:tenantId)
- [ ] Test duplicate check-in prevention
- [ ] Test late arrival detection (after 9 AM)

## Phase 20: Guardian Management Testing

### 1. Guardian List
**URL:** `/dashboard/guardians`

**Test Cases:**
- [ ] View list of all guardians
- [ ] Search guardians by name
- [ ] Filter guardians
- [ ] View guardian contact information
- [ ] Navigate to guardian details

### 2. Add Guardian
**URL:** `/dashboard/guardians/new`

**Test Cases:**
- [ ] Fill guardian form
- [ ] Add multiple phone numbers
- [ ] Add email address
- [ ] Add physical address
- [ ] Add occupation
- [ ] Select contact preferences
- [ ] Link students (multi-select)
- [ ] Auto-link siblings detection
- [ ] Set relationship type
- [ ] Set primary/emergency contact flags
- [ ] Submit and verify creation

### 3. Edit Guardian
**URL:** `/dashboard/guardians/[id]`

**Test Cases:**
- [ ] Edit guardian information
- [ ] Update linked students
- [ ] Update contact preferences
- [ ] Verify update tracking (updatedAt)

## Phase 18: Email Notifications Testing

### 1. Email Preferences
**URL:** `/dashboard/settings/email-preferences`

**Test Cases:**
- [ ] View email preferences
- [ ] Toggle category-specific settings
- [ ] Set notification frequency
- [ ] Toggle master on/off control
- [ ] Save preferences
- [ ] Verify preferences persist

### 2. Email Logs (Admin)
**URL:** `/dashboard/email-logs`

**Test Cases:**
- [ ] View delivery statistics
- [ ] Search email logs
- [ ] Filter by status
- [ ] View email content
- [ ] Check delivery status tracking

## Phase 17: PDF Report Cards Testing

### 1. Single Student Report
**URL:** `/dashboard/results/[studentId]/[termId]`

**Test Cases:**
- [ ] View student result page
- [ ] Click "Download PDF" button
- [ ] Verify PDF contains:
  - [ ] School branding (logo, name, motto)
  - [ ] Student information
  - [ ] Subject scores (CA1, CA2, CA3, Exam, Total)
  - [ ] Grades
  - [ ] Skills/conduct ratings (if Phase 19 active)
  - [ ] Attendance summary (if Phase 21 active)
  - [ ] Class teacher's remark
  - [ ] Principal's remark
  - [ ] Signature sections
- [ ] Print PDF

### 2. Bulk Class Download
**URL:** `/dashboard/results/class/[classId]/[termId]`

**Test Cases:**
- [ ] View class results
- [ ] Click "Download All PDFs" button
- [ ] Verify ZIP file contains all PDFs
- [ ] Verify individual PDF quality

## Phase 19: Skills/Conduct Testing

### 1. Skills Entry
**URL:** `/dashboard/skills/[studentId]/[termId]`

**Test Cases:**
- [ ] View 14 default skills
- [ ] Rate affective domain skills (1-5)
- [ ] Rate psychomotor skills (1-5)
- [ ] Rate cognitive skills (1-5)
- [ ] Save skills ratings
- [ ] Verify ratings appear on report card

## Common Test Scenarios

### User Authentication
- [ ] Register new school
- [ ] Login as admin
- [ ] Login as teacher
- [ ] Login as parent
- [ ] Test role-based access control
- [ ] Test logout

### Navigation
- [ ] Test sidebar navigation
- [ ] Test breadcrumbs
- [ ] Test back buttons
- [ ] Test "Quick Actions" buttons

### Data Validation
- [ ] Test form validation (required fields)
- [ ] Test date validation
- [ ] Test number validation
- [ ] Test email validation
- [ ] Test phone number validation

### Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on laptop (1366x768)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)

### Performance
- [ ] Page load times < 2 seconds
- [ ] Chart rendering < 1 second
- [ ] PDF generation < 3 seconds
- [ ] Search response < 500ms

## Test Data Setup

### 1. Create Test School
```
School Name: Test Academy
Email: admin@testacademy.com
Phone: +234 123 456 7890
Address: 123 Test Street, Lagos
```

### 2. Create Test Classes
```
- JSS 1A (30 students)
- JSS 1B (28 students)
- JSS 2A (32 students)
- JSS 3A (25 students)
```

### 3. Create Test Students
```
Generate 115 students across 4 classes
Use admission numbers: 2025/001 to 2025/115
```

### 4. Create Test Teachers
```
- Mr. John Doe (Mathematics, JSS 1A)
- Mrs. Jane Smith (English, JSS 1B)
- Mr. Paul Johnson (Science, JSS 2A)
- Mrs. Mary Williams (Social Studies, JSS 3A)
```

### 5. Create Test Guardians
```
- 30 guardians with various contact details
- Link students to guardians (1-3 children each)
```

### 6. Enter Test Scores
```
- Enter scores for all students (CA1, CA2, CA3, Exam)
- Vary scores (30-100) for realistic data
- Publish results
```

### 7. Create Fee Structure
```
- Tuition: ₦50,000 (All classes, Due: Feb 15)
- Books: ₦10,000 (All classes, Due: Jan 31)
- Uniform: ₦8,000 (Optional, Due: Feb 28)
- Transport: ₦15,000 (Optional, Due: Feb 15)
```

### 8. Assign Fees
```
- Assign all fees to all students
- Total expected: 115 students × 4 fees = 460 fee records
```

### 9. Record Test Payments
```
- Full payments: 30 students (all fees)
- Partial payments: 40 students (some fees)
- No payments: 45 students (defaulters)
- Mix payment methods (Cash, Bank Transfer, POS)
```

### 10. Mark Attendance
```
- Mark attendance for 20 school days
- Vary attendance (90-100% for most, <80% for 10 students)
- Include late arrivals, absences, sick days
```

## Expected Results

### Financial Metrics
```
Total Expected: ₦9,545,000 (115 students × ₦83,000)
Total Collected: ~₦6,500,000 (68% collection rate)
Total Outstanding: ~₦3,045,000
Defaulters: ~45 students
```

### Academic Metrics
```
School Average: 65-75%
Pass Rate: 85-90%
Top Performer: 85-95%
Students Needing Support: 10-15 students
```

### Attendance Metrics
```
Average Attendance Rate: 92-95%
Chronic Absentees: 5-8 students
Perfect Attendance: 20-25 students
```

## Bug Reporting Template

```markdown
### Bug Report

**Page:** [URL]
**User Role:** [Admin/Teacher/Parent]
**Browser:** [Chrome/Safari/Firefox]
**Device:** [Desktop/Mobile/Tablet]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots:**
[Attach if applicable]

**Console Errors:**
[Paste any errors from browser console]

**Priority:** [High/Medium/Low]
```

## Performance Benchmarks

| Operation | Target | Acceptable | Poor |
|-----------|--------|------------|------|
| Page Load | < 1s | < 2s | > 3s |
| Search | < 200ms | < 500ms | > 1s |
| Chart Render | < 500ms | < 1s | > 2s |
| PDF Generation | < 2s | < 3s | > 5s |
| Bulk Assignment (100 students) | < 3s | < 5s | > 10s |
| CSV Export | < 1s | < 2s | > 3s |

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader compatible
- [ ] Forms have proper labels
- [ ] Error messages are clear
- [ ] All images have alt text

## Security Testing

- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Role-based access control
- [ ] Data isolation (multi-tenant)
- [ ] Secure password requirements
- [ ] Session management
- [ ] API authentication

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Quick Start Testing

**Recommended Test Flow:**

1. **Setup (30 minutes):**
   - Create school account
   - Add 2-3 classes
   - Add 20 students
   - Add 3 teachers
   - Add 5 guardians

2. **Core Features (30 minutes):**
   - Enter scores for 10 students
   - Publish results
   - Download PDF report cards
   - Test parent login and view results

3. **Fee Management (45 minutes):**
   - Create fee structure (3-4 fee types)
   - Assign fees to all students
   - Record 10 payments (various methods)
   - View financial reports
   - Test defaulters page
   - Generate and download receipts

4. **Analytics (30 minutes):**
   - View main analytics dashboard
   - Check academic performance analytics
   - Check teacher analytics
   - Test student predictions

5. **Attendance (20 minutes):**
   - Mark attendance for a class
   - Generate QR codes
   - View attendance reports

**Total Testing Time:** ~3 hours for comprehensive testing

---

**Last Updated:** January 2025
**Testing Status:** Ready for QA
