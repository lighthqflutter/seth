import {
  ReportCardTemplate,
  TemplateType,
  CreateTemplateInput,
} from '@/types/reportCardTemplate';
import { Timestamp } from 'firebase/firestore';

/**
 * Creates a Classic template configuration (matches current system)
 * - Traditional layout with all sections
 * - Full CA breakdown
 * - Formal styling
 */
export function createClassicTemplate(tenantId: string, createdBy: string): CreateTemplateInput {
  return {
    tenantId,
    name: 'Classic Report Card',
    description: 'Traditional report card layout with full assessment breakdown and all sections',
    templateType: 'classic',
    isDefault: false,
    isActive: true,
    assignedToClasses: [],
    assignedToLevels: [],

    layout: {
      mode: 'preset',
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      sections: [
        { id: 'header', type: 'header', enabled: true, order: 0 },
        { id: 'student-info', type: 'student-info', enabled: true, order: 1 },
        { id: 'scores-table', type: 'scores-table', enabled: true, order: 2 },
        { id: 'attendance', type: 'attendance', enabled: true, order: 3 },
        { id: 'skills', type: 'skills', enabled: true, order: 4 },
        { id: 'comments', type: 'comments', enabled: true, order: 5 },
        { id: 'footer', type: 'footer', enabled: true, order: 6 },
      ],
    },

    branding: {
      logoPosition: 'left',
      showLogo: true,
      showSchoolName: true,
      showMotto: true,
      showAddress: true,
      headerStyle: 'classic',
      colorScheme: 'primary',
      fonts: {
        header: 'Helvetica-Bold',
        body: 'Helvetica',
        size: 'medium',
      },
    },

    scoresTable: {
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
 * Creates a Modern template configuration
 * - Clean, minimalist design
 * - Color accents
 * - Condensed layout
 */
export function createModernTemplate(tenantId: string, createdBy: string): CreateTemplateInput {
  return {
    tenantId,
    name: 'Modern Report Card',
    description: 'Clean and contemporary design with color accents and streamlined layout',
    templateType: 'modern',
    isDefault: false,
    isActive: true,
    assignedToClasses: [],
    assignedToLevels: [],

    layout: {
      mode: 'preset',
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 15, right: 15, bottom: 15, left: 15 },
      sections: [
        { id: 'header', type: 'header', enabled: true, order: 0 },
        { id: 'student-info', type: 'student-info', enabled: true, order: 1 },
        { id: 'scores-table', type: 'scores-table', enabled: true, order: 2 },
        { id: 'skills', type: 'skills', enabled: true, order: 3 },
        { id: 'attendance', type: 'attendance', enabled: true, order: 4 },
        { id: 'comments', type: 'comments', enabled: true, order: 5 },
        { id: 'footer', type: 'footer', enabled: true, order: 6 },
      ],
    },

    branding: {
      logoPosition: 'center',
      showLogo: true,
      showSchoolName: true,
      showMotto: false,
      showAddress: false,
      headerStyle: 'modern',
      colorScheme: 'primary',
      fonts: {
        header: 'Helvetica-Bold',
        body: 'Helvetica',
        size: 'medium',
      },
    },

    scoresTable: {
      columns: ['Subject', 'CA Total', 'Exam', 'Total', 'Grade'],
      showCABreakdown: false, // Condensed - show CA total only
      showPercentage: true,
      showGrade: true,
      showRemark: false, // More compact
      showPosition: true,
      remarkType: 'auto',
    },

    comments: {
      showTeacherComment: true,
      showPrincipalComment: false, // More streamlined
      maxLength: 300,
      showSignature: false,
    },

    attendance: {
      enabled: true,
      showDaysPresent: false, // Show rate only
      showDaysAbsent: false,
      showAttendanceRate: true,
    },

    skills: {
      enabled: true,
      displayStyle: 'grid', // More modern grid layout
      showDescriptions: false,
    },

    createdBy,
  };
}

/**
 * Creates a Compact template configuration
 * - Single-page design
 * - Essential information only
 * - Smaller font sizes
 * - Ideal for primary schools
 */
export function createCompactTemplate(tenantId: string, createdBy: string): CreateTemplateInput {
  return {
    tenantId,
    name: 'Compact Report Card',
    description: 'Condensed single-page design with essential information only',
    templateType: 'compact',
    isDefault: false,
    isActive: true,
    assignedToClasses: [],
    assignedToLevels: [],

    layout: {
      mode: 'preset',
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      sections: [
        { id: 'header', type: 'header', enabled: true, order: 0 },
        { id: 'student-info', type: 'student-info', enabled: true, order: 1 },
        { id: 'scores-table', type: 'scores-table', enabled: true, order: 2 },
        { id: 'skills', type: 'skills', enabled: true, order: 3 },
        { id: 'comments', type: 'comments', enabled: true, order: 4 },
      ],
    },

    branding: {
      logoPosition: 'left',
      showLogo: true,
      showSchoolName: true,
      showMotto: false,
      showAddress: false,
      headerStyle: 'minimal',
      colorScheme: 'grayscale', // Simpler printing
      fonts: {
        header: 'Helvetica-Bold',
        body: 'Helvetica',
        size: 'small', // Smaller to fit everything
      },
    },

    scoresTable: {
      columns: ['Subject', 'Total', 'Grade'],
      showCABreakdown: false, // No breakdown - very compact
      showPercentage: false,
      showGrade: true,
      showRemark: false,
      showPosition: true,
      remarkType: 'auto',
    },

    comments: {
      showTeacherComment: true,
      showPrincipalComment: false,
      maxLength: 200,
      showSignature: false,
    },

    attendance: {
      enabled: false, // Disabled to save space
      showDaysPresent: false,
      showDaysAbsent: false,
      showAttendanceRate: false,
    },

    skills: {
      enabled: true,
      displayStyle: 'list', // Most compact
      showDescriptions: false,
    },

    createdBy,
  };
}

/**
 * Creates a Comprehensive template configuration
 * - Multi-page template
 * - Detailed analytics
 * - All possible sections
 * - Subject-by-subject breakdown
 */
export function createComprehensiveTemplate(
  tenantId: string,
  createdBy: string
): CreateTemplateInput {
  return {
    tenantId,
    name: 'Comprehensive Report Card',
    description: 'Detailed multi-page report with complete analytics and breakdowns',
    templateType: 'comprehensive',
    isDefault: false,
    isActive: true,
    assignedToClasses: [],
    assignedToLevels: [],

    layout: {
      mode: 'preset',
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      sections: [
        { id: 'header', type: 'header', enabled: true, order: 0 },
        { id: 'student-info', type: 'student-info', enabled: true, order: 1 },
        { id: 'scores-table', type: 'scores-table', enabled: true, order: 2 },
        { id: 'performance-chart', type: 'performance-chart', enabled: true, order: 3 },
        { id: 'attendance', type: 'attendance', enabled: true, order: 4 },
        { id: 'skills', type: 'skills', enabled: true, order: 5 },
        { id: 'comments', type: 'comments', enabled: true, order: 6 },
        { id: 'footer', type: 'footer', enabled: true, order: 7 },
      ],
    },

    branding: {
      logoPosition: 'left',
      showLogo: true,
      showSchoolName: true,
      showMotto: true,
      showAddress: true,
      headerStyle: 'classic',
      colorScheme: 'primary',
      fonts: {
        header: 'Helvetica-Bold',
        body: 'Helvetica',
        size: 'medium',
      },
    },

    scoresTable: {
      columns: [
        'Subject',
        'CA1',
        'CA2',
        'CA3',
        'Exam',
        'Total',
        'Percentage',
        'Grade',
        'Position',
        'Remark',
      ],
      showCABreakdown: true,
      showPercentage: true,
      showGrade: true,
      showRemark: true,
      showPosition: true,
      remarkType: 'both', // Both auto and teacher remarks
    },

    comments: {
      showTeacherComment: true,
      showPrincipalComment: true,
      maxLength: 1000, // Longer comments allowed
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
      showDescriptions: true, // Show skill descriptions
    },

    createdBy,
  };
}

/**
 * Get all available preset templates
 */
export function getAllPresets(tenantId: string, createdBy: string): CreateTemplateInput[] {
  return [
    createClassicTemplate(tenantId, createdBy),
    createModernTemplate(tenantId, createdBy),
    createCompactTemplate(tenantId, createdBy),
    createComprehensiveTemplate(tenantId, createdBy),
  ];
}

/**
 * Get preset by template type
 */
export function getPresetByType(
  type: TemplateType,
  tenantId: string,
  createdBy: string
): CreateTemplateInput | null {
  switch (type) {
    case 'classic':
      return createClassicTemplate(tenantId, createdBy);
    case 'modern':
      return createModernTemplate(tenantId, createdBy);
    case 'compact':
      return createCompactTemplate(tenantId, createdBy);
    case 'comprehensive':
      return createComprehensiveTemplate(tenantId, createdBy);
    default:
      return null;
  }
}

/**
 * Get template preview metadata
 */
export interface TemplatePreview {
  type: TemplateType;
  name: string;
  description: string;
  features: string[];
  bestFor: string;
}

export const TEMPLATE_PREVIEWS: Record<TemplateType, TemplatePreview> = {
  classic: {
    type: 'classic',
    name: 'Classic Report Card',
    description: 'Traditional layout with complete assessment breakdown',
    features: [
      'Full CA breakdown (CA1, CA2, CA3, Exam)',
      'All sections included',
      'Formal professional design',
      'Detailed grading remarks',
    ],
    bestFor: 'Secondary schools and formal academic reporting',
  },
  modern: {
    type: 'modern',
    name: 'Modern Report Card',
    description: 'Contemporary design with streamlined information',
    features: [
      'Clean minimalist layout',
      'Color accents using school branding',
      'Condensed CA totals',
      'Grid-based skills display',
    ],
    bestFor: 'Progressive schools seeking modern aesthetics',
  },
  compact: {
    type: 'compact',
    name: 'Compact Report Card',
    description: 'Single-page design with essential information',
    features: [
      'Fits on one page',
      'Essential information only',
      'Smaller font sizes',
      'No attendance section',
    ],
    bestFor: 'Primary schools and simple reporting needs',
  },
  comprehensive: {
    type: 'comprehensive',
    name: 'Comprehensive Report Card',
    description: 'Detailed multi-page report with complete analytics',
    features: [
      'All assessment details',
      'Performance charts',
      'Extended comments (1000 chars)',
      'Subject position tracking',
    ],
    bestFor: 'International schools and detailed academic analysis',
  },
  custom: {
    type: 'custom',
    name: 'Custom Template',
    description: 'Fully customizable template created from scratch',
    features: [
      'Complete control over layout',
      'Drag-and-drop section placement',
      'Custom grid positioning',
      'Unique to your needs',
    ],
    bestFor: 'Schools with specific reporting requirements',
  },
};
