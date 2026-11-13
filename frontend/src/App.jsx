import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import ReportIssuePage from './pages/ReportIssuePage';
import TrackingPage from './pages/TrackingPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

export default function App() {
  const [activePage, setActivePage] = useState('landing');
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  const clearSelected = () => {
    setSelectedIncidentId(null);
  };

  return (
    <div className="app-container">
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      <main className="main-content">
        {activePage === 'landing' && (
          <LandingPage
            setActivePage={setActivePage}
            setSelectedIncidentId={setSelectedIncidentId}
          />
        )}

        {activePage === 'report' && (
          <ReportIssuePage
            setActivePage={setActivePage}
            setSelectedIncidentId={setSelectedIncidentId}
          />
        )}

        {activePage === 'tracking' && (
          <TrackingPage
            preselectedIncidentId={selectedIncidentId}
            clearPreselected={clearSelected}
          />
        )}

        {activePage === 'admin' && (
          <AdminDashboardPage />
        )}
      </main>

      <Footer />
    </div>
  );
}

