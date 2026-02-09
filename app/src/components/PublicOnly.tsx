import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loading from './Loading';

type PublicOnlyProps = {
  children: ReactNode;
};

export default function PublicOnly({ children }: PublicOnlyProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (user) {
    return <Navigate to="/clients" replace />;
  }

  return <>{children}</>;
}
