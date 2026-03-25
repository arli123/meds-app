import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import Register from './pages/Register';
import Pending from './pages/Pending';
import Home from './pages/Home';
import Medications from './pages/Medications';
import Schedule from './pages/Schedule';
import History from './pages/History';
import Admin from './pages/Admin';
import Caregiver from './pages/Caregiver';
import ChangePassword from './pages/ChangePassword';
import Layout from './components/Layout';

function AppRoutes() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('SW registered', reg.scope);
        })
        .catch((err) => console.warn('SW registration failed', err));
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile(data);
    }
    setLoading(false);
  };

  if (loading || session === undefined) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#F9FAFB', direction: 'rtl',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💊</div>
          <div style={{ color: '#6B7280', fontSize: 16 }}>טוען...</div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Logged in but no profile yet (just registered)
  if (!profile) {
    return (
      <Routes>
        <Route path="/pending" element={<Pending />} />
        <Route path="*" element={<Navigate to="/pending" replace />} />
      </Routes>
    );
  }

  // Profile exists but not approved
  if (!profile.is_approved) {
    return (
      <Routes>
        <Route path="/pending" element={<Pending />} />
        <Route path="*" element={<Navigate to="/pending" replace />} />
      </Routes>
    );
  }

  // Caregiver role
  if (profile.role === 'caregiver') {
    return (
      <Routes>
        <Route path="/caregiver" element={<Layout profile={profile} onProfileUpdate={setProfile}><Caregiver profile={profile} /></Layout>} />
        <Route path="/change-password" element={<Layout profile={profile} onProfileUpdate={setProfile}><ChangePassword /></Layout>} />
        <Route path="*" element={<Navigate to="/caregiver" replace />} />
      </Routes>
    );
  }

  // Regular user or admin
  return (
    <Routes>
      <Route path="/" element={<Layout profile={profile} onProfileUpdate={setProfile}><Home profile={profile} /></Layout>} />
      <Route path="/medications" element={<Layout profile={profile} onProfileUpdate={setProfile}><Medications profile={profile} /></Layout>} />
      <Route path="/schedule" element={<Layout profile={profile} onProfileUpdate={setProfile}><Schedule profile={profile} /></Layout>} />
      <Route path="/history" element={<Layout profile={profile} onProfileUpdate={setProfile}><History profile={profile} /></Layout>} />
      {profile.is_admin && (
        <Route path="/admin" element={<Layout profile={profile} onProfileUpdate={setProfile}><Admin profile={profile} /></Layout>} />
      )}
      <Route path="/change-password" element={<Layout profile={profile} onProfileUpdate={setProfile}><ChangePassword /></Layout>} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
