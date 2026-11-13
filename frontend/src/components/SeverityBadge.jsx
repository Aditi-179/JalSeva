import React from 'react';
import { ShieldAlert, AlertTriangle, Info, Flame } from 'lucide-react';

export default function SeverityBadge({ severity }) {
  const normalized = (severity || 'Low').toLowerCase();

  let icon = <Info size={13} />;
  if (normalized === 'medium') icon = <AlertTriangle size={13} />;
  if (normalized === 'high') icon = <Flame size={13} />;
  if (normalized === 'critical') icon = <ShieldAlert size={13} />;

  return (
    <span className={`badge sev-${normalized}`}>
      {icon}
      {severity || 'Low'}
    </span>
  );
}

