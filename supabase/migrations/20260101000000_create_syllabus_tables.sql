-- Migration: Create syllabus_topics and syllabus_topic_resources tables
-- Stage 4 Syllabus Foundation

-- 1. Create syllabus_topics table
CREATE TABLE IF NOT EXISTS public.syllabus_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    topic_type TEXT NOT NULL DEFAULT 'topic',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create syllabus_topic_resources junction table
CREATE TABLE IF NOT EXISTS public.syllabus_topic_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.syllabus_topics(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.learning_resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT syllabus_topic_resources_topic_resource_key UNIQUE (topic_id, resource_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_syllabus_topics_chapter_id ON public.syllabus_topics(chapter_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_topics_display_order ON public.syllabus_topics(display_order);
CREATE INDEX IF NOT EXISTS idx_syllabus_topic_resources_topic_id ON public.syllabus_topic_resources(topic_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_topic_resources_resource_id ON public.syllabus_topic_resources(resource_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_topic_resources ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for public read access
CREATE POLICY "Allow public read access on syllabus_topics"
    ON public.syllabus_topics
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access on syllabus_topic_resources"
    ON public.syllabus_topic_resources
    FOR SELECT
    USING (true);
