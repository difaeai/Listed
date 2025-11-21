
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD1nRhJK2fUPMl-YWkU7WYb8yBsh0f3goM",
  authDomain: "salesconnect-er8hz.firebaseapp.com",
  databaseURL: "https://salesconnect-er8hz-default-rtdb.firebaseio.com",
  projectId: "salesconnect-er8hz",
  storageBucket: "salesconnect-er8hz.firebasestorage.app",
  messagingSenderId: "960371270046",
  appId: "1:960371270046:web:80fe3059c4523bd03c768f"
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { auth, db };
