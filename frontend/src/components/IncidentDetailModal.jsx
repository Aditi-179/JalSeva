import React from 'react';
import { X, MapPin, Calendar, AlertOctagon, FileText, CheckCircle, Image as ImageIcon } from 'lucide-react';
import StatusBadge from './StatusBadge';
import SeverityBadge from './SeverityBadge';

export default function IncidentDetailModal({ incident, onClose }) {
  if (!incident) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                {incident.incident_id}
              </h2>
              <StatusBadge status={incident.status} />
              <SeverityBadge severity={incident.severity} />
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--grey-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} color="var(--water-600)" />
              {incident.area}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--grey-400)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px', background: 'var(--grey-50)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--grey-500)', textTransform: 'uppercase', fontWeight: 600 }}>Issue Category</span>
            <p style={{ fontWeight: 600, color: 'var(--navy-800)', marginTop: '2px' }}>{incident.issue_type}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--grey-500)', textTransform: 'uppercase', fontWeight: 600 }}>Reported Date</span>
            <p style={{ fontWeight: 500, color: 'var(--grey-700)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} />
              {new Date(incident.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--grey-700)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} color="var(--water-600)" />
            Description
          </h4>
          <p style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--grey-200)', fontSize: '0.925rem', color: 'var(--grey-800)', whiteSpace: 'pre-line' }}>
            {incident.description}
          </p>
        </div>

        {/* Administrative Resolution Note */}
        {incident.resolution_note && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} />
              Administrative Resolution Update
            </h4>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: '#14532d' }}>
              {incident.resolution_note}
            </div>
          </div>
        )}

        {/* Photograph view */}
        {incident.photo_url ? (
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--grey-700)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ImageIcon size={16} color="var(--water-600)" />
              Attached Photographic Evidence
            </h4>
            <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--grey-200)', maxHeight: '350px', display: 'flex', justifyContent: 'center', background: '#000' }}>
              <img
                src={incident.photo_url}
                alt={`Disruption report ${incident.incident_id}`}
                style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain' }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--grey-400)', marginTop: '4px' }}>
              Stored securely in Amazon S3 private storage.
            </p>
          </div>
        ) : (
          <p style={{ fontSize: '0.825rem', color: 'var(--grey-400)', fontStyle: 'italic' }}>
            No photograph was attached with this report.
          </p>
        )}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

