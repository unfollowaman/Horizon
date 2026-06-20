export interface Resource {
  id: string;
  title: string;
  description: string;
  category: Category;
  uploadDate: string;
  pdfUrl: string;
  thumbnailUrl: string;
}

export type Category = 'Notes' | 'Previous Year Papers' | 'Study Material' | 'Practice Questions';

export interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
}
