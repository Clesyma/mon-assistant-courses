import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAfGQ9mfa3FOLCvrLy1PjygY68owvS9tlQ",
    authDomain: "mon-assistant-courses.firebaseapp.com",
    projectId: "mon-assistant-courses",
    storageBucket: "mon-assistant-courses.firebasestorage.app",
    messagingSenderId: "991178091919",
    appId: "1:991178091919:web:e03606f4f9de2ae9162ffa",
    measurementId: "G-N4WFHJL5QW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
const db = getFirestore(app);

export { auth, db };