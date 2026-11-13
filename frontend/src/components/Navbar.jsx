import React from 'react';
import { Droplet, AlertTriangle, Search, ShieldCheck, PlusCircle } from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({ activePage, setActivePage }) {
  const isAdmin = api.isAdminLoggedIn();
  const currentAdmin = api.getCurrentAdmin();

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <div
          className="brand-link"
          style={{ cursor: 'pointer' }}
          onClick={() => setActivePage('landing')}
        >
          <div style={{
            background: 'rgba(2, 132, 199, 0.2)',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}>
            <Droplet className="brand-icon" size={24} />
          </div>
          <div>
            <span>Aqua<span style={{ color: 'var(--water-400)' }}>Alert</span></span>
            <span style={{
              display: 'block',
              fontSize: '0.675rem',
              color: '#94a3b8',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontWeight: 500
            }}>
              Municipal Water Disruption System
            </span>
          </div>
        </div>

        <div className="nav-menu">
          <button
            className={`nav-item ${activePage === 'landing' ? 'active' : ''}`}
            onClick={() => setActivePage('landing')}
            style={{ background: 'none', border: 'none' }}
          >
            Overview
          </button>

          <button
            className={`nav-item ${activePage === 'tracking' ? 'active' : ''}`}
            onClick={() => setActivePage('tracking')}
            style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Search size={15} />
            Track Incidents
          </button>

          <button
            className={`nav-item ${activePage === 'admin' ? 'active' : ''}`}
            onClick={() => setActivePage('admin')}
            style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ShieldCheck size={15} />
            Admin Portal {isAdmin && <span style={{ width: 7, height: 7, background: '#10b981', borderRadius: '50%' }}></span>}
          </button>

          <button
            className="btn-report-nav"
            onClick={() => setActivePage('report')}
          >
            <PlusCircle size={16} />
            Report Issue
          </button>
        </div>
      </div>
    </nav>
  );
}

