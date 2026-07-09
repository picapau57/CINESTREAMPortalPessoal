import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "splendid-yeti-137722",
  appId: "1:3132035455:web:5890e372aac390e1a80a4a",
  apiKey: "AIzaSyDI4PfWuC1VeHPdhxYbnMO8JQ3MK0vtS-M",
  authDomain: "splendid-yeti-137722.firebaseapp.com",
  storageBucket: "splendid-yeti-137722.firebasestorage.app",
  messagingSenderId: "3132035455"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-streamingpessoal-56619329-ceff-479b-b441-515a4c0750e5");

// Collection References
export const mediaCollectionRef = collection(db, 'media_items');
export const progressCollectionRef = collection(db, 'playback_progress');
