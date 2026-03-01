// src/App.js
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import Login from "./components/Authentication/login";
import Home from "./components/home";
import Register from "./components/Authentication/Register";
import Sidebar from "./components/Chat/sidebar/sidebar";
import { get, child, ref, getDatabase } from "firebase/database";
import React, { Fragment, useEffect, useState } from 'react';
import { initializeSocket } from "./socket/socket";
import ChatTab from "./components/Chat/sidebar/sidebarContent/chattab";
import ChatBox from "./components/Chat/chat";
import ChatContent from "./components/Chat/content/chatcontent/chatcontent";
import ChatHeader from "./components/Chat/content/chatheader/chatheader";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import ProtectedRoute from './utils/protected-route';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Kiểm tra biến môi trường
const validateFirebaseConfig = () => {
    const requiredKeys = [
        'apiKey', 'authDomain', 'databaseURL', 'projectId',
        'storageBucket', 'messagingSenderId', 'appId'
    ];

    const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

    if (missingKeys.length > 0) {
        console.error('❌ Missing Firebase configuration keys:', missingKeys);
        return false;
    }
    return true;
};

// Initialize Firebase
let app;
let analytics;
let database;

if (validateFirebaseConfig()) {
    try {
        app = initializeApp(firebaseConfig);
        analytics = getAnalytics(app);
        database = getDatabase(app);
        console.log('✅ Firebase initialized successfully');
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
    }
}

function checkFirebaseConnection() {
    if (!database) {
        console.error('❌ Firebase database not initialized');
        return;
    }

    const dbRef = ref(database);
    get(child(dbRef, 'test')).then((snapshot) => {
        if (snapshot.exists()) {
            console.log('✅ Firebase connection successful:', snapshot.val());
        } else {
            console.log('ℹ️ No data available at test path');
        }
    }).catch((error) => {
        console.error('❌ Firebase connection error:', error);
    });
}

function App() {
    const [wsConnected, setWsConnected] = useState(false);
    const [initDone, setInitDone] = useState(false);

    useEffect(() => {
        // Chỉ khởi tạo WebSocket một lần duy nhất
        if (!initDone) {
            const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;

            if (!wsUrl) {
                console.error('❌ REACT_APP_WEBSOCKET_URL không được cấu hình trong .env');
                if (window.location.hostname === 'localhost') {
                    console.log('📝 Development mode: sử dụng localhost');
                    initializeSocket('ws://localhost:8080/chat');
                } else {
                    console.error('❌ Không thể kết nối WebSocket: thiếu URL');
                }
            } else {
                console.log('🔌 Khởi tạo WebSocket với URL:', wsUrl);
                initializeSocket(wsUrl);
                setWsConnected(true);
            }

            // Kiểm tra Firebase
            checkFirebaseConnection();
            setInitDone(true);
        }

        // Cleanup khi unmount - KHÔNG đóng socket
        return () => {
            console.log('App unmount - giữ nguyên WebSocket connection');
        };
    }, [initDone]);

    return (
        <Fragment>
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/Login" replace />} />
                    <Route path="/Login" element={<Login />} />
                    <Route element={<ProtectedRoute />}>
                        <Route path="/Home" element={<Home />}>
                            <Route path=":type/:name" element={
                                <>
                                    <ChatHeader />
                                    <ChatContent />
                                </>
                            } />
                        </Route>
                    </Route>
                    <Route path="/Register" element={<Register />} />
                    <Route path="/Sidebar" element={<Sidebar />} />
                    <Route path="/ChatTab" element={<ChatTab />} />
                </Routes>
            </BrowserRouter>
        </Fragment>
    );
}

export default App;