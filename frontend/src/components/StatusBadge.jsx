import React from 'react';
import { AlertCircle, Clock, Wrench, CheckCircle2 } from 'lucide-react';

export default function StatusBadge({ status }) {
  const normalized = (status || 'Reported').toLowerCase().replace(/\s+/g, '-');
  
  let icon = <AlertCircle size={13} />;
  if (normalized === 'under-review') icon = <Clock size={13} />;
  if (normalized === 'in-progress') icon = <Wrench size={13} />;
  if (normalized === 'resolved') icon = <CheckCircle2 size={13} />;

  return (
    <span className={`badge status-${normalized}`}>
      {icon}
      {status || 'Reported'}
    </span>
  );
}

