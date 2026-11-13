import React, { useState } from 'react';
import { 
  Droplets, 
  MapPin, 
  AlertTriangle, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { api } from '../services/api';

const ISSUE_TYPES = [
  'No Water Supply',
  'Low Water Pressure',
  'Pipeline Leakage',
  'Contaminated Water',
  'Other'
];

const SEVERITY_LEVELS = [
  { value: 'Low', label: 'Low', desc: 'Minor pressure drop or scheduled notice delay' },
  { value: 'Medium', label: 'Medium', desc: 'Noticeable pressure loss or localized intermittent supply' },
  { value: 'High', label: 'High', desc: 'Significant pipe leakage or brown/contaminated water' },
  { value: 'Critical', label: 'Critical', desc: 'Total water outage affecting entire community/street' }
];

export default function ReportIssuePage({ setActivePage, setSelectedIncidentId }) {
  const [area, setArea] = useState('');
  const [issueType, setIssueType] = useState('No Water Supply');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submittedIncident, setSubmittedIncident] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo size exceeds maximum 5 MB limit.');
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!area.trim()) {
      setError('Please provide your locality or area.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError('Please provide a detailed description of at least 10 characters.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('area', area.trim());
      formData.append('issue_type', issueType);
      formData.append('severity', severity);
      formData.append('description', description.trim());
      if (photo) {
        formData.append('photo', photo);
      }

      const res = await api.createIncident(formData);
      if (res.success && res.incident) {
        setSubmittedIncident(res.incident);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit report. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setArea('');
    setIssueType('No Water Supply');
    setSeverity('Medium');
    setDescription('');
    removePhoto();
    setSubmittedIncident(null);
    setError(null);
  };

  // If incident was successfully submitted, show confirmation card
  if (submittedIncident) {
    return (
      <div className="container" style={{ padding: '48px 24px', maxWidth: '680px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#dcfce7',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '8px' }}>
            Report Successfully Submitted
          </h2>
          <p style={{ color: 'var(--grey-600)', fontSize: '0.95rem', marginBottom: '24px' }}>
            Your disruption alert has been logged into the municipal database and routed to utility engineers.
          </p>

          <div style={{
            background: 'var(--grey-50)',
            border: '1px solid var(--grey-200)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            marginBottom: '28px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--grey-500)', fontWeight: 600 }}>Tracking Reference ID:</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--water-600)', letterSpacing: '0.05em' }}>
                {submittedIncident.incident_id}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--grey-500)' }}>Area / Locality:</span>
              <span style={{ fontWeight: 500, color: 'var(--grey-800)' }}>{submittedIncident.area}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--grey-500)' }}>Issue Type:</span>
              <span style={{ fontWeight: 500, color: 'var(--grey-800)' }}>{submittedIncident.issue_type}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--grey-500)' }}>Initial Status:</span>
              <span style={{ fontWeight: 600, color: 'var(--status-reported-text)' }}>Reported</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedIncidentId(submittedIncident.incident_id);
                setActivePage('tracking');
              }}
            >
              Track This Incident
              <ArrowRight size={16} />
            </button>

            <button
              className="btn btn-secondary"
              onClick={resetForm}
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 24px', maxWidth: '780px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy-900)' }}>
          Report a Water Supply Disruption
        </h1>
        <p style={{ color: 'var(--grey-500)', fontSize: '0.95rem', marginTop: '4px' }}>
          Provide clear details to assist municipal water engineers in diagnosing and restoring service.
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        {/* Locality */}
        <div className="form-group">
          <label className="form-label" htmlFor="area">
            Locality / Area <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--grey-400)' }} />
            <input
              id="area"
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="e.g. Greenwood Enclave, Sector 4, 5th Cross Road"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
            />
          </div>
          <span className="form-hint">Mention street, block or landmark for rapid field dispatch.</span>
        </div>

        {/* Issue Type & Severity in 2 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="issueType">
              Issue Category <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="issueType"
              className="form-select"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
            >
              {ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="severity">
              Estimated Severity <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="severity"
              className="form-select"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              {SEVERITY_LEVELS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} — {s.desc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label" htmlFor="description">
            Detailed Description <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            id="description"
            className="form-textarea"
            placeholder="Describe the nature of disruption: When did it begin? Are neighboring buildings affected? Any signs of external road flooding or discolored water?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
          />
          <span className="form-hint">Minimum 10 characters.</span>
        </div>

        {/* Photo Upload */}
        <div className="form-group">
          <label className="form-label">
            Attach Photograph Evidence (Optional)
          </label>

          {!photoPreview ? (
            <label className="upload-dropzone" style={{ display: 'block' }}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
              <UploadCloud size={32} color="var(--water-600)" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 600, color: 'var(--navy-800)', fontSize: '0.9rem' }}>
                Click to browse photograph
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--grey-500)', marginTop: '2px' }}>
                Supports JPG, PNG, WEBP up to 5 MB. Stored privately in Amazon S3.
              </p>
            </label>
          ) : (
            <div style={{ position: 'relative', display: 'inline-block', border: '1px solid var(--grey-200)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <img
                src={photoPreview}
                alt="Upload Preview"
                style={{ maxHeight: '180px', display: 'block' }}
              />
              <button
                type="button"
                onClick={removePhoto}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Remove photo"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={resetForm}
            disabled={loading}
          >
            Clear Form
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ minWidth: '150px' }}
          >
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
}

