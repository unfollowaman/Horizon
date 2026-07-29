export interface Resource {
  id: string;
  title: string;
  description: string;
  resource_type: ResourceType;
  medium: Medium;
  uploadDate: string;
  pdfUrl: string;
  thumbnailUrl: string;
  student_class?: string | null;
  subject?: string | null;
  year?: string;
  chapter_id?: string | null;
}

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

// PostgreSQL ENUMs
export type ResourceType = 'notes' | 'revision_sheets' | 'mcq' | 'flashcards' | 'pyq';
export type Medium = 'english' | 'hindi';

// Table types (using 'type' instead of 'interface' to ensure assignment to Record<string, unknown>)
export type LearningResource = {
  id: string;
  title: string;
  description: string;
  student_class?: string | null;
  resource_type: ResourceType;
  medium: Medium;
  file_path?: string | null;
  pdf_url?: string | null;
  thumbnail_url?: string | null;
  subject?: string | null;
  year?: number | null;
  created_at?: string;
  chapter_id?: string | null;
}

export type ReadingProgress = {
  id: string;
  user_id: string;
  resource_id: string;
  progress: number;
  last_read_at?: string | null;
  created_at?: string;
}

export type ChapterCompletion = {
  id: string;
  user_id: string;
  resource_id: string;
  chapter_id: string;
  completed_at?: string | null;
  created_at?: string;
}

export type Profile = {
  id: string;
  student_class?: string | null;
  study_medium?: string | null;
  avatar_url?: string | null;
  onboarding_completed: boolean;
  name?: string | null;
  created_at?: string;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      learning_resources: {
        Row: LearningResource
        Insert: {
          id?: string
          title: string
          description: string
          student_class?: string | null
          resource_type: ResourceType
          medium: Medium
          file_path?: string | null
          pdf_url?: string | null
          thumbnail_url?: string | null
          subject?: string | null
          year?: number | null
          created_at?: string
          chapter_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          student_class?: string | null
          resource_type?: ResourceType
          medium?: Medium
          file_path?: string | null
          pdf_url?: string | null
          thumbnail_url?: string | null
          subject?: string | null
          year?: number | null
          created_at?: string
          chapter_id?: string | null
        }
        Relationships: []
      }
      reading_progress: {
        Row: ReadingProgress
        Insert: {
          id?: string
          user_id: string
          resource_id: string
          progress: number
          last_read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_id?: string
          progress?: number
          last_read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_resource_id_fkey"
            columns: ["resource_id"]
            referencedRelation: "learning_resources"
            referencedColumns: ["id"]
          }
        ]
      }
      chapter_completion: {
        Row: ChapterCompletion
        Insert: {
          id?: string
          user_id: string
          resource_id: string
          chapter_id: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_id?: string
          chapter_id?: string
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_completion_resource_id_fkey"
            columns: ["resource_id"]
            referencedRelation: "learning_resources"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: Profile
        Insert: {
          id: string
          student_class?: string | null
          study_medium?: string | null
          avatar_url?: string | null
          onboarding_completed?: boolean
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_class?: string | null
          study_medium?: string | null
          avatar_url?: string | null
          onboarding_completed?: boolean
          name?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      resource_type: ResourceType
      medium: Medium
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
