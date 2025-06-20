// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3cGO93l-XHyYZSsJcPaijFMRiWb2hUFg",
  authDomain: "aria-jknbu.firebaseapp.com",
  databaseURL: "https://aria-jknbu-default-rtdb.firebaseio.com",
  projectId: "aria-jknbu",
  storageBucket: "aria-jknbu.appspot.com",
  messagingSenderId: "513736262327",
  appId: "1:513736262327:web:50eae2a79832cca8bec332"
};


let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const firestore: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, firestore, storage };
