import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBT-PLZZv9mc_nb6jrJkajwCiR-Lc3N_Bg",
    authDomain: "recnacc-inventory-portal-55bcd.firebaseapp.com",
    projectId: "recnacc-inventory-portal-55bcd",
    storageBucket: "recnacc-inventory-portal-55bcd.firebasestorage.app",
    messagingSenderId: "469539909580",
    appId: "1:469539909580:web:3903b9af37cc767ae33769",
    measurementId: "G-R9NV7VVEGS"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);