import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
} from '../services/firebase';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [mongoUser, setMongoUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    let active = true;
    let generation = 0;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      const current = ++generation;
      setUser(fbUser);
      setMongoUser(null);
      setLoading(false);
      if (fbUser) {
        try {
          // Sync with MongoDB backend
          const syncRes = await api.syncUser(fbUser, {
            name: fbUser.displayName || '',
            profileImage: fbUser.photoURL || '',
          });
          if (active && current === generation && syncRes?.user) {
            setMongoUser(syncRes.user);
          }
        } catch (err) {
          console.warn('[Auth Sync Note] Could not connect to backend/MongoDB:', err.message);
        }
      }
    });

    return () => { active = false; unsubscribe(); };
  }, []);

  const loginWithEmail = async (email, password) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase Authentication is not configured. Please supply Firebase credentials in frontend/.env.');
    }
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const registerWithEmail = async (email, password, name = '') => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase Authentication is not configured. Please supply Firebase credentials in frontend/.env.');
    }
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (cred.user) {
        // Trigger email verification
        try {
          await sendEmailVerification(cred.user);
        } catch (e) {
          console.warn('Could not send verification email:', e);
        }
        // Sync to MongoDB
        await api.syncUser(cred.user, { name }).catch(() => {});
      }
      return cred.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      throw new Error('Google Sign-In is unavailable because Firebase is not yet configured. Please set your Firebase credentials.');
    }
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign in was cancelled.');
      }
      setAuthError(err.message);
      throw err;
    }
  };

  const resetPassword = async (email) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase is not configured.');
    }
    setAuthError(null);
    return sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    if (auth) {
      await fbSignOut(auth);
      setUser(null);
      setMongoUser(null);
    }
  };

  const savePreferences = async preferences => {
    const response = await api.updateUserProfile(user, { preferences });
    if (response?.user) setMongoUser(response.user);
  };

  const value = {
    user,
    mongoUser,
    loading,
    authError,
    isConfigured: isFirebaseConfigured,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    resetPassword,
    savePreferences,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
