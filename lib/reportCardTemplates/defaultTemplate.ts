import { CreateTemplateInput } from '@/types/reportCardTemplate';

/**
 * Creates a default "Classic" template that matches the current hardcoded report card design
 * This is used for migrating existing schools to the template system
 * without changing their current report card output
 */
export function createDefaultClassicTemplate(
  tenantId: string,
  createdBy: string
): CreateTemplateInput {
  return {
    tenantId,
    name: 'Default Classic Template',
    description:
      'Default template matching the original report card design. Automatically created for backward compatibility.',
    templateType: 'classic',
    isDefault: true, // Set as default for migration
    isActive: true,
    assignedToClasses: [], // Will be assigned to all classes during migration
    assignedToLevels: [],

    layout: {
      mode: 'preset',
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      sections: [
        {
          id: 'header',
          type: 'header',
          enabled: true,
          order: 0,
        },
        {
          id: 'student-info',
          type: 'student-info',
          enabled: true,
          order: 1,
        },
        {
          id: 'scores-table',
          type: 'scores-table',
          enabled: true,
          order: 2,
        },
        {
          id: 'attendance',
          type: 'attendance',
          enabled: true,
          order: 3,
        },
        {
          id: 'skills',
          type: 'skills',
          enabled: true,
          order: 4,
        },
        {
          id: 'comments',
          type: 'comments',
          enabled: true,
          order: 5,
        },
        {
          id: 'footer',
          type: 'footer',
          enabled: true,
          order: 6,
        },
      ],
    },

    branding: {
      logoPosition: 'left',
      showLogo: true,
      showSchoolName: true,
      showMotto: true,
      showAddress: true,
      headerStyle: 'classic',
      colorScheme: 'primary', // Use tenant's primary color
      fonts: {
        header: 'Helvetica-Bold',
        body: 'Helvetica',
        size: 'medium',
      },
    },

    scoresTable: {
      // Match current system columns (CA1, CA2, CA3, Exam, Total, Grade, Remark)
      columns: ['Subject', 'CA1', 'CA2', 'CA3', 'Exam', 'Total', 'Grade', 'Remark'],
      showCABreakdown: true,
      showPercentage: true,
      showGrade: true,
      showRemark: true,
      showPosition: true,
      remarkType: 'auto',
    },

    comments: {
      showTeacherComment: true,
      showPrincipalComment: true,
      maxLength: 500,
      showSignature: true,
    },

    attendance: {
      enabled: true,
      showDaysPresent: true,
      showDaysAbsent: true,
      showAttendanceRate: true,
    },

    skills: {
      enabled: true,
      displayStyle: 'table',
      showDescriptions: false,
    },

    createdBy,
  };
}

/**
 * Creates a default template with dynamic configuration based on tenant settings
 * This allows the default template to adapt to the school's existing configuration
 */
export function createDefaultTemplateFromTenantSettings(
  tenantId: string,
  createdBy: string,
  tenantSettings?: {
    numberOfCAs?: number;
    showAttendance?: boolean;
    showSkills?: boolean;
    reportCardTemplate?: string;
  }
): CreateTemplateInput {
  const defaultTemplate = createDefaultClassicTemplate(tenantId, createdBy);

  if (!tenantSettings) {
    return defaultTemplate;
  }

  // Adapt scores table columns based on number of CAs
  if (tenantSettings.numberOfCAs !== undefined) {
    const numberOfCAs = tenantSettings.numberOfCAs;
    const caColumns = [];

    for (let i = 1; i <= numberOfCAs && i <= 10; i++) {
      caColumns.push(`CA${i}`);
    }

    defaultTemplate.scoresTable.columns = [
      'Subject',
      ...caColumns,
      'Exam',
      'Total',
      'Grade',
      'Remark',
    ];
  }

  // Adapt attendance section based on tenant settings
  if (tenantSettings.showAttendance === false) {
    const attendanceSection = defaultTemplate.layout.sections.find(
      (s) => s.type === 'attendance'
    );
    if (attendanceSection) {
      attendanceSection.enabled = false;
    }
    defaultTemplate.attendance.enabled = false;
  }

  // Adapt skills section based on tenant settings
  if (tenantSettings.showSkills === false) {
    const skillsSection = defaultTemplate.layout.sections.find((s) => s.type === 'skills');
    if (skillsSection) {
      skillsSection.enabled = false;
    }
    defaultTemplate.skills.enabled = false;
  }

  // Adapt template type based on existing report card template setting
  if (tenantSettings.reportCardTemplate) {
    switch (tenantSettings.reportCardTemplate) {
      case 'detailed':
        defaultTemplate.templateType = 'comprehensive';
        defaultTemplate.name = 'Default Comprehensive Template';
        break;
      case 'minimal':
        defaultTemplate.templateType = 'compact';
        defaultTemplate.name = 'Default Compact Template';
        break;
      default:
        // Keep classic
        break;
    }
  }

  return defaultTemplate;
}
