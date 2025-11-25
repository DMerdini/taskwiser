'use client';
import { useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { useAuth, useFirestore, useUser } from '@/firebase';

export default function useAuthentication() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
        setAppUser(null);
        setLoading(false);
        return;
    }

    if (!db) {
        setLoading(false);
        return;
    }
    
    const userDocRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
        setAppUser({ uid: doc.id, ...doc.data() } as AppUser);
        } else {
        setAppUser(null);
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching user profile:", error);
        setAppUser(null);
        setLoading(false);
    });

    return () => unsubProfile();
  }, [user, isUserLoading, db]);

  return { user, appUser, loading };
}
