import React from 'react';
import ResourcePage from './ResourcePage';
import { pyqConfig } from '../../config/resourcePageConfigs';

const LibraryRoute: React.FC = () => {
  return <ResourcePage config={pyqConfig} />;
};

export default LibraryRoute;
