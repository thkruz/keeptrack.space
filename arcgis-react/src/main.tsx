import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArcGlobe } from './ArcGlobe';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ArcGlobe />
  </React.StrictMode>
);
