import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import AuditClient from './audit-client';
hydrateRoot(document.getElementById('root')!, <AuditClient/>);
