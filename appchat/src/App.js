// App.js - phần useEffect
useEffect(() => {
    let isMounted = true;
    let initTimeout;

    const initialize = () => {
        if (!isMounted) return;

        // Lấy URL từ biến môi trường
        const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;

        if (!wsUrl) {
            console.error('❌ REACT_APP_WEBSOCKET_URL không được cấu hình');
            if (window.location.hostname === 'localhost') {
                console.log('📝 Development mode: sử dụng localhost');
                initializeSocket('ws://localhost:8080/chat');
            } else {
                // Production: dùng URL mặc định
                console.log('📝 Production mode: sử dụng default URL');
                initializeSocket('wss://serverchat.up.railway.app/chat');
            }
        } else {
            console.log('🔌 Khởi tạo WebSocket với URL:', wsUrl);
            initializeSocket(wsUrl);
        }

        // Kiểm tra Firebase
        checkFirebaseConnection();
    };

    // Delay nhẹ để tránh race condition
    initTimeout = setTimeout(initialize, 100);

    // Cleanup
    return () => {
        isMounted = false;
        clearTimeout(initTimeout);
        console.log('App unmount - giữ nguyên WebSocket connection');
    };
}, []); // Chạy 1 lần duy nhất