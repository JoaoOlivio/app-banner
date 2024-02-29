import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { addDoc, collection, doc, getDocs, getFirestore, query, getDoc, where, setDoc } from 'firebase/firestore'
import { config } from './config';
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from 'firebase/auth';

// Initialize Firebase
const app = initializeApp(config);
const storage = getStorage(app);
const auth = getAuth(app);
const db = getFirestore(app);



export {
  db,
  auth,
  storage,
};
