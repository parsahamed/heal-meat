import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedLayout from './components/ProtectedLayout';
import PublicOnly from './components/PublicOnly';
import LoginPage from './pages/LoginPage';
import PlannerPage from './pages/PlannerPage';
import IncomePage from './pages/IncomePage';
import ClientsListPage from './pages/ClientsListPage';
import ClientNewPage from './pages/ClientNewPage';
import ClientDetailPage from './pages/ClientDetailPage';
import ClientEditPage from './pages/ClientEditPage';

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<PlannerPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/income" element={<IncomePage />} />
        <Route path="/clients" element={<ClientsListPage />} />
        <Route path="/clients/new" element={<ClientNewPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/clients/:id/edit" element={<ClientEditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
