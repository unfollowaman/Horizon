import type { Resource, Announcement } from '../types';

export const mockAnnouncements: Announcement[] = [
  {
    id: 'a1',
    title: 'Welcome to Horizon!',
    description: 'We are excited to launch our new educational resource platform.',
    date: '2023-10-26T10:00:00Z',
  },
  {
    id: 'a2',
    title: 'New Physics Notes Uploaded',
    description: 'Check out the new study materials for Chapter 5.',
    date: '2023-10-27T14:30:00Z',
  },
  {
    id: 'a3',
    title: 'Midterm Exam Schedule',
    description: 'The schedule for the upcoming midterm exams has been posted.',
    date: '2023-10-28T09:15:00Z',
  },
];

export const mockResources: Resource[] = [
  {
    id: 'r1',
    title: 'Calculus I - Limits and Continuity',
    description: 'Comprehensive notes covering the first chapter of Calculus I.',
    resource_type: 'notes',
    medium: 'english',
    uploadDate: '2023-10-25T08:00:00Z',
    pdfUrl: '/placeholders/calculus_notes.pdf',
    thumbnailUrl: '/placeholders/pdf_thumb.png',
    student_class: 'Class 12',
    subject: 'Maths'
  },
  {
    id: 'r2',
    title: 'Computer Science 101 - 2022 Final Exam',
    description: 'Previous year question paper for Intro to CS.',
    resource_type: 'pyq',
    medium: 'english',
    uploadDate: '2023-10-20T11:00:00Z',
    pdfUrl: '/placeholders/cs_2022_final.pdf',
    thumbnailUrl: '/placeholders/pdf_thumb.png',
    student_class: 'Class 12',
    subject: 'Computer Science'
  },
  {
    id: 'r3',
    title: 'Biology - Cell Structure Overview',
    description: 'A detailed diagram and study guide for cell structure.',
    resource_type: 'revision_sheets',
    medium: 'english',
    uploadDate: '2023-10-22T16:45:00Z',
    pdfUrl: '/placeholders/bio_cell.pdf',
    thumbnailUrl: '/placeholders/pdf_thumb.png',
    student_class: 'Class 11',
    subject: 'Biology'
  },
  {
    id: 'r4',
    title: 'Chemistry - Organic Chemistry Practice',
    description: 'Practice questions for basic organic chemistry nomenclature.',
    resource_type: 'mcq',
    medium: 'english',
    uploadDate: '2023-10-28T10:30:00Z',
    pdfUrl: '/placeholders/chem_practice.pdf',
    thumbnailUrl: '/placeholders/pdf_thumb.png',
    student_class: 'Class 11',
    subject: 'Chemistry'
  },
  {
    id: 'r5',
    title: 'History - The Industrial Revolution',
    description: 'Lecture notes from Professor Smith on the Industrial Revolution.',
    resource_type: 'notes',
    medium: 'english',
    uploadDate: '2023-10-29T13:20:00Z',
    pdfUrl: '/placeholders/history_notes.pdf',
    thumbnailUrl: '/placeholders/pdf_thumb.png',
    student_class: 'Class 10',
    subject: 'History'
  },
];
