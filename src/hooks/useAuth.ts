
"use client";

import { useState, useEffect } from 'react';
// import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
// import { firebaseApp } from '@/lib/firebase/client'; // Assuming you have a client firebase init

// const auth = getAuth(firebaseApp);

export function useAuth() {
  // const [user, setUser] = useState<User | null>(null);
  const [user, setUser] = useState<any | null>(null); // Using any for mock
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    //   setUser(currentUser);
    //   setLoading(false);
    // });
    // return () => unsubscribe();
    
    // Mock auth state
    setTimeout(() => {
      // setUser({ uid: 'mockUserId', email: 'user@example.com' }); // Simulate logged in
      setUser(null); // Simulate logged out
      setLoading(false);
    }, 1000);
  }, []);

  return { user, loading };
}
