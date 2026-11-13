import React from 'react';
import { Droplet, Shield, Cloud, Server, Database } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Droplet size={20} color="var(--water-400)" />
              <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.1rem' }}>AquaAlert</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6 }}>
              A cloud-based water supply disruption reporting and tracking platform connecting citizens with municipal utility engineers for faster problem resolution.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <div>
              <h5 style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                Cloud Architecture
              </h5>
              <ul style={{ listStyle: 'none', fontSize: '0.825rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Server size={13} /> Amazon EC2 Host</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Database size={13} /> Amazon RDS MySQL</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Cloud size={13} /> Amazon S3 Secure Storage</li>
              </ul>
            </div>

            <div>
              <h5 style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                Emergency Water Helpline
              </h5>
              <p style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                Toll Free: 1800-AQUA-HELP (24x7)
              </p>
              <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '4px' }}>
                Department of Water Supply & Municipal Sanitation
              </p>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '24px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '0.775rem', color: '#64748b' }}>
          <div>
            &copy; {new Date().getFullYear()} AquaAlert. Municipal Disruption Tracking Platform.
          </div>
          <div>
            Deployment Environment: AWS VPC Public/Private Tier
          </div>
        </div>
      </div>
    </footer>
  );
}

