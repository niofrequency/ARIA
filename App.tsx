import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { auth } from './lib/firebase';
import { 
 getUserData, 
 createUserData, 
 incrementFreeImageCount,
 uploadMediaToStorage 
} from './services/firebaseService';
import AuthScreen from './components/AuthScreen';
import SplashScreen from './components/SplashScreen'; 
import LoadingScreen from './components/LoadingScreen'; // ✅ IMPORTED NEW LOADING SCREEN
import { UserData } from './types';
import ChatDashboard from './components/ChatDashboard';

/**
 * APP CORE ORCHESTRATOR
 * logic:
 * 1. Manages global Auth state and UserProfile hydration.
 * 2. Handles Video Persistence (Base64/Blob to Firebase Storage).
 * 3. Tracks global usage metrics (Image Generation count).
 * 4. Ensures data compatibility for the ARIA Tagging System.
 */

const App: React.FC = () => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Manage Splash Screen Visibility (Persistent per session)
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('aria_splash_seen');
    }
    return true;
  });

  // --- AUTHENTICATION & DATA SYNC ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setIsLoading(true);
      if (currentUser) {
        try {
          // Hydrate user data from Firestore
          let data = await getUserData(currentUser.uid);
          
          if (!data) {
            // New User Initialization
            data = await createUserData(currentUser.uid);
          }
          
          setUserData(data);
          setUser(currentUser);
        } catch (error) {
          console.error("❌ Critical Sync Error:", error);
          setUser(null);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleFinishSplash = () => {
    sessionStorage.setItem('aria_splash_seen', 'true');
    setShowSplash(false);
  };

  /**
   * HANDLER: Image Generation Usage Tracking
   */
  const handleImageGenerated = async () => {
    if (user && userData) {
      try {
        await incrementFreeImageCount(user.uid, userData.freeImagesUsed);
        setUserData(prev => prev ? { 
          ...prev, 
          freeImagesUsed: (prev.freeImagesUsed || 0) + 1 
        } : null);
      } catch (error) {
        console.error("Failed to update usage count:", error);
      }
    }
  };

  /**
   * HANDLER: Global Video Persistence
   * FIXED: Sanitizes blob URLs by stripping cache busters to prevent ERR_FILE_NOT_FOUND.
   */
  const handleVideoSynthesized = async (botId: string, videoData: string): Promise<string> => {
    if (!user) throw new Error("User not authenticated for video upload");
    
    try {
      console.log(`🎬 App: Archiving neural motion for bot ${botId}...`);
      
      let uploadSource = videoData;

      // Handle local Blob URLs (blob:http...) 
      if (videoData.startsWith('blob:')) {
        // --- CRITICAL FIX: STRIP CACHE BUSTER ---
        // fetch() fails on blob: URLs if they contain query parameters (?t=...)
        const sanitizedUrl = videoData.split('?')[0];
        
        const response = await fetch(sanitizedUrl);
        const blob = await response.blob();
        
        uploadSource = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      
      // Persist to Firebase Storage via the consolidated Media Service
      const permanentVideoUrl = await uploadMediaToStorage(
        user.uid, 
        botId, 
        uploadSource, 
        'video'
      );
      
      console.log("✅ App: Video archived permanently at", permanentVideoUrl);
      return permanentVideoUrl; 
    } catch (error) {
      console.error("❌ App: Video archiving failed:", error);
      return videoData; // Fallback to temp URL so UI doesn't break
    }
  };

  // --- RENDERING LOGIC ---

  if (showSplash) {
    return <SplashScreen onFinish={handleFinishSplash} />;
  }

  if (!user && !isLoading) {
    return <AuthScreen />;
  }

  // ✅ FIXED: Replaced the old static text with the new Loading Screen!
  // Loading / Initialization State (Neural Sync Overlay)
  if (isLoading || (user && !userData)) {
    return <LoadingScreen isReady={false} />;
  }

  return (
    <div className="h-[100dvh] bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      <ChatDashboard
        userData={userData!}
        onSignOut={handleSignOut}
        onImageGenerated={handleImageGenerated}
        onVideoSynthesized={handleVideoSynthesized}
      />
    </div>
  );
};

export default App;
