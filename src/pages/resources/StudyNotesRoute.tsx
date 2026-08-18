import React from 'react';
import ResourcePage from './ResourcePage';
import { notesConfig } from '../../config/resourcePageConfigs';

const StudyNotesRoute: React.FC = () => {
  return <ResourcePage config={notesConfig} />;
};

export default StudyNotesRoute;
