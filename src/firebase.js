// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQqUZAw6ItjXMDcJV01vF4aLGpDDz-RnQ",
  authDomain: "skillpath-9ef04.firebaseapp.com",
  projectId: "skillpath-9ef04",
  storageBucket: "skillpath-9ef04.firebasestorage.app",
  messagingSenderId: "769488734468",
  appId: "1:769488734468:web:a45d92c49806dc0f7aa851"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);