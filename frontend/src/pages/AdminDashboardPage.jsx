import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  LogOut, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Wrench, 
  Droplets,
  Database,
  DownloadCloud,
  Edit3,
  X,
  Search,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import IncidentDetailModal from '../components/IncidentDetailModal';

const CATEGORY_COLORS = ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#94a3b8'];

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAdminLoggedIn());
  const [adminUser, setAdminUser] = useState(api.getCurrentAdmin());

  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Table filter state
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatus, setTableStatus] = useState('All');

  // Active modal inspection
  const [activeModalIncident, setActiveModalIncident] = useState(null);

  // Update modal state
  const [updatingIncident, setUpdatingIncident] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateSeverity, setUpdateSeverity] = useState('');
  const [updateNote, setUpdateNote] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  // Archival export state
  const [backupLoading, setBackupLoading] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAdminDashboard();
      setDashboardData(data);
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        setIsAuthenticated(false);
      } else {
        setError(err.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboard();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    try {
      setLoginLoading(true);
      const res = await api.adminLogin(username, password);
      setIsAuthenticated(true);
      setAdminUser(res.admin);
    } catch (err) {
      setLoginError(err.message || 'Invalid administrator credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    api.adminLogout();
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  const openUpdateModal = (incident) => {
    setUpdatingIncident(incident);
    setUpdateStatus(incident.status);
    setUpdateSeverity(incident.severity);
    setUpdateNote(incident.resolution_note || '');
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!updatingIncident) return;
    try {
      setUpdateLoading(true);
      await api.updateIncidentStatus(updatingIncident.incident_id, {
        status: updateStatus,
        severity: updateSeverity,
        resolution_note: updateNote
      });
      setActionSuccess(`Incident ${updatingIncident.incident_id} updated successfully.`);
      setUpdatingIncident(null);
      await loadDashboard();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await api.triggerBackup();
      alert(`Archival backup completed! Stored at: ${res.backup.destination.toUpperCase()} (${res.backup.records} records exported)`);
    } catch (err) {
      alert(`Backup failed: ${err.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  // 1. Authentication View if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: '64px 24px', maxWidth: '440px' }}>
        <div className="card" style={{ padding: '36px 32px' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '12px',
            background: 'var(--navy-800)',
            color: 'var(--water-400)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <ShieldCheck size={28} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, textAlign: 'center', color: 'var(--navy-900)', marginBottom: '6px' }}>
            Administrator Access
          </h2>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--grey-500)', marginBottom: '24px' }}>
            Municipal Water Authority Incident Management Portal
          </p>

          {loginError && (
            <div className="alert alert-error" style={{ fontSize: '0.825rem' }}>
              <AlertTriangle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username or Email</label>
              <input
                id="username"
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ background: 'var(--water-50)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.775rem', color: '#0369a1' }}>
              <strong>Demo Credentials:</strong><br />
              Username: <code>admin</code><br />
              Password: <code>Admin@123</code>
            </div>

            <button
              type="submit"
              className="btn btn-navy"
              style={{ width: '100%', padding: '11px 0' }}
              disabled={loginLoading}
            >
              {loginLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard
  const stats = dashboardData?.stats || { total: 0, pending: 0, underReview: 0, inProgress: 0, resolved: 0, highPriority: 0 };
  const charts = dashboardData?.charts || { reportsByCategory: [], reportsByLocality: [], reportsBySeverity: [] };
  const recentIncidents = dashboardData?.recentIncidents || [];

  // Filter incidents in admin table
  const filteredIncidents = recentIncidents.filter((inc) => {
    const matchesSearch = tableSearch === '' || 
      inc.incident_id.toLowerCase().includes(tableSearch.toLowerCase()) ||
      inc.area.toLowerCase().includes(tableSearch.toLowerCase()) ||
      inc.description.toLowerCase().includes(tableSearch.toLowerCase());
    const matchesStatus = tableStatus === 'All' || inc.status === tableStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container" style={{ padding: '36px 24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy-900)' }}>
              Municipal Incident Command
            </h1>
            <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
              Admin Active
            </span>
          </div>
          <p style={{ color: 'var(--grey-500)', fontSize: '0.9rem' }}>
            Logged in as <strong>{adminUser?.username || 'admin'}</strong> ({adminUser?.email || 'admin@aquaalert.gov'}).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={handleTriggerBackup}
            disabled={backupLoading}
            style={{ fontSize: '0.85rem' }}
            title="Export full database records to S3 or local archival JSON"
          >
            <DownloadCloud size={15} />
            {backupLoading ? 'Archiving...' : 'Export Archival Backup'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={loadDashboard}
            disabled={loading}
            style={{ fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            className="btn btn-navy"
            onClick={handleLogout}
            style={{ fontSize: '0.85rem' }}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div className="card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '0.775rem', color: 'var(--grey-500)', fontWeight: 600, textTransform: 'uppercase' }}>Total Reports</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy-900)', marginTop: '4px' }}>{stats.total}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--grey-400)' }}>Aggregated records</span>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '0.775rem', color: 'var(--grey-500)', fontWeight: 600, textTransform: 'uppercase' }}>Reported / Pending</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--status-reported-text)', marginTop: '4px' }}>{stats.pending}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--grey-400)' }}>Awaiting action</span>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '0.775rem', color: 'var(--grey-500)', fontWeight: 600, textTransform: 'uppercase' }}>Under Review</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--status-under-review-text)', marginTop: '4px' }}>{stats.underReview}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--grey-400)' }}>Assigned for inspection</span>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '0.775rem', color: 'var(--grey-500)', fontWeight: 600, textTransform: 'uppercase' }}>In Progress</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--status-in-progress-text)', marginTop: '4px' }}>{stats.inProgress}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--grey-400)' }}>Field repair active</span>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '0.775rem', color: 'var(--grey-500)', fontWeight: 600, textTransform: 'uppercase' }}>Resolved</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--status-resolved-text)', marginTop: '4px' }}>{stats.resolved}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--grey-400)' }}>Water restored</span>
        </div>

        <div className="card" style={{ padding: '18px', background: '#fff5f5', border: '1px solid #fed7d7' }}>
          <span style={{ fontSize: '0.775rem', color: '#991b1b', fontWeight: 600, textTransform: 'uppercase' }}>High / Critical Priority</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>{stats.highPriority}</h3>
          <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>Immediate intervention</span>
        </div>
      </div>

      {/* Analytics Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {/* Reports by Locality */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--navy-900)', marginBottom: '16px' }}>
            Disruption Reports by Locality (Top Areas)
          </h3>
          <div style={{ height: 260, width: '100%' }}>
            {charts.reportsByLocality && charts.reportsByLocality.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.reportsByLocality} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--water-600)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--grey-400)', textAlign: 'center', paddingTop: '80px' }}>No area data yet.</p>
            )}
          </div>
        </div>

        {/* Reports by Category */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--navy-900)', marginBottom: '16px' }}>
            Reports by Issue Category
          </h3>
          <div style={{ height: 260, width: '100%' }}>
            {charts.reportsByCategory && charts.reportsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.reportsByCategory}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label
                  >
                    {charts.reportsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--grey-400)', textAlign: 'center', paddingTop: '80px' }}>No category data yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Incident Management Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy-900)' }}>
              Reported Incident Administration
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--grey-500)', marginTop: '2px' }}>
              Inspect citizen photos, update resolution progression, and publish official notes.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--grey-400)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '32px', fontSize: '0.85rem', width: '220px' }}
                placeholder="Filter table..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              style={{ fontSize: '0.85rem', width: '140px' }}
              value={tableStatus}
              onChange={(e) => setTableStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="Under Review">Under Review</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Locality / Area</th>
                <th>Issue Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Photo</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--grey-400)' }}>
                    No incident records matched your query.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => (
                  <tr key={incident.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--water-600)' }}>
                        {incident.incident_id}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: 'var(--navy-900)' }}>
                        {incident.area}
                      </span>
                    </td>
                    <td>{incident.issue_type}</td>
                    <td>
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td>
                      <StatusBadge status={incident.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--grey-500)' }}>
                        {new Date(incident.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      {incident.photo_key ? (
                        <button
                          onClick={() => setActiveModalIncident(incident)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--water-600)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 500
                          }}
                        >
                          <ImageIcon size={14} /> View
                        </button>
                      ) : (
                        <span style={{ color: 'var(--grey-400)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                          onClick={() => setActiveModalIncident(incident)}
                          title="View complete incident details"
                        >
                          <Eye size={13} /> Details
                        </button>

                        <button
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                          onClick={() => openUpdateModal(incident)}
                        >
                          <Edit3 size={13} /> Update Status
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Detail Modal */}
      {activeModalIncident && (
        <IncidentDetailModal
          incident={activeModalIncident}
          onClose={() => setActiveModalIncident(null)}
        />
      )}

      {/* Update Status / Resolution Modal */}
      {updatingIncident && (
        <div className="modal-overlay" onClick={() => setUpdatingIncident(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                  Update Incident {updatingIncident.incident_id}
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--grey-500)' }}>
                  {updatingIncident.area}
                </p>
              </div>
              <button
                onClick={() => setUpdatingIncident(null)}
                style={{ background: 'none', border: 'none', color: 'var(--grey-400)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit}>
              <div className="form-group">
                <label className="form-label">Incident Status</label>
                <select
                  className="form-select"
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  required
                >
                  <option value="Reported">Reported</option>
                  <option value="Under Review">Under Review</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Severity Level</label>
                <select
                  className="form-select"
                  value={updateSeverity}
                  onChange={(e) => setUpdateSeverity(e.target.value)}
                  required
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Administrative Resolution Note</label>
                <textarea
                  className="form-textarea"
                  placeholder="Provide field status: e.g., 'Emergency welding crew dispatched to main pipe valve.' or 'Main supply line restored, pressure stabilized at 3.2 bar.'"
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  rows={4}
                />
                <span className="form-hint">This update will be visible to citizens tracking the incident.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setUpdatingIncident(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updateLoading}
                >
                  {updateLoading ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

