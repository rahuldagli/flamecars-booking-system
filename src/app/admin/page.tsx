'use client';

import { useState, useEffect } from 'react';
import { DriverApplication, DocumentType, REQUIRED_DOCUMENTS_CONFIG } from '@/types/onboarding';

interface StaffUser {
  name: string;
  email: string;
  role: string;
}

export default function AdminDashboardPage() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Dashboard states
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<DriverApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Document modal preview
  const [inspectDocType, setInspectDocType] = useState<DocumentType | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Check authentication on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const savedToken = typeof window !== 'undefined' ? localStorage.getItem('fc_staff_token') : null;
        const res = await fetch('/api/admin/me', {
          headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : {},
        });
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
          loadApplications();
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkSession();
  }, []);

  // Handle Staff Login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both staff email and password.');
      return;
    }

    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== 'undefined' && data.token) {
          localStorage.setItem('fc_staff_token', data.token);
        }
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        loadApplications();
      } else {
        setLoginError(data.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch {
      setLoginError('Connection error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  }

  // Handle Staff Logout
  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fc_staff_token');
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedApp(null);
  }

  // Load applications
  async function loadApplications() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/applications');
      const data = await res.json();
      if (res.ok) {
        setApplications(data.applications || []);
        if (data.applications?.length === 0) {
          seedDemoDriver();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Seed demo applicant for testing compliance review immediately
  async function seedDemoDriver() {
    const demoApp: DriverApplication = {
      id: 'demo_101',
      referenceNumber: 'FLM-DRV-2026-1001',
      status: 'SUBMITTED',
      currentStep: 5,
      updatedAt: new Date().toISOString(),
      legalName: 'Tariq Mahmood',
      mobileNumber: '07700900542',
      isMobileVerified: true,
      email: 'tariq.mahmood@example.com',
      residentialAddress: '42 Station Road, Harrow',
      postcode: 'HA1 2TY',
      tflDriverBadgeNum: '089421',
      tflDriverBadgeExpiry: '2027-08-15',
      vrm: 'LM71 XKD',
      make: 'Mercedes-Benz',
      model: 'E220d AMG Line',
      colour: 'Obsidian Black',
      year: '2022',
      passengerSeats: 4,
      tflPhvVehicleLicence: '49281',
      tflPhvVehicleExpiry: '2027-06-30',
      vehicleCategory: 'Executive',
      preferredAirports: ['Heathrow Airport (LHR)', 'Gatwick Airport (LGW)'],
      operatingZones: ['West London / Harrow', 'Central London'],
      termsAccepted: true,
      signatureDataUrl: 'Tariq Mahmood',
      consentAccuracy: true,
      tflRegisterVerified: false,
      tbmsSyncStatus: 'NOT_SYNCED',
      documents: {
        TFL_PHV_DRIVER_BADGE_FRONT: {
          id: 'doc_1',
          type: 'TFL_PHV_DRIVER_BADGE_FRONT',
          title: 'TfL PHV Driver Badge (Front)',
          filename: 'tfl_badge_front.jpg',
          fileSize: 450000,
          mimeType: 'image/jpeg',
          dataUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
          expiryDate: '2027-08-15',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
          aiExtractedData: {
            confidence: 0.97,
            fullName: 'Tariq Mahmood',
            licenceNumber: '089421',
            expiryDate: '2027-08-15',
            summary: 'TfL PHV Driver Badge #089421 identified for Tariq Mahmood. Expiry: 15/08/2027.',
          },
        },
        TFL_PHV_DRIVER_BADGE_BACK: {
          id: 'doc_2',
          type: 'TFL_PHV_DRIVER_BADGE_BACK',
          title: 'TfL PHV Driver Badge (Back)',
          filename: 'tfl_badge_back.jpg',
          fileSize: 380000,
          mimeType: 'image/jpeg',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        },
        DVLA_DRIVING_LICENCE_FRONT: {
          id: 'doc_3',
          type: 'DVLA_DRIVING_LICENCE_FRONT',
          title: 'DVLA Driving Licence (Front)',
          filename: 'dvla_licence.jpg',
          fileSize: 520000,
          mimeType: 'image/jpeg',
          dataUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=600&auto=format&fit=crop&q=80',
          expiryDate: '2030-05-12',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        },
        DVLA_DRIVING_LICENCE_BACK: {
          id: 'doc_4',
          type: 'DVLA_DRIVING_LICENCE_BACK',
          title: 'DVLA Driving Licence (Back)',
          filename: 'dvla_back.jpg',
          fileSize: 310000,
          mimeType: 'image/jpeg',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        },
        TFL_PHV_VEHICLE_LICENCE: {
          id: 'doc_5',
          type: 'TFL_PHV_VEHICLE_LICENCE',
          title: 'TfL PHV Vehicle Licence Disc',
          filename: 'vehicle_phv_disc.jpg',
          fileSize: 600000,
          mimeType: 'image/jpeg',
          expiryDate: '2027-06-30',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        },
        HIRE_REWARD_INSURANCE: {
          id: 'doc_6',
          type: 'HIRE_REWARD_INSURANCE',
          title: 'Hire & Reward Insurance Certificate',
          filename: 'flame_cars_insurance.pdf',
          fileSize: 1200000,
          mimeType: 'application/pdf',
          expiryDate: '2027-04-10',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        },
        MOT_CERTIFICATE: {
          id: 'doc_7',
          type: 'MOT_CERTIFICATE',
          title: 'MOT Certificate',
          filename: 'mot_2026.pdf',
          fileSize: 240000,
          mimeType: 'application/pdf',
          expiryDate: '2027-03-20',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        },
        V5C_LOGBOOK: null,
      },
    };

    await fetch('/api/onboarding/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(demoApp),
    });
    loadApplications();
  }

  // Handle Document Approval / Rejection
  async function handleDocReview(docType: DocumentType, action: 'APPROVE' | 'REJECT', reason?: string) {
    if (!selectedApp) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: selectedApp.id,
          docType,
          action,
          reason,
        }),
      });
      const resData = await res.json();
      if (res.ok) {
        setSelectedApp(resData.application);
        setApplications((prev) => prev.map((a) => (a.id === selectedApp.id ? resData.application : a)));
        setInspectDocType(null);
        setRejectReason('');
        setActionMessage({ text: `Document successfully ${action.toLowerCase()}d`, type: 'success' });
      } else {
        setActionMessage({ text: resData.error || 'Failed to update document', type: 'error' });
      }
    } catch {
      setActionMessage({ text: 'Error communicating with server', type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 3500);
    }
  }

  // Handle Gated TBMS Sync
  async function handleTbmsSync(appId: string) {
    setActionLoading(true);
    setActionMessage({ text: 'Syncing driver with TBMS server (CreateDriver.php)...', type: 'success' });

    try {
      const res = await fetch('/api/admin/tbms-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, forceSync: true }),
      });
      const data = await res.json();

      if (res.ok) {
        setSelectedApp(data.application);
        setApplications((prev) => prev.map((a) => (a.id === appId ? data.application : a)));
        setActionMessage({
          text: `Success! Driver is now ACTIVE in TBMS (ID: ${data.application.tbmsDriverId})`,
          type: 'success',
        });
      } else {
        setActionMessage({ text: data.error || 'TBMS sync error', type: 'error' });
      }
    } catch {
      setActionMessage({ text: 'TBMS integration call failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  // Filtered List
  const filteredApps = applications.filter((app) => {
    if (filterStatus !== 'ALL' && app.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.legalName?.toLowerCase().includes(q);
      const matchMobile = app.mobileNumber?.includes(q);
      const matchVrm = app.vrm?.toLowerCase().includes(q);
      const matchRef = app.referenceNumber?.toLowerCase().includes(q);
      return matchName || matchMobile || matchVrm || matchRef;
    }
    return true;
  });

  // 1. Loading State while checking authentication
  if (isAuthenticated === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--flame-400)', fontSize: '15px' }}>Verifying Staff Session...</div>
      </div>
    );
  }

  // 2. Unauthenticated: Render Staff Portal Login Form
  if (!isAuthenticated) {
    return (
      <div className="container" style={{ paddingTop: '60px', maxWidth: '440px' }}>
        <div className="glass-panel animate-fade-in" style={{ padding: '36px 30px', borderRadius: 'var(--radius-xl)' }}>
          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: 'var(--flame-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto',
                boxShadow: 'var(--flame-glow)',
              }}
            >
              <span style={{ fontSize: '28px' }}>🔥</span>
            </div>
            <h1 style={{ fontSize: '24px', marginBottom: '6px' }}>Staff & Compliance Portal</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Restricted access for Flame Cars operations and compliance officers.
            </p>
          </div>

          {loginError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                fontSize: '13px',
                marginBottom: '20px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Staff Email Address
              </label>
              <input
                type="email"
                placeholder="admin@flamecars.co.uk"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', color: 'var(--flame-400)', fontSize: '12px', border: 'none' }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            >
              {loginLoading ? 'Signing In...' : 'Sign In to Staff Portal &rarr;'}
            </button>
          </form>

          {/* Quick Demo Helper Box */}
          <div
            style={{
              marginTop: '24px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px dashed rgba(245, 158, 11, 0.35)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, color: 'var(--flame-400)' }}>🔑 Configured Credentials (.env.local)</span>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('admin@flamecars.co.uk');
                  setLoginPassword('FlameCars#Admin2026!Sec');
                }}
                style={{
                  background: 'transparent',
                  color: 'var(--flame-400)',
                  textDecoration: 'underline',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                Auto-fill
              </button>
            </div>
            <div>Email: <strong style={{ color: '#fff' }}>admin@flamecars.co.uk</strong></div>
            <div>Password: <strong style={{ color: '#fff' }}>FlameCars#Admin2026!Sec</strong></div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated: Render Full Dashboard
  return (
    <div className="container" style={{ paddingTop: '24px', maxWidth: '1100px' }}>
      {/* Top Staff Auth Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <span>👤</span>
          <span>
            Signed in as: <strong style={{ color: '#fff' }}>{currentUser?.email || 'admin@flamecars.co.uk'}</strong>
          </span>
          <span className="badge badge-approved" style={{ fontSize: '10px', padding: '2px 8px' }}>
            {currentUser?.role || 'SUPER_ADMIN'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--danger)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Main Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Compliance & Onboarding Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Flame Cars Operator Internal Review &bull; TBMS Dispatch Adapter
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadApplications} className="btn-secondary" style={{ fontSize: '13px', padding: '8px 14px' }}>
            🔄 Refresh
          </button>
          <button onClick={seedDemoDriver} className="btn-secondary" style={{ fontSize: '13px', padding: '8px 14px' }}>
            + Seed Test Applicant
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            background: actionMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: actionMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '18px',
            border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          }}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>TOTAL APPLICANTS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{applications.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '12px', color: 'var(--info)' }}>SUBMITTED</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--info)', marginTop: '4px' }}>
            {applications.filter((a) => a.status === 'SUBMITTED').length}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '12px', color: 'var(--warning)' }}>ACTION REQUIRED</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--warning)', marginTop: '4px' }}>
            {applications.filter((a) => a.status === 'ACTION_REQUIRED').length}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '12px', color: 'var(--success)' }}>DISPATCH ACTIVE</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
            {applications.filter((a) => a.status === 'ACTIVE').length}
          </div>
        </div>
      </div>

      {/* Main Content Layout: List on Left, Detail on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedApp ? '1fr 1.4fr' : '1fr', gap: '20px' }}>
        {/* Applications List */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
          {/* Search & Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search by name, VRM, phone, or FLM ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '13px', padding: '10px 12px' }}
            />

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['ALL', 'SUBMITTED', 'ACTION_REQUIRED', 'ACTIVE'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className="btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    background: filterStatus === st ? 'var(--flame-gradient)' : undefined,
                    color: filterStatus === st ? '#fff' : undefined,
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* List Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '600px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading records...</div>
            ) : filteredApps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No applications match.</div>
            ) : (
              filteredApps.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-tertiary)',
                      border: isSelected ? '2px solid var(--flame-500)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{app.legalName || 'Draft Applicant'}</div>
                      <span className={`badge badge-${app.status.toLowerCase().replace('_', '-')}`} style={{ fontSize: '10px' }}>
                        {app.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                      <span>Ref: {app.referenceNumber || 'N/A'}</span>
                      <span>VRM: {app.vrm || 'N/A'}</span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Badge: {app.tflDriverBadgeNum || 'N/A'} &bull; Tel: {app.mobileNumber || 'N/A'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Application Details & Document Review */}
        {selectedApp && (
          <div className="glass-panel animate-fade-in" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            {/* Top Bar with TBMS Sync Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '20px' }}>{selectedApp.legalName}</h3>
                  <span className={`badge badge-${selectedApp.status.toLowerCase().replace('_', '-')}`}>
                    {selectedApp.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Reference: <strong>{selectedApp.referenceNumber}</strong> &bull; Submitted: {selectedApp.submittedAt ? new Date(selectedApp.submittedAt).toLocaleDateString() : 'Draft'}
                </div>
              </div>

              {/* Gated TBMS Sync Button */}
              <div>
                {selectedApp.status === 'ACTIVE' ? (
                  <div className="badge badge-active" style={{ padding: '8px 14px', fontSize: '12px' }}>
                    ✓ TBMS Active ({selectedApp.tbmsDriverId})
                  </div>
                ) : (
                  <button
                    onClick={() => handleTbmsSync(selectedApp.id)}
                    disabled={actionLoading}
                    className="btn-primary"
                    style={{ fontSize: '13px', padding: '10px 18px' }}
                  >
                    ⚡ Sync to TBMS Dispatch
                  </button>
                )}
              </div>
            </div>

            {/* Applicant Summary Accordion */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '13px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 600, color: 'var(--flame-400)', marginBottom: '4px' }}>Driver Details</div>
                <div>Phone: <strong>{selectedApp.mobileNumber}</strong></div>
                <div>Email: {selectedApp.email}</div>
                <div>Address: {selectedApp.residentialAddress}, {selectedApp.postcode}</div>
                <div>TfL Badge: <strong>{selectedApp.tflDriverBadgeNum}</strong> (Exp: {selectedApp.tflDriverBadgeExpiry})</div>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 600, color: 'var(--flame-400)', marginBottom: '4px' }}>Vehicle Details</div>
                <div>VRM: <strong>{selectedApp.vrm}</strong></div>
                <div>Vehicle: {selectedApp.make} {selectedApp.model} ({selectedApp.colour})</div>
                <div>Category: {selectedApp.vehicleCategory} ({selectedApp.passengerSeats} Seats)</div>
                <div>PHV Licence: {selectedApp.tflPhvVehicleLicence} (Exp: {selectedApp.tflPhvVehicleExpiry})</div>
              </div>
            </div>

            {/* Document Verification Checklist */}
            <div>
              <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>Document Verification & Compliance Audit</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {REQUIRED_DOCUMENTS_CONFIG.map((cfg) => {
                  const doc = selectedApp.documents[cfg.type];
                  return (
                    <div
                      key={cfg.type}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{cfg.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {doc ? (
                            <>
                              File: {doc.filename} &bull; Expiry:{' '}
                              <strong style={{ color: doc.expiryDate ? '#fff' : 'var(--warning)' }}>
                                {doc.expiryDate || 'Not specified'}
                              </strong>
                            </>
                          ) : (
                            <span style={{ color: cfg.isMandatory ? 'var(--danger)' : 'var(--text-muted)' }}>
                              {cfg.isMandatory ? 'Missing Mandatory Document' : 'Optional document omitted'}
                            </span>
                          )}
                        </div>
                        {doc?.rejectionReason && (
                          <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
                            Reason: {doc.rejectionReason}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {doc ? (
                          <>
                            <span
                              className={`badge badge-${
                                doc.status === 'APPROVED' ? 'approved' : doc.status === 'REJECTED' ? 'suspended' : 'review'
                              }`}
                              style={{ fontSize: '11px' }}
                            >
                              {doc.status}
                            </span>

                            <button
                              onClick={() => {
                                setInspectDocType(cfg.type);
                                setRejectReason('');
                              }}
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                              Inspect
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Document Inspection Modal */}
      {inspectDocType && selectedApp && selectedApp.documents[inspectDocType] && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px' }}>
                Inspect: {selectedApp.documents[inspectDocType]!.title}
              </h3>
              <button
                onClick={() => setInspectDocType(null)}
                style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '22px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Document Image/Preview Viewer */}
              <div
                style={{
                  background: '#000',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '280px',
                  border: '1px solid var(--border-medium)',
                }}
              >
                {selectedApp.documents[inspectDocType]!.dataUrl ? (
                  <img
                    src={selectedApp.documents[inspectDocType]!.dataUrl}
                    alt="Document preview"
                    style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '4px' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>📄</div>
                    <div style={{ fontSize: '14px' }}>{selectedApp.documents[inspectDocType]!.filename}</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Binary PDF Document</div>
                  </div>
                )}
              </div>

              {/* Review & Action Panel */}
              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Verification Checklist</h4>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
                  <div>&bull; Name matches applicant: <strong>{selectedApp.legalName}</strong></div>
                  <div>&bull; Expiry Date entered: <strong>{selectedApp.documents[inspectDocType]!.expiryDate || 'N/A'}</strong></div>
                  <div>&bull; Document is clear, legible, and uncropped.</div>
                </div>

                {/* AI Extracted Data Card in Admin */}
                {selectedApp.documents[inspectDocType]!.aiExtractedData && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>
                      ✨ AI OCR Extracted Intelligence
                    </div>
                    {selectedApp.documents[inspectDocType]!.aiExtractedData!.summary && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {selectedApp.documents[inspectDocType]!.aiExtractedData!.summary}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                      {selectedApp.documents[inspectDocType]!.aiExtractedData!.fullName && (
                        <div>Holder: <strong>{selectedApp.documents[inspectDocType]!.aiExtractedData!.fullName}</strong></div>
                      )}
                      {selectedApp.documents[inspectDocType]!.aiExtractedData!.licenceNumber && (
                        <div>Licence/Badge #: <strong>{selectedApp.documents[inspectDocType]!.aiExtractedData!.licenceNumber}</strong></div>
                      )}
                      {selectedApp.documents[inspectDocType]!.aiExtractedData!.vrm && (
                        <div>VRM: <strong>{selectedApp.documents[inspectDocType]!.aiExtractedData!.vrm}</strong></div>
                      )}
                      {selectedApp.documents[inspectDocType]!.aiExtractedData!.expiryDate && (
                        <div>AI Expiry: <strong style={{ color: 'var(--flame-400)' }}>{selectedApp.documents[inspectDocType]!.aiExtractedData!.expiryDate}</strong></div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                    Rejection Reason (if declining)
                  </label>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{ fontSize: '12px', padding: '8px', marginBottom: '6px' }}
                  >
                    <option value="">Select predefined reason...</option>
                    <option value="Document is blurry, unreadable, or truncated">Blurry / Unreadable</option>
                    <option value="Document has expired or expiry date mismatch">Expired Document</option>
                    <option value="Name or VRM does not match application details">Name / VRM Mismatch</option>
                    <option value="Wrong document uploaded in this slot">Incorrect Document Type</option>
                    <option value="Missing reverse side of photocard or licence">Missing Reverse Side</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter custom compliance note..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{ fontSize: '12px', padding: '8px' }}
                  />
                </div>

                {/* Approve / Reject Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleDocReview(inspectDocType, 'APPROVE')}
                    disabled={actionLoading}
                    className="btn-primary"
                    style={{ flex: 1, background: 'var(--success)', padding: '10px' }}
                  >
                    ✓ Approve Document
                  </button>

                  <button
                    onClick={() => handleDocReview(inspectDocType, 'REJECT', rejectReason)}
                    disabled={actionLoading}
                    style={{
                      flex: 1,
                      background: 'var(--danger-bg)',
                      color: 'var(--danger)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      padding: '10px',
                      fontSize: '13px',
                    }}
                  >
                    ✕ Reject Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
