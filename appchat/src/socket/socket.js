// src/socket/socket.js
import store from "../redux/store/store";
import { toast } from 'react-toastify';
import {
    createRoomSuccess,
    createRoomError,
    loginSuccess,
    loginError,
    reLoginSuccess,
    reLoginError,
    logoutSuccess,
    logoutError,
    getUserListSuccess,
    getUserListFailure,
    registerSuccess,
    registerError,
    getPeopleChatMesSuccess,
    getPeopleChatMesFailure,
    joinRoomSuccess,
    joinRoomFailure,
    checkUserSuccess,
    checkUserError,
    getRoomChatMesSuccess,
    getRoomChatMesFailure,
    appendOwnMessage,
    appendIncomingMessage,
} from "../redux/action/action";
import { clearSessionData, markThisTabAsActive, isThisTabActive } from '../utils/single-tab-auth';

class WebSocketManager {
    constructor() {
        if (WebSocketManager.instance) {
            return WebSocketManager.instance;
        }

        this.socket = null;
        this.isSocketOpen = false;
        this.messageQueue = [];
        this.heartbeatInterval = null;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.isConnecting = false;
        this.productionUrl = 'wss://serverchat.up.railway.app/chat'; // URL mặc định cho production
        this.developmentUrl = 'ws://localhost:8080/chat'; // URL mặc định cho development

        this.MAX_RECONNECT_ATTEMPTS = 5;
        this.RECONNECT_DELAY = 3000;

        WebSocketManager.instance = this;
        console.log('🏗️ WebSocketManager instance được tạo');
    }

    // Lấy WebSocket URL dựa trên môi trường - QUAN TRỌNG: luôn trả về URL đúng
    getWebSocketUrl(customUrl) {
        // Nếu có customUrl từ App.js, ưu tiên dùng nó
        if (customUrl) {
            console.log('📌 Sử dụng custom URL:', customUrl);
            return customUrl;
        }

        // Nếu không có customUrl, dựa vào môi trường
        if (process.env.NODE_ENV === 'production') {
            const envUrl = process.env.REACT_APP_WEBSOCKET_URL;
            if (envUrl) {
                console.log('📌 Sử dụng env URL (production):', envUrl);
                return envUrl;
            }
            console.log('📌 Sử dụng default production URL:', this.productionUrl);
            return this.productionUrl;
        } else {
            // Development: ưu tiên dùng biến môi trường, nếu không có thì dùng localhost
            const envUrl = process.env.REACT_APP_WEBSOCKET_URL;
            if (envUrl) {
                console.log('📌 Sử dụng env URL (development):', envUrl);
                return envUrl;
            }
            console.log('📌 Sử dụng default development URL:', this.developmentUrl);
            return this.developmentUrl;
        }
    }

    // Cleanup timers
    cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // Xử lý hàng đợi tin nhắn
    processMessageQueue() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        console.log(`📤 Xử lý ${this.messageQueue.length} tin nhắn trong hàng đợi`);

        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            try {
                this.socket.send(JSON.stringify(message));
                console.log('✅ Đã gửi tin nhắn từ hàng đợi');
            } catch (error) {
                console.error('❌ Lỗi gửi tin nhắn từ queue:', error);
                this.messageQueue.unshift(message);
                break;
            }
        }
    }

    // Gửi message an toàn
    sendMessageInternal(message) {
        if (!this.socket) {
            console.warn("⚠️ Socket chưa được khởi tạo, xếp hàng đợi");
            this.messageQueue.push(message);
            // Thử kết nối lại
            this.connect();
            return false;
        }

        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
            return true;
        } else if (this.socket.readyState === WebSocket.CONNECTING) {
            console.log('📦 WebSocket đang kết nối, xếp tin nhắn vào hàng đợi');
            this.messageQueue.push(message);
            return false;
        } else {
            console.warn("⚠️ Socket không mở (state:", this.socket.readyState, "), xếp hàng đợi");
            this.messageQueue.push(message);

            // Thử kết nối lại nếu socket đang đóng
            if (this.socket.readyState === WebSocket.CLOSED || this.socket.readyState === WebSocket.CLOSING) {
                console.log('🔄 Socket đang đóng, thử kết nối lại...');
                this.connect();
            }
            return false;
        }
    }

    // Xử lý sự kiện từ server
    handleEvent(response) {
        switch (response.event) {
            case "REGISTER":
                if (response.status === "success") {
                    store.dispatch(registerSuccess(response.data || {}));
                    toast.success("Đăng ký thành công!");
                } else {
                    store.dispatch(registerError(response.mes || 'Đăng ký thất bại'));
                    toast.error(response.mes || 'Đăng ký thất bại');
                }
                break;

            case "LOGIN":
                if (response.status === "success") {
                    localStorage.setItem("reLogin", response.data.RE_LOGIN_CODE);
                    if (response.data.user) {
                        localStorage.setItem('username', response.data.user);
                    }
                    store.dispatch(loginSuccess(response.data));
                    toast.success("Đăng nhập thành công!");
                    const username = localStorage.getItem('username');
                    if (username) markThisTabAsActive(username);
                } else {
                    const errorMsg = response.mes || "Đăng nhập thất bại";
                    store.dispatch(loginError(errorMsg));
                    toast.error(errorMsg);
                    localStorage.removeItem('reLogin');
                }
                break;

            case "RE_LOGIN":
                if (response.status === "success") {
                    localStorage.setItem("reLogin", response.data.RE_LOGIN_CODE);
                    if (response.data.user) {
                        localStorage.setItem('username', response.data.user);
                    }
                    store.dispatch(reLoginSuccess(response.data));
                    toast.success("Đã khôi phục phiên đăng nhập!");
                    const username = localStorage.getItem('username');
                    if (username) markThisTabAsActive(username);
                } else {
                    const errorMsg = response.mes || "Phiên hết hạn. Vui lòng đăng nhập lại.";
                    store.dispatch(reLoginError(errorMsg));
                    toast.error(errorMsg);
                    localStorage.removeItem('reLogin');
                    window.location.href = "/login";
                }
                break;

            case "LOGOUT":
                if (response.status === "success") {
                    this.cleanup();
                    clearSessionData();
                    store.dispatch(logoutSuccess(response.data || {}));
                    toast.info("Đã đăng xuất thành công");
                } else {
                    store.dispatch(logoutError(response.mes));
                    toast.error(response.mes || "Đăng xuất thất bại");
                }
                break;

            case "FORCE_LOGOUT":
                this.disconnect();
                clearSessionData();
                store.dispatch(logoutSuccess({}));
                toast.info(response.mes || "Phiên đăng nhập đã bị kết thúc từ nơi khác.");
                window.location.href = "/login";
                break;

            case "USER_STATUS":
                if (response.data?.username && typeof response.data.online === 'boolean') {
                    store.dispatch({
                        type: 'UPDATE_USER_ONLINE_STATUS',
                        payload: response.data.username,
                        data: response.data.online ? "online" : "offline"
                    });
                }
                break;

            case "SEND_CHAT":
                if (response.status !== "success") {
                    toast.error(response.mes || "Gửi tin nhắn thất bại");
                    break;
                }
                const msg = response.data;
                msg.type = msg.type === 1 ? 1 : 0;
                store.dispatch(appendOwnMessage(msg));
                break;

            case "NEW_CHAT":
                if (response.status !== "success") {
                    console.warn("NEW_CHAT failed:", response.mes);
                    break;
                }
                const newMsg = response.data;
                newMsg.type = newMsg.type === 1 ? 1 : 0;
                store.dispatch(appendIncomingMessage(newMsg));
                break;

            case "GET_PEOPLE_CHAT_MES":
                if (response.status === "success") {
                    store.dispatch(getPeopleChatMesSuccess(response.data || []));
                } else {
                    store.dispatch(getPeopleChatMesFailure(response.mes || 'Lỗi tải tin nhắn'));
                    toast.error(response.mes || 'Lỗi tải tin nhắn');
                }
                break;

            case "GET_ROOM_CHAT_MES":
                if (response.status === "success") {
                    store.dispatch(getRoomChatMesSuccess(response.data));
                } else {
                    store.dispatch(getRoomChatMesFailure(response.mes || 'Lỗi tải tin nhắn phòng'));
                    toast.error(response.mes || 'Lỗi tải tin nhắn phòng');
                }
                break;

            case "GET_USER_LIST":
                if (response.status === "success") {
                    store.dispatch(getUserListSuccess(response.data || []));
                } else {
                    store.dispatch(getUserListFailure(response.mes || 'Lỗi tải danh sách'));
                    toast.error(response.mes || 'Lỗi tải danh sách');
                }
                break;

            case "CREATE_ROOM":
                if (response.status === "success") {
                    store.dispatch(createRoomSuccess(response.data || {}));
                } else {
                    store.dispatch(createRoomError(response.mes || 'Tạo nhóm thất bại'));
                    toast.error(response.mes || 'Tạo nhóm thất bại');
                }
                break;

            case "JOIN_ROOM":
                if (response.status === "success") {
                    store.dispatch(joinRoomSuccess(response.data || {}));
                    setTimeout(() => {
                        this.getUsersList();
                    }, 100);
                } else {
                    store.dispatch(joinRoomFailure(response.mes || 'Tham gia nhóm thất bại'));
                    toast.error(response.mes || 'Tham gia nhóm thất bại');
                }
                break;

            default:
                console.log('[WS] Unhandled event:', response.event);
        }
    }

    // Kết nối WebSocket
    connect(customUrl) {
        // Nếu đang kết nối thì bỏ qua
        if (this.isConnecting) {
            console.log('⏳ Đang trong quá trình kết nối, bỏ qua...');
            return;
        }

        // Nếu đã kết nối rồi thì bỏ qua
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log('ℹ️ WebSocket đã kết nối, bỏ qua');
            return;
        }

        // Lấy URL - QUAN TRỌNG: Luôn lấy URL mới nhất
        const url = this.getWebSocketUrl(customUrl);

        if (!url) {
            console.error('❌ Không thể xác định WebSocket URL');
            toast.error('Lỗi cấu hình kết nối!');
            return;
        }

        // Đóng kết nối cũ nếu có
        if (this.socket) {
            try {
                // Chỉ đóng nếu không phải đang connecting
                if (this.socket.readyState !== WebSocket.CONNECTING) {
                    this.socket.close();
                }
            } catch (error) {
                console.error('Lỗi đóng socket cũ:', error);
            }
            this.socket = null;
        }

        // Cleanup timers cũ
        this.cleanup();

        console.log('🔌 Đang kết nối WebSocket đến:', url);
        this.isConnecting = true;

        try {
            this.socket = new WebSocket(url);
            window.socket = this.socket; // Cho debug

            this.socket.onopen = () => {
                console.log('✅ WebSocket đã kết nối thành công!');
                this.isSocketOpen = true;
                this.isConnecting = false;
                this.reconnectAttempts = 0;

                // Thiết lập heartbeat
                this.heartbeatInterval = setInterval(() => {
                    if (this.socket?.readyState === WebSocket.OPEN) {
                        this.socket.send(JSON.stringify({
                            action: "onchat",
                            data: { event: "HEARTBEAT", data: {} }
                        }));
                    }
                }, 25000);

                // Xử lý hàng đợi
                setTimeout(() => {
                    this.processMessageQueue();
                }, 500);

                // Relogin nếu có
                const username = localStorage.getItem('username');
                const reloginCode = localStorage.getItem('reLogin');

                if (username && reloginCode && isThisTabActive()) {
                    console.log('🔄 Đang thực hiện relogin cho:', username);
                    this.reLoginUser(username, reloginCode);
                }
            };

            this.socket.onmessage = (event) => {
                const rawData = event.data;
                if (typeof rawData !== 'string' || !rawData.trim()) {
                    return;
                }

                let response;
                try {
                    response = JSON.parse(rawData);
                } catch (err) {
                    console.error('[WS] Lỗi parse JSON:', err);
                    return;
                }

                if (!response || !response.event) {
                    console.warn('[WS] Message không hợp lệ:', response);
                    return;
                }

                console.log('[WS] Nhận event:', response.event, response);
                this.handleEvent(response);
            };

            this.socket.onclose = (event) => {
                console.log('🔴 WebSocket đã đóng. Code:', event.code, 'Reason:', event.reason);

                this.isSocketOpen = false;
                this.isConnecting = false;
                this.cleanup();

                // Không reconnect nếu đóng bình thường (code 1000)
                if (event.code === 1000) {
                    console.log('📝 WebSocket đóng bình thường, không reconnect');
                    return;
                }

                // Thử kết nối lại
                if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                    this.reconnectAttempts++;
                    const delay = this.RECONNECT_DELAY * this.reconnectAttempts;
                    console.log(`🔄 Đang thử kết nối lại lần ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} sau ${delay/1000}s`);

                    toast.warn(`Mất kết nối. Đang thử lại (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`, {
                        autoClose: 2000
                    });

                    this.reconnectTimer = setTimeout(() => {
                        // KHI RECONNECT: KHÔNG truyền customUrl, để nó tự lấy URL đúng
                        this.connect();
                    }, delay);
                } else {
                    console.error('❌ Không thể kết nối lại sau nhiều lần thử');
                    toast.error('Không thể kết nối đến server. Vui lòng tải lại trang!', {
                        autoClose: false,
                        closeButton: true
                    });
                }
            };

            this.socket.onerror = (error) => {
                console.error("❌ Lỗi WebSocket:", error);
            };

        } catch (error) {
            console.error('❌ Lỗi khởi tạo WebSocket:', error);
            this.isConnecting = false;
            toast.error('Lỗi khởi tạo kết nối!');
        }
    }

    // Ngắt kết nối
    disconnect() {
        this.cleanup();
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isSocketOpen = false;
        this.isConnecting = false;
        this.messageQueue = [];
    }

    // ====================== PUBLIC METHODS ======================
    loginUser(user, pass) {
        this.sendMessageInternal({
            action: "onchat",
            data: { event: "LOGIN", data: { user, pass } }
        });
    }

    reLoginUser(user, code) {
        this.sendMessageInternal({
            action: "onchat",
            data: { event: "RE_LOGIN", data: { user, code } }
        });
    }

    logoutUsers() {
        this.sendMessageInternal({
            action: "onchat",
            data: { event: "LOGOUT" }
        });
    }

    register(user, pass) {
        this.sendMessageInternal({
            action: "onchat",
            data: { event: "REGISTER", data: { user, pass } }
        });
    }

    create_room(name) {
        this.sendMessageInternal({
            action: "onchat",
            data: { event: "CREATE_ROOM", data: { name } }
        });
    }

    joinRoom(name) {
        this.sendMessageInternal({
            action: "onchat",
            data: { event: "JOIN_ROOM", data: { name } }
        });
    }

    sendChatToPeople(to, mes, timestamp = Date.now()) {
        this.sendMessageInternal({
            action: "onchat",
            data: { event: "SEND_CHAT", data: { type: "people", to, mes, timestamp } }
        });
    }

    sendChatToRoom(to, mes, timestamp = Date.now()) {
        this.sendMessageInternal({
            action: "onchat",
            data: { event: "SEND_CHAT", data: { type: "room", to, mes, timestamp } }
        });
    }

    getUsersList() {
        this.sendMessageInternal({
            action: "onchat",
            data: { event: "GET_USER_LIST" }
        });
    }

    getPeopleChatMes(name) {
        this.sendMessageInternal({
            action: "onchat",
            data: { event: "GET_PEOPLE_CHAT_MES", data: { name, page: 1 } }
        });
    }

    getRoomChatMes(name) {
        this.sendMessageInternal({
            action: "onchat",
            data: { event: "GET_ROOM_CHAT_MES", data: { name, page: 1 } }
        });
    }

    getRoomMembers(roomName) {
        this.sendMessageInternal({
            action: "onchat",
            data: { event: "GET_ROOM_MEMBERS", data: { name: roomName } }
        });
    }

    checkUserExists(username) {
        return new Promise((resolve, reject) => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                reject(new Error("Socket chưa kết nối"));
                return;
            }

            const trimmed = username.trim();
            if (!trimmed) {
                resolve(false);
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error("Timeout khi kiểm tra user"));
            }, 5000);

            const handler = (event) => {
                try {
                    const response = JSON.parse(event.data);
                    if (response.event === 'CHECK_USER_EXISTS' &&
                        response.data?.username === trimmed) {
                        clearTimeout(timeout);
                        this.socket.removeEventListener('message', handler);
                        if (response.status === 'success') {
                            resolve(!!response.data.exists);
                        } else {
                            reject(new Error(response.mes || 'Lỗi server'));
                        }
                    }
                } catch (e) {
                    console.error('Check user parse error', e);
                }
            };

            this.socket.addEventListener('message', handler);

            this.sendMessageInternal({
                action: 'onchat',
                data: {
                    event: 'CHECK_USER_EXISTS',
                    data: { username: trimmed }
                }
            });
        });
    }

    checkRoomExists(roomName) {
        return new Promise((resolve, reject) => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                reject(new Error("Socket chưa kết nối"));
                return;
            }

            const trimmed = roomName.trim();
            if (!trimmed) {
                resolve(false);
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error("Timeout khi kiểm tra nhóm"));
            }, 5000);

            const handler = (event) => {
                try {
                    const response = JSON.parse(event.data);
                    if (response.event === 'CHECK_ROOM_EXISTS' && response.data?.name === trimmed) {
                        clearTimeout(timeout);
                        this.socket.removeEventListener('message', handler);
                        if (response.status === 'success') {
                            resolve(!!response.data.exists);
                        } else {
                            reject(new Error(response.mes || 'Lỗi server'));
                        }
                    }
                } catch (e) {
                    console.error('Check room parse error', e);
                }
            };

            this.socket.addEventListener('message', handler);

            this.sendMessageInternal({
                action: 'onchat',
                data: {
                    event: 'CHECK_ROOM_EXISTS',
                    data: { name: trimmed }
                }
            });
        });
    }

    checkUser(username) {
        return new Promise((resolve) => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                resolve('offline');
                return;
            }

            const handler = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.event === "CHECK_USER" && data.status === "success") {
                        this.socket.removeEventListener("message", handler);
                        const status = data.data.online ? "online" : "offline";
                        store.dispatch(checkUserSuccess(username, status));
                        resolve(status);
                    } else if (data.event === "CHECK_USER" && data.status !== "success") {
                        this.socket.removeEventListener("message", handler);
                        store.dispatch(checkUserError(data.mes || 'Kiểm tra user thất bại'));
                        resolve('offline');
                    }
                } catch (err) {
                    console.error(err);
                }
            };

            this.socket.addEventListener("message", handler);

            this.sendMessageInternal({
                action: "onchat",
                data: { event: "CHECK_USER", data: { user: username } }
            });

            setTimeout(() => {
                this.socket.removeEventListener("message", handler);
                store.dispatch(checkUserSuccess(username, "offline"));
                resolve("offline");
            }, 2000);
        });
    }

    // Getter methods
    getSocket() {
        return this.socket;
    }

    isConnected() {
        return this.isSocketOpen;
    }

    getMessageQueue() {
        return this.messageQueue;
    }
}

// Tạo singleton instance
const wsManager = new WebSocketManager();

// ====================== EXPORT ======================
export const initializeSocket = (url) => wsManager.connect(url);
export const disconnectSocket = () => wsManager.disconnect();

export const loginUser = (user, pass) => wsManager.loginUser(user, pass);
export const reLoginUser = (user, code) => wsManager.reLoginUser(user, code);
export const logoutUsers = () => wsManager.logoutUsers();
export const register = (user, pass) => wsManager.register(user, pass);
export const create_room = (name) => wsManager.create_room(name);
export const joinRoom = (name) => wsManager.joinRoom(name);
export const sendChatToPeople = (to, mes, timestamp) => wsManager.sendChatToPeople(to, mes, timestamp);
export const sendChatToRoom = (to, mes, timestamp) => wsManager.sendChatToRoom(to, mes, timestamp);
export const getUsersList = () => wsManager.getUsersList();
export const getPeopleChatMes = (name) => wsManager.getPeopleChatMes(name);
export const getRoomChatMes = (name) => wsManager.getRoomChatMes(name);
export const getRoomMembers = (roomName) => wsManager.getRoomMembers(roomName);
export const checkUserExists = (username) => wsManager.checkUserExists(username);
export const checkRoomExists = (roomName) => wsManager.checkRoomExists(roomName);
export const checkUser = (username) => wsManager.checkUser(username);

// Export các biến (getters) - LƯU Ý: Đây là giá trị tại thời điểm export, không phải live
export const socket = wsManager.getSocket();
export const isSocketOpen = wsManager.isConnected();
export const messageQueue = wsManager.getMessageQueue();

export const socketActions = {
    logoutUser: () => logoutUsers(),
};