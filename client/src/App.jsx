import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Splash from './pages/Splash.jsx';
import Welcome from './pages/Welcome.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Home from './pages/Home.jsx';
import MyDog from './pages/MyDog.jsx';
import Adoption from './pages/Adoption.jsx';
import Helpline from './pages/Helpline.jsx';
import SoundDetection from './pages/SoundDetection.jsx';
import DistressDetection from './pages/DistressDetection.jsx';
import Support from './pages/Support.jsx';
import Chatbot from './pages/Chatbot.jsx';
import Awareness from './pages/Awareness.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <Routes>
      {/* ── Entry flow: Splash → Welcome → Home ── */}
      <Route path="/"        element={<Splash />} />
      <Route path="/welcome" element={<Welcome />} />

      {/* ── Full auth routes (optional, for power users) ── */}
      <Route path="/login"          element={<Login />} />
      <Route path="/register"       element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* ── Main app — ALL pages freely accessible after Welcome login ──
            Only /admin is behind RequireAuth (needs real account + admin role).
            Every other route is open to both guests and full-account users.    */}
      <Route element={<Layout />}>
        <Route path="/home"               element={<Home />} />
        <Route path="/my-dog"             element={<MyDog />} />
        <Route path="/chatbot"            element={<Chatbot />} />
        <Route path="/adoption"           element={<Adoption />} />
        <Route path="/helpline"           element={<Helpline />} />
        <Route path="/sound-detection"    element={<SoundDetection />} />
        <Route path="/distress-detection" element={<DistressDetection />} />
        <Route path="/support"            element={<Support />} />
        <Route path="/awareness"          element={<Awareness />} />
        <Route path="/dashboard"          element={<Dashboard />} />
        {/* Admin: real account + admin role required */}
        <Route path="/admin" element={<RequireAuth adminOnly><Admin /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  );
}
