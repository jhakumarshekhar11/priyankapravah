// src/components/ui/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth'; // Quickest way to handle auth state
import { auth } from '../../firebase/config';

export default function ProtectedRoute({ children }) {
  const [user, loading] = useAuthState(auth);

  if (loading) return <div>Loading...</div>;
  if (!user || user.email !== "priyankas_email@gmail.com") {
    return <Navigate to="/logsig" replace />;
  }

  return children;
}