// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, set, push, child,get, onValue, query, orderByChild, equalTo, off } from "firebase/database";
import { getStorage, ref as storageRef, listAll, uploadBytes, getDownloadURL } from "firebase/storage"; // Import Firebase Storage functions

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//     apiKey: "AIzaSyDwplCXmmoBcfvUhKX1a50Zzn1mQ4F45xw",
//     authDomain: "appchat-frontend.firebaseapp.com",
//     databaseURL: "https://appchat-frontend-default-rtdb.firebaseio.com",
//     projectId: "appchat-frontend",
//     storageBucket: "appchat-frontend.appspot.com",
//     messagingSenderId: "494767959162",
//     appId: "1:494767959162:web:ce7639451c7afcfc64dfc3",
//     measurementId: "G-9TKZ7BPTB6"
// };
const firebaseConfig = {
    apiKey: "AIzaSyCxc3pKK3YEFWp1dmo18aW_v6QoHZjClzM",
    authDomain: "appchat-d2ddd.firebaseapp.com",
    databaseURL: "https://appchat-d2ddd-default-rtdb.firebaseio.com",
    projectId: "appchat-d2ddd",
    storageBucket: "appchat-d2ddd.appspot.com",
    messagingSenderId: "87141689413",
    appId: "1:87141689413:web:d0750605547247948a1b2c",
    measurementId: "G-G8BHWR5C3R"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const storage = getStorage(app);


export { app, analytics, database, ref, set, push, child, get, onValue, query, orderByChild, equalTo, off, storage, storageRef, uploadBytes, getDownloadURL,listAll };