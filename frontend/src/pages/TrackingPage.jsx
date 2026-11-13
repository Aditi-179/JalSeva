import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  RefreshCw, 
  Eye, 
  Image as ImageIcon,
  AlertCircle,
  FileQuestion
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import IncidentDetailModal from '../components/IncidentDetailModal';

const STATUS_FILTERS = ['All', 'Reported', 'Under Review', 'In Progress', 'Resolved'];
const ISSUE_FILTERS = [
  'All',
  'No Water Supply',
  'Low Water Pressure',
  'Pipeline Leakage',
  'Contaminated Water',
  'Other'
];
const SEVERITY_FILTERS = ['All', 'Low', 'Medium', 'High', 'Critical'];

export default function TrackingPage({ preselectedIncidentId, clearPreselected }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState(preselectedIncidentId || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [issueFilter, setIssueFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');

  // Modal inspection state
  const [activeModalIncident, setActiveModalIncident] = useState(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getIncidents({
        search: searchTerm,
        status: statusFilter,
        issue_type: issueFilter,
        severity: severityFilter
      });
      setIncidents(data.incidents || []);

      // If preselected incident exists, auto open it in modal
      if (preselectedIncidentId && data.incidents) {
        const found = data.incidents.find(i => i.incident_id === preselectedIncidentId);
        if (found) {
          setActiveModalIncident(found);
        }
        if (clearPreselected) clearPreselected();
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, issueFilter, severityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchIncidents();
  };

  return (
    <div className="container" style={{ padding: '36px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            Municipal Disruption Incident Tracker
          </h1>
          <p style={{ color: 'var(--grey-500)', fontSize: '0.9rem', marginTop: '2px' }}>
            Monitor reported pipeline leaks, supply outages, and live engineer updates across all localities.
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={fetchIncidents}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--grey-400)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by Incident ID (AQ-1001) or Area / Keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ flex: '0 1 160px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option disabled value="">Status</option>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '0 1 180px' }}>
            <select
              className="form-select"
              value={issueFilter}
              onChange={(e) => setIssueFilter(e.target.value)}
            >
              <option disabled value="">Category</option>
              {ISSUE_FILTERS.map((cat) => (
                <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '0 1 150px' }}>
            <select
              className="form-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option disabled value="">Severity</option>
              {SEVERITY_FILTERS.map((sev) => (
                <option key={sev} value={sev}>{sev === 'All' ? 'All Severities' : sev}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-navy" style={{ flexShrink: 0 }}>
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--grey-500)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px', color: 'var(--water-600)' }} />
          <p>Querying municipal incident database...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <FileQuestion size={44} style={{ color: 'var(--grey-400)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--navy-900)' }}>
            No Incidents Found
          </h3>
          <p style={{ color: 'var(--grey-500)', fontSize: '0.9rem', marginTop: '4px', maxWidth: '420px', margin: '6px auto 16px' }}>
            No reported disruptions matched your search and filter parameters. Try resetting filters or search terms.
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('All');
              setIssueFilter('All');
              setSeverityFilter('All');
            }}
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        /* Incidents Table / Cards */
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>Area / Locality</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Photo</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--water-600)' }}>
                        {incident.incident_id}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '280px' }}>
                        <MapPin size={14} color="var(--water-600)" style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: 'var(--navy-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {incident.area}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', color: 'var(--grey-700)' }}>
                        {incident.issue_type}
                      </span>
                    </td>
                    <td>
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td>
                      <StatusBadge status={incident.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--grey-500)' }}>
                        {new Date(incident.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      {incident.photo_key ? (
                        <span style={{ color: 'var(--water-600)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                          <ImageIcon size={14} /> Attached
                        </span>
                      ) : (
                        <span style={{ color: 'var(--grey-400)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.825rem' }}
                        onClick={() => setActiveModalIncident(incident)}
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for viewing report details */}
      {activeModalIncident && (
        <IncidentDetailModal
          incident={activeModalIncident}
          onClose={() => setActiveModalIncident(null)}
        />
      )}
    </div>
  );
}

