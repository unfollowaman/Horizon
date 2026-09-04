import React from 'react';
import { Link } from 'react-router-dom';
import type { SyllabusTopic, Resource } from '../../../types';

interface SyllabusTopicNodeProps {
  topic: SyllabusTopic;
}

export const SyllabusTopicNode: React.FC<SyllabusTopicNodeProps> = ({ topic }) => {
  const isGrammar = topic.topic_type === 'grammar';
  const isExercise = topic.topic_type === 'exercise';

  const typeBadgeClass = isGrammar
    ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300'
    : isExercise
    ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
    : 'bg-black/5 text-ink/80 border-black/10';

  const typeLabel = isGrammar
    ? 'Grammar'
    : isExercise
    ? 'Exercise'
    : topic.topic_type
    ? topic.topic_type.charAt(0).toUpperCase() + topic.topic_type.slice(1)
    : 'Topic';

  // Extract resources if available
  const resources: Resource[] = topic.resources || [];

  return (
    <div className="neu-recessed p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all min-w-0">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${typeBadgeClass}`}
          >
            {typeLabel}
          </span>
          <h4 className="text-xs sm:text-body1 font-bold text-ink break-words m-0 min-w-0 flex-1">
            {topic.title}
          </h4>
        </div>
        {topic.description && (
          <p className="text-xs sm:text-caption text-ink/70 leading-relaxed m-0 pt-0.5 break-words">
            {topic.description}
          </p>
        )}
      </div>

      {/* Linked Learning Resources */}
      {resources.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap shrink-0 pt-1 sm:pt-0">
          {resources.map((res) => (
            <Link
              key={res.id}
              to={`/resource/${res.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs text-white bg-gradient-to-r from-[#E91E8C] to-[#8B0A50] rounded-lg shadow-sm hover:opacity-95 transition-all no-underline shrink-0"
              title={`View ${res.medium} notes for ${topic.title}`}
            >
              <span>View Notes</span>
              <span className="text-[10px] uppercase opacity-90 px-1 py-0.2 rounded bg-black/20 font-semibold">
                {res.medium === 'hindi' ? 'Hindi' : 'English'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SyllabusTopicNode;
