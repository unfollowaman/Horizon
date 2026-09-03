-- Migration: Create relational syllabus infrastructure for 2026-27 session
-- Tables: syllabus_topics, syllabus_topic_resources

-- 1. Create syllabus_topics table
CREATE TABLE IF NOT EXISTS syllabus_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create syllabus_topic_resources junction table
CREATE TABLE IF NOT EXISTS syllabus_topic_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES syllabus_topics(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_topic_resource UNIQUE (topic_id, resource_id)
);

-- 3. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_syllabus_topics_chapter_id ON syllabus_topics(chapter_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_topics_chapter_order ON syllabus_topics(chapter_id, display_order);
CREATE INDEX IF NOT EXISTS idx_syllabus_topic_resources_topic_id ON syllabus_topic_resources(topic_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_topic_resources_resource_id ON syllabus_topic_resources(resource_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_topic_resources ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for Public Read Access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'syllabus_topics' AND policyname = 'Allow public read access for syllabus_topics'
    ) THEN
        CREATE POLICY "Allow public read access for syllabus_topics"
            ON syllabus_topics FOR SELECT
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'syllabus_topic_resources' AND policyname = 'Allow public read access for syllabus_topic_resources'
    ) THEN
        CREATE POLICY "Allow public read access for syllabus_topic_resources"
            ON syllabus_topic_resources FOR SELECT
            USING (true);
    END IF;
END $$;
