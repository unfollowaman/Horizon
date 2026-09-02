import { describe, it, expect } from 'vitest';
import {
  classToSlug,
  slugToClass,
  mediumToSlug,
  slugToMedium,
  subjectToSlug,
  slugToSubject,
  buildCategoryUrl,
  isClassSlug,
  isMediumSlug,
} from '../urlHelper';

describe('urlHelper', () => {
  describe('classToSlug & slugToClass', () => {
    it('converts class strings to canonical slugs', () => {
      expect(classToSlug('Class 10')).toBe('class-10');
      expect(classToSlug('Class 8')).toBe('class-8');
      expect(classToSlug('10')).toBe('class-10');
      expect(classToSlug(null)).toBeNull();
    });

    it('converts class slugs back to display names', () => {
      expect(slugToClass('class-10')).toBe('Class 10');
      expect(slugToClass('10')).toBe('Class 10');
      expect(slugToClass('class-12', ['Class 8', 'Class 12'])).toBe('Class 12');
      expect(slugToClass(null)).toBeNull();
    });
  });

  describe('mediumToSlug & slugToMedium', () => {
    it('converts medium strings to canonical slugs', () => {
      expect(mediumToSlug('English')).toBe('english-medium');
      expect(mediumToSlug('English Medium')).toBe('english-medium');
      expect(mediumToSlug('Hindi')).toBe('hindi-medium');
      expect(mediumToSlug(null)).toBeNull();
    });

    it('converts medium slugs back to display names', () => {
      expect(slugToMedium('english-medium')).toBe('English');
      expect(slugToMedium('english')).toBe('English');
      expect(slugToMedium('hindi-medium')).toBe('Hindi');
      expect(slugToMedium(null)).toBeNull();
    });
  });

  describe('subjectToSlug & slugToSubject', () => {
    it('converts subject strings to canonical slugs', () => {
      expect(subjectToSlug('Geography')).toBe('geography');
      expect(subjectToSlug('Social Science')).toBe('social-science');
      expect(subjectToSlug(null)).toBeNull();
    });

    it('converts subject slugs back to display names using availableSubjects list or fallback', () => {
      expect(slugToSubject('geography', ['Geography', 'History'])).toBe('Geography');
      expect(slugToSubject('social-science')).toBe('Social Science');
      expect(slugToSubject(null)).toBeNull();
    });
  });

  describe('buildCategoryUrl', () => {
    it('builds full Class -> Medium -> Subject hierarchy URL', () => {
      const url = buildCategoryUrl({
        basePath: '/notes',
        studentClass: 'Class 10',
        medium: 'English',
        subject: 'Geography',
      });
      expect(url).toBe('/notes/class-10/english-medium/geography');
    });

    it('builds partial Class -> Medium hierarchy URL', () => {
      const url = buildCategoryUrl({
        basePath: '/library',
        studentClass: 'Class 10',
        medium: 'English',
      });
      expect(url).toBe('/library/class-10/english-medium');
    });

    it('builds Class-only hierarchy URL', () => {
      const url = buildCategoryUrl({
        basePath: '/notes',
        studentClass: 'Class 10',
      });
      expect(url).toBe('/notes/class-10');
    });

    it('handles query parameters for year when present', () => {
      const url = buildCategoryUrl({
        basePath: '/library',
        studentClass: 'Class 10',
        medium: 'English',
        subject: 'Geography',
        year: '2024',
      });
      expect(url).toBe('/library/class-10/english-medium/geography?year=2024');
    });

    it('handles query parameters for medium, subject, and year when class is missing or empty', () => {
      expect(
        buildCategoryUrl({
          basePath: '/notes',
          medium: 'English',
        })
      ).toBe('/notes?medium=english-medium');

      expect(
        buildCategoryUrl({
          basePath: '/notes',
          subject: 'Geography',
        })
      ).toBe('/notes?subject=geography');

      expect(
        buildCategoryUrl({
          basePath: '/notes',
          medium: 'Hindi',
          subject: 'Social Science',
        })
      ).toBe('/notes?medium=hindi-medium&subject=social-science');

      expect(
        buildCategoryUrl({
          basePath: '/library',
          subject: 'Mathematics',
          year: '2024',
        })
      ).toBe('/library?subject=mathematics&year=2024');
    });
  });

  describe('slug detection helpers', () => {
    it('identifies class slugs correctly', () => {
      expect(isClassSlug('class-10')).toBe(true);
      expect(isClassSlug('10')).toBe(true);
      expect(isClassSlug('english-medium')).toBe(false);
    });

    it('identifies medium slugs correctly', () => {
      expect(isMediumSlug('english-medium')).toBe(true);
      expect(isMediumSlug('hindi-medium')).toBe(true);
      expect(isMediumSlug('geography')).toBe(false);
    });
  });
});
