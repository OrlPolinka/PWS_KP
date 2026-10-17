import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Trainers from './pages/Trainers';
import DanceStyles from './pages/DanceStyles';
import Memberships from './pages/Memberships';
import Bookings from './pages/Bookings';
import Chat from './pages/Chat';
import News from './pages/News';
import Notifications from './pages/Notifications';
import QRCode from './pages/QRCode';
import TrainerProfile from './pages/TrainerProfile';
import Recommendations from './pages/Recommendations';
import ScheduleDetails from './pages/ScheduleDetails';
import DanceStyleDetails from './pages/DanceStyleDetails';
import MembershipExtensionRequests from './pages/MembershipExtensionRequests';
import TrainerAttendance from './pages/TrainerAttendance';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Загрузка...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Загрузка...</div>;
  }
  
  if (user) {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

const RoleRoute = ({ role, children }: { role: string; children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center">Загрузка...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== role) return <Navigate to="/dashboard" />;
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="schedule/:id" element={<ScheduleDetails />} />
            <Route path="trainers" element={<Trainers />} />
            <Route path="trainers/:id" element={<TrainerProfile />} />
            <Route path="my-profile" element={<RoleRoute role="trainer"><TrainerProfile /></RoleRoute>} />
            <Route path="attendance" element={<RoleRoute role="trainer"><TrainerAttendance /></RoleRoute>} />
            <Route path="recommendations" element={<RoleRoute role="client"><Recommendations /></RoleRoute>} />
            <Route path="styles" element={<DanceStyles />} />
            <Route path="styles/:id" element={<DanceStyleDetails />} />
            <Route path="memberships" element={<Memberships />} />
            <Route path="membership-extension-requests" element={<RoleRoute role="admin"><MembershipExtensionRequests /></RoleRoute>} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="chat" element={<Chat />} />
            <Route path="news" element={<News />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="qr-code" element={<QRCode />} />
            <Route path="*" element={
              <div className="py-16 text-center">
                <h1 className="mb-3 text-2xl font-bold">Страница не найдена</h1>
                <Link to="/dashboard" className="text-primary hover:underline">Вернуться на главную</Link>
              </div>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
