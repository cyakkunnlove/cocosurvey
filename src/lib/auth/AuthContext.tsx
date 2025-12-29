"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";

import { auth } from "@/lib/firebase/client";
import {
  createOrganization,
  createUserProfile,
  getUserProfile,
} from "@/lib/firebase/surveys";
import type { UserProfile } from "@/lib/firebase/types";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, orgName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      const profile = await getUserProfile(firebaseUser.uid);
      setUser(profile);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const signUp = async (email: string, password: string, orgName: string) => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const orgId = await createOrganization(orgName, credential.user.uid);
    await createUserProfile({
      uid: credential.user.uid,
      email,
      orgId,
      orgName,
    });
    const profile = await getUserProfile(credential.user.uid);
    setUser(profile);
  };

  const signIn = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(credential.user.uid);
    if (!profile) {
      throw new Error("ユーザープロファイルが見つかりませんでした");
    }
    setUser(profile);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    loading,
    signUp,
    signIn,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
