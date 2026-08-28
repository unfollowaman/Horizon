-- Migration: Add chapter-specific content fields to chapters and learning_resources tables

-- Add nullable chapter content fields to chapters table
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS chapter_summary text;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS topics jsonb;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS key_concepts jsonb;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS important_terms jsonb;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS learning_objectives jsonb;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS exam_relevant_themes jsonb;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS study_guidance jsonb;

-- Add nullable chapter content fields to learning_resources table
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS chapter_summary text;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS topics jsonb;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS key_concepts jsonb;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS important_terms jsonb;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS learning_objectives jsonb;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS exam_relevant_themes jsonb;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS study_guidance jsonb;
