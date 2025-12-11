import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange } from '../services/auth';

/**
 * React hook for Firebase Authentication state
 *
 * @example
 * function MyComponent() {
 *   const { user, loading } = useAuth();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (!user) return <div>Please sign in</div>;
 *
 *   return <div>Welcome, {user.displayName}!</div>;
 * }
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return {
    user,
    loading,
    isAuthenticated: user !== null,
    uid: user?.uid,
  };
}
