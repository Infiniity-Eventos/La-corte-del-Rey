import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDcvFyzR7BVhCe55Jkf9sGkyyv_ooGEle8",
    authDomain: "la-corte-del-rey.firebaseapp.com",
    databaseURL: "https://la-corte-del-rey-default-rtdb.firebaseio.com",
    projectId: "la-corte-del-rey",
    storageBucket: "la-corte-del-rey.firebasestorage.app",
    messagingSenderId: "982820510053",
    appId: "1:982820510053:web:6ea9ed0c164162fe45298c",
    measurementId: "G-BFYGCCFB6W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
