import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import attendanceDB from '../services/attendanceDB';

const AuthContext = createContext(null);

/**
 * Safely inspect JWT expiry without relying on external libraries
 * @param {string} jwtToken
 * @returns {boolean} True if expired or invalid
 */
function isTokenExpired(jwtToken) {
  if (!jwtToken || typeof jwtToken !== 'string') return true;
  try {
    const parts = jwtToken.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Expired if current time has passed payload expiration (with 10-second leeway)
    return payload.exp * 1000 <= Date.now() + 10000;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      const stored = localStorage.getItem('token');
      if (stored && !isTokenExpired(stored)) {
        return stored;
      }
      if (stored) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      return null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const storedToken = localStorage.getItem('token');
      if (!storedToken || isTokenExpired(storedToken)) return null;
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Validate and rehydrate session on application start
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        if (isTokenExpired(storedToken)) {
          logout();
          setLoading(false);
          return;
        }

        try {
          const data = await authService.getMe();
          if (data?.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        } catch (err) {
          const status = err.response?.status;
          if (status === 401 || status === 403) {
            console.warn('Session expired or invalidated by server');
            logout();
          } else {
            // Network error / server restarting — retain cached session
            console.warn('Backend verification unreachable, preserving cached session');
          }
        }
      } else {
        // No stored token
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    if (data.token && data.user) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  };

  const logout = () => {
    if (user?._id) {
      attendanceDB.clearUserData(user._id).catch(() => {});
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isCoach = user?.role === 'coach';

  /**
   * Check if current user has a specific permission
   * Super Admins implicitly possess all permissions
   */
  const hasPermission = (permissionName) => {
    if (isSuperAdmin) return true;
    return !!user?.permissions?.[permissionName];
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isSuperAdmin,
    isCoach,
    hasPermission,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
