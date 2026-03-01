// src/socket/socket.js
import store from "../redux/store/store";
import {toast} from 'react-toastify';
import {
    createRoomSuccess,
    createRoomError,
    loginSuccess,
    loginError,
    sendChatToPeopleSuccess,
    sendChatToPeopleFailure,
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
    sendChatToRoomSuccess,
    sendChatToRoomFailure,
    appendOwnMessage,
    appendIncomingMessage,
} from "../redux/action/action";
import {clearSessionData, markThisTabAsActive, isThisTabActive} from '../utils/single-tab-auth';

export let socket;
export let isSocketOpen = false;
export const messageQueue = [];
let heartbeatInterval = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// Hàm gửi message an toàn
const sendMessageInternal = (message) => {
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        return true;
    } else if (socket?.readyState === WebSocket.CONNECTING) {
        console.log('📦 WebSocket đang kết nối, xếp tin nhắn vào hàng đợi');
        messageQueue.push(message);
        return false;
    } else {
        console.warn("⚠️ Socket không mở, không thể gửi:", message);
        return false;
    }
};

// Xử lý hàng đợi tin nhắn
const processMessageQueue = () => {
    while (messageQueue.length > 0 && socket?.readyState === WebSocket.OPEN) {
        const message = messageQueue.shift();
        socket.send(JSON.stringify(message));
        console.log('📤 Đã gửi tin nhắn từ hàng đợi');
    }
};

// Khởi tạo WebSocket
export const initializeSocket = (url) => {
    // Kiểm tra URL
    if (!url) {
        console.error('❌ WebSocket URL không được cấu hình');
        toast.error('Lỗi cấu hình kết nối!', {autoClose: 5000});
        return;
    }

    // Đóng kết nối cũ nếu có
    if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close();
    }

    console.log('🔌 Đang kết nối WebSocket đến:', url);

    try {
        socket = new WebSocket(url);
        window.socket = socket;

        socket.onopen = () => {
            console.log('✅ WebSocket đã kết nối thành công!');
            isSocketOpen = true;
            reconnectAttempts = 0; // Reset số lần thử kết nối lại

            // Xử lý heartbeat
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            heartbeatInterval = setInterval(() => {
                if (socket?.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        action: "onchat",
                        data: {event: "HEARTBEAT", data: {}}
                    }));
                }
            }, 25000); // Gửi heartbeat mỗi 25s

            // Xử lý hàng đợi tin nhắn
            processMessageQueue();

            // Relogin nếu có thông tin
            const username = localStorage.getItem('username');
            const reloginCode = localStorage.getItem('reLogin');

            if (username && reloginCode && isThisTabActive()) {
                console.log('🔄 Đang thực hiện relogin cho:', username);
                reLoginUser(username, reloginCode);
            }
        };

        socket.onmessage = (event) => {
            const rawData = event.data;
            if (typeof rawData !== 'string' || !rawData.trim()) {
                return;
            }

            let response;
            try {
                response = JSON.parse(rawData);
            } catch (err) {
                console.error('[WS] Lỗi parse JSON:', err, 'Raw:', rawData);
                return;
            }

            if (!response || !response.event) {
                console.warn('[WS] Message không hợp lệ:', response);
                return;
            }

            console.log('[WS] Nhận event:', response.event, response);

            // Xử lý các event (giữ nguyên code xử lý của bạn)
            switch (response.event) {
                case "REGISTER":
                    if (response.status === "success") {
                        store.dispatch(registerSuccess(response.data || {}));
                        toast.success("Đăng ký thành công!", {autoClose: 3000});
                    } else {
                        store.dispatch(registerError(response.mes || 'Đăng ký thất bại'));
                        toast.error(response.mes || 'Đăng ký thất bại', {autoClose: 5000});
                    }
                    break;

                case "LOGIN":
                    if (response.status === "success") {
                        localStorage.setItem("reLogin", response.data.RE_LOGIN_CODE);
                        if (response.data.user) {
                            localStorage.setItem('username', response.data.user);
                        }
                        store.dispatch(loginSuccess(response.data));
                        toast.success("Đăng nhập thành công!", {autoClose: 3000});
                        const username = localStorage.getItem('username');
                        if (username) markThisTabAsActive(username);
                    } else {
                        const errorMsg = response.mes || "Đăng nhập thất bại";
                        store.dispatch(loginError(errorMsg));
                        toast.error(errorMsg, {autoClose: 8000});
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
                        toast.success("Đã khôi phục phiên đăng nhập!", {autoClose: 3000});
                        const username = localStorage.getItem('username');
                        if (username) markThisTabAsActive(username);
                    } else {
                        const errorMsg = response.mes || "Phiên hết hạn. Vui lòng đăng nhập lại.";
                        store.dispatch(reLoginError(errorMsg));
                        toast.error(errorMsg, {autoClose: 8000});
                        localStorage.removeItem('reLogin');
                        window.location.href = "/login";
                    }
                    break;

                case "LOGOUT":
                    if (response.status === "success") {
                        if (heartbeatInterval) clearInterval(heartbeatInterval);
                        clearSessionData();
                        store.dispatch(logoutSuccess(response.data || {}));
                        toast.info("Đã đăng xuất thành công", {autoClose: 4000});
                    } else {
                        store.dispatch(logoutError(response.mes));
                        toast.error(response.mes || "Đăng xuất thất bại", {autoClose: 5000});
                    }
                    break;

                case "FORCE_LOGOUT":
                    clearSessionData();
                    store.dispatch(logoutSuccess({}));
                    toast.info(response.mes || "Phiên đăng nhập đã bị kết thúc từ nơi khác.", {autoClose: 6000});
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
                        toast.error(response.mes || 'Lỗi tải tin nhắn', {autoClose: 5000});
                    }
                    break;

                case "GET_ROOM_CHAT_MES":
                    if (response.status === "success") {
                        store.dispatch(getRoomChatMesSuccess(response.data));
                    } else {
                        store.dispatch(getRoomChatMesFailure(response.mes || 'Lỗi tải tin nhắn phòng'));
                        toast.error(response.mes || 'Lỗi tải tin nhắn phòng', {autoClose: 5000});
                    }
                    break;

                case "GET_USER_LIST":
                    if (response.status === "success") {
                        store.dispatch(getUserListSuccess(response.data || []));
                    } else {
                        store.dispatch(getUserListFailure(response.mes || 'Lỗi tải danh sách'));
                        toast.error(response.mes || 'Lỗi tải danh sách', {autoClose: 5000});
                    }
                    break;

                case "CREATE_ROOM":
                    if (response.status === "success") {
                        store.dispatch(createRoomSuccess(response.data || {}));
                    } else {
                        store.dispatch(createRoomError(response.mes || 'Tạo nhóm thất bại'));
                        toast.error(response.mes || 'Tạo nhóm thất bại', {autoClose: 5000});
                    }
                    break;

                case "JOIN_ROOM":
                    if (response.status === "success") {
                        store.dispatch(joinRoomSuccess(response.data || {}));
                        setTimeout(() => {
                            getUsersList();
                        }, 100);
                    } else {
                        store.dispatch(joinRoomFailure(response.mes || 'Tham gia nhóm thất bại'));
                        toast.error(response.mes || 'Tham gia nhóm thất bại', {autoClose: 5000});
                    }
                    break;

                default:
                    console.log('[WS] Unhandled event:', response.event);
            }
        };

        socket.onclose = (event) => {
            isSocketOpen = false;
            console.log('🔴 WebSocket đã đóng. Code:', event.code, 'Reason:', event.reason);

            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }

            // Thử kết nối lại nếu chưa quá số lần cho phép
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                const delay = RECONNECT_DELAY * reconnectAttempts; // Tăng dần thời gian chờ
                console.log(`🔄 Đang thử kết nối lại lần ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} sau ${delay/1000}s`);

                toast.warn(`Mất kết nối. Đang thử lại (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`, {
                    autoClose: 2000
                });

                setTimeout(() => {
                    initializeSocket(url);
                }, delay);
            } else {
                console.error('❌ Không thể kết nối lại sau nhiều lần thử');
                toast.error('Không thể kết nối đến server. Vui lòng tải lại trang!', {
                    autoClose: false,
                    closeButton: true
                });
            }
        };

        socket.onerror = (error) => {
            console.error("❌ Lỗi WebSocket:", error);
            // Không toast ở đây vì onclose sẽ xử lý
        };

    } catch (error) {
        console.error('❌ Lỗi khởi tạo WebSocket:', error);
        toast.error('Lỗi khởi tạo kết nối!', {autoClose: 5000});
    }
};

// Cập nhật các hàm gửi để sử dụng sendMessageInternal
export const loginUser = (user, pass) => {
    sendMessageInternal({
        action: "onchat",
        data: {event: "LOGIN", data: {user, pass}}
    });
};

export const reLoginUser = (user, code) => {
    sendMessageInternal({
        action: "onchat",
        data: {event: "RE_LOGIN", data: {user, code}}
    });
};

export const logoutUsers = () => {
    sendMessageInternal({
        action: "onchat",
        data: {event: "LOGOUT"}
    });
};

export const register = (user, pass) => {
    sendMessageInternal({
        action: "onchat",
        data: {event: "REGISTER", data: {user, pass}}
    });
};

export const create_room = (name) => {
    sendMessageInternal({
        action: "onchat",
        data: {event: "CREATE_ROOM", data: {name}}
    });
};

export const joinRoom = (name) => {
    sendMessageInternal({
        action: "onchat",
        data: {event: "JOIN_ROOM", data: {name}}
    });
};

export const sendChatToPeople = (to, mes, timestamp = Date.now()) => {
    sendMessageInternal({
        action: "onchat",
        data: {event: "SEND_CHAT", data: {type: "people", to, mes, timestamp}}
    });
};

export const sendChatToRoom = (to, mes, timestamp = Date.now()) => {
    sendMessageInternal({
        action: "onchat",
        data: {event: "SEND_CHAT", data: {type: "room", to, mes, timestamp}}
    });
};

export const getUsersList = () => {
    sendMessageInternal({
        action: "onchat",
        data: {event: "GET_USER_LIST"}
    });
};

export const getPeopleChatMes = (name) => {
    sendMessageInternal({
        action: "onchat",
        data: {event: "GET_PEOPLE_CHAT_MES", data: {name, page: 1}}
    });
};

export const getRoomChatMes = (name) => {
    sendMessageInternal({
        action: "onchat",
        data: {event: "GET_ROOM_CHAT_MES", data: {name, page: 1}}
    });
};

// Hàm kiểm tra user tồn tại (giữ nguyên)
export const checkUserExists = (username) => {
    return new Promise((resolve, reject) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
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
                    socket.removeEventListener('message', handler);
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

        socket.addEventListener('message', handler);

        sendMessageInternal({
            action: 'onchat',
            data: {
                event: 'CHECK_USER_EXISTS',
                data: {username: trimmed}
            }
        });
    });
};

// Hàm kiểm tra room tồn tại (giữ nguyên)
export const checkRoomExists = (roomName) => {
    return new Promise((resolve, reject) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
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
                    socket.removeEventListener('message', handler);
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

        socket.addEventListener('message', handler);

        sendMessageInternal({
            action: 'onchat',
            data: {
                event: 'CHECK_ROOM_EXISTS',
                data: { name: trimmed }
            }
        });
    });
};

// Hàm kiểm tra user online (giữ nguyên)
export const checkUser = async (username) => {
    return new Promise((resolve, reject) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            resolve('offline');
            return;
        }

        const message = JSON.stringify({
            action: "onchat",
            data: {event: "CHECK_USER", data: {user: username}}
        });

        socket.send(message);

        const handler = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === "CHECK_USER" && data.status === "success") {
                    socket.removeEventListener("message", handler);
                    const status = data.data.online ? "online" : "offline";
                    store.dispatch(checkUserSuccess(username, status));
                    resolve(status);
                } else if (data.event === "CHECK_USER" && data.status !== "success") {
                    socket.removeEventListener("message", handler);
                    store.dispatch(checkUserError(data.mes || 'Kiểm tra user thất bại'));
                    resolve('offline');
                }
            } catch (err) {
                socket.removeEventListener("message", handler);
                reject(err);
            }
        };

        socket.addEventListener("message", handler);

        setTimeout(() => {
            socket.removeEventListener("message", handler);
            store.dispatch(checkUserSuccess(username, "offline"));
            resolve("offline");
        }, 2000);
    });
};

export const getRoomMembers = (roomName) => {
    sendMessageInternal({
        action: "onchat",
        data: { event: "GET_ROOM_MEMBERS", data: { name: roomName } }
    });
};

export const socketActions = {
    logoutUser: () => logoutUsers(),
};