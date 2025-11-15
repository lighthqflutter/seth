/**
 * Mock for PDF generator (Phase 17)
 * Used in tests to avoid @react-pdf/renderer parsing errors
 */

export const generateReportCardPDF = jest.fn(async () => {
  return new Blob(['mock pdf data'], { type: 'application/pdf' });
});

export const downloadReportCard = jest.fn(async () => {
  // Mock download - does nothing in tests
  return Promise.resolve();
});

export const previewReportCard = jest.fn(async () => {
  // Mock preview - does nothing in tests
  return Promise.resolve();
});

export const generateBulkReportCards = jest.fn(async (students) => {
  // Return array of mock blobs
  return students.map(() => new Blob(['mock pdf data'], { type: 'application/pdf' }));
});

export const downloadBulkReportCards = jest.fn(async () => {
  // Mock bulk download - does nothing in tests
  return Promise.resolve();
});
