/**
 * Mock for @react-pdf/renderer
 * Used in tests to avoid ESM parsing errors
 */

import React from 'react';

// Mock PDF components
export const Document = ({ children }: any) => React.createElement('div', { 'data-testid': 'pdf-document' }, children);
export const Page = ({ children }: any) => React.createElement('div', { 'data-testid': 'pdf-page' }, children);
export const View = ({ children, style }: any) => React.createElement('div', { style }, children);
export const Text = ({ children, style }: any) => React.createElement('span', { style }, children);
export const Image = ({ src, style }: any) => React.createElement('img', { src, style });
export const Font = {
  register: jest.fn(),
};
export const StyleSheet = {
  create: (styles: any) => styles,
};

// Mock pdf() function
export const pdf = jest.fn((element: any) => ({
  toBlob: jest.fn(async () => new Blob(['mock pdf'], { type: 'application/pdf' })),
  toString: jest.fn(async () => 'mock pdf string'),
  toBuffer: jest.fn(async () => Buffer.from('mock pdf')),
}));

export default {
  Document,
  Page,
  View,
  Text,
  Image,
  Font,
  StyleSheet,
  pdf,
};
