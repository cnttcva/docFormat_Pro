// File: src/services/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyARGQHdqyTdYF2RYXayASe0-QmoEOT693Y",
  authDomain: "giasutoanchuvanan.firebaseapp.com",
  projectId: "giasutoanchuvanan",
  storageBucket: "giasutoanchuvanan.firebasestorage.app",
  messagingSenderId: "844856969679",
  appId: "1:844856969679:web:a336cbaad52bc4ecf72aba"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);