const API_BASE = '/api';

/**
 * Helper to get Auth header
 */
function getAuthHeaders() {
  const token = localStorage.getItem('aquaalert_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Public Endpoints
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async getIncidents(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'All') params.append('status', filters.status);
    if (filters.issue_type && filters.issue_type !== 'All') params.append('issue_type', filters.issue_type);
    if (filters.severity && filters.severity !== 'All') params.append('severity', filters.severity);
    if (filters.area) params.append('area', filters.area);
    if (filters.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/incidents?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load incidents');
    return res.json();
  },

  async getIncidentById(id) {
    const res = await fetch(`${API_BASE}/incidents/${id}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Incident not found');
    }
    return res.json();
  },

  async createIncident(formData) {
    // Note: formData is a FormData object with area, issue_type, severity, description, photo
    const res = await fetch(`${API_BASE}/incidents`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit incident');
    }
    return data;
  },

  // Admin Endpoints
  async adminLogin(username, password) {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    if (data.token) {
      localStorage.setItem('aquaalert_admin_token', data.token);
      localStorage.setItem('aquaalert_admin_user', JSON.stringify(data.admin));
    }
    return data;
  },

  async getAdminDashboard() {
    const res = await fetch(`${API_BASE}/admin/dashboard`, {
      headers: { ...getAuthHeaders() }
    });
    if (res.status === 401 || res.status === 403) {
      this.adminLogout();
      throw new Error('Unauthorized or session expired');
    }
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    return res.json();
  },

  async updateIncidentStatus(id, updateData) {
    const res = await fetch(`${API_BASE}/admin/incidents/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(updateData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update incident');
    }
    return data;
  },

  async triggerBackup() {
    const res = await fetch(`${API_BASE}/admin/backup`, {
      method: 'POST',
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Backup creation failed');
    }
    return data;
  },

  adminLogout() {
    localStorage.removeItem('aquaalert_admin_token');
    localStorage.removeItem('aquaalert_admin_user');
  },

  getCurrentAdmin() {
    const raw = localStorage.getItem('aquaalert_admin_user');
    return raw ? JSON.parse(raw) : null;
  },

  isAdminLoggedIn() {
    return Boolean(localStorage.getItem('aquaalert_admin_token'));
  }
};

