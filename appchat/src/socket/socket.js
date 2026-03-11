// src/socket/socket.js
import store from "../redux/store/store";
import {toast} from 'react-toastify';
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
import {clearSessionData, markThisTabAsActive, isThisTabActive} from '../utils/single-tab-auth';
export let socket;
export let isSocketOpen = false;
export const messageQueue = [];
let heartbeatInterval = null;
const sendMessageInternal = (message) => {
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    } else if (socket?.readyState === WebSocket.CONNECTING) {
        messageQueue.push(message);
    } else {
        console.warn("Socket is not open, cannot send:", message);
    }
};
export const initializeSocket = (url) => {
    if (socket && (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING)) {
        socket = null;
    }

    if (socket && socket.readyState !== WebSocket.CLOSED) {
        return; // đã có socket đang mở
    }

    socket = new WebSocket(url);
    window.socket = socket;
    socket.onopen = () => {
        isSocketOpen = true;
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    action: "onchat",
                    data: {event: "HEARTBEAT", data: {}}
                }));
            }
        }, 25000);
        const username = localStorage.getItem('username');
        const reloginCode = localStorage.getItem('reLogin');
        if (username && reloginCode && isThisTabActive()) {
            reLoginUser(username, reloginCode);
        }
    };

    socket.onmessage = (event) => {
        const rawData = event.data;
        if (typeof rawData !== 'string' || !rawData.trim()) {
            console.log('[WS] Ignored non-text/empty message');
            return;
        }
        let response;
        try {
            response = JSON.parse(rawData);
        } catch (err) {
            console.error('[WS] JSON parse error:', err, 'Raw:', rawData);
            return;
        }
        if (!response || !response.event) {
            console.warn('[WS] Invalid message - missing event:', response);
            return;
        }
        console.log('[WS] Received event:', response.event, response);
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
                    if (heartbeatInterval) clearInterval(heartbeatInterval);
                    heartbeatInterval = setInterval(() => {
                        if (socket?.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({action: "onchat", data: {event: "HEARTBEAT", data: {}}}));
                        }
                    }, 30000);
                    setTimeout(() => {
                        toast.success("Đăng nhập thành công!", {autoClose: 3000});
                    }, 1000);
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
                    if (heartbeatInterval) clearInterval(heartbeatInterval);
                    heartbeatInterval = setInterval(() => {
                        if (socket?.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({action: "onchat", data: {event: "HEARTBEAT", data: {}}}));
                        }
                    }, 30000);
                    toast.success("Đã khôi phục phiên đăng nhập thành công!", {autoClose: 3000});
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
                    if (heartbeatInterval) {
                        clearInterval(heartbeatInterval);
                        heartbeatInterval = null;
                    }
                    clearSessionData();
                    store.dispatch(logoutSuccess(response.data || {}));

                    if (socket) {
                        socket.onclose = null;
                        socket.onerror = null;
                        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                            socket.close(1000, "User logged out");
                        }
                        socket = null;
                    }

                    toast.info("Đã đăng xuất thành công", { autoClose: 4000 });
                } else {
                    store.dispatch(logoutError(response.mes));
                    toast.error(response.mes || "Đăng xuất thất bại", { autoClose: 5000 });
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
            case "SEND_CHAT": {
                if (response.status !== "success") {
                    toast.error(response.mes || "Gửi tin nhắn thất bại");
                    break;
                }
                const msg = response.data;
                msg.type = msg.type === 1 ? 1 : 0;
                store.dispatch(appendOwnMessage(msg));
                break;
            }

            case "NEW_CHAT": {
                if (response.status !== "success") {
                    console.warn("NEW_CHAT failed:", response.mes);
                    break;
                }
                const msg = response.data;
                msg.type = msg.type === 1 ? 1 : 0;
                store.dispatch(appendIncomingMessage(msg));
                break;
            }

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
                response.status === "success"
                    ? store.dispatch(getUserListSuccess(response.data || []))
                    : store.dispatch(getUserListFailure(response.mes || 'Lỗi tải danh sách'));
                if (response.status !== "success") {
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
                    // Gọi getUsersList ngay lập tức để cập nhật danh sách
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
    socket.onclose = () => {
        isSocketOpen = false;
        console.log('WebSocket closed. Reconnecting in 5s...');
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        toast.warn("Kết nối bị mất. Đang kết nối lại...", {autoClose: 3000});
        setTimeout(() => initializeSocket(url), 5000);
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast.error("Lỗi kết nối WebSocket!", {autoClose: 5000});
    };
};
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
                        resolve(!!response.data.exists); // true/false
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
export const checkRoomExists = (roomName) => {
    return new Promise((resolve, reject) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) { reject(new Error("Socket chưa kết nối")); return; }
        const trimmed = roomName.trim();
        if (!trimmed) { resolve(false); return; }
        const timeout = setTimeout(() => reject(new Error("Timeout khi kiểm tra nhóm")), 5000);
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
            } catch (e) { console.error('Check room parse error', e); }
        };
        socket.addEventListener('message', handler);
        sendMessageInternal({ action: 'onchat', data: { event: 'CHECK_ROOM_EXISTS', data: { name: trimmed } } });
    });
};
export const getUsersList = () => {
    if (!socket) return;
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: "onchat",
            data: {event: "GET_USER_LIST"},
        }));
    } else if (socket.readyState === WebSocket.CONNECTING) {
        console.log("WebSocket connecting. Retry getUsersList in 1s.");
        setTimeout(getUsersList, 1000);
    }
};
export const getPeopleChatMes = (name) => {
    if (!socket) return;
    const send = () => {
        socket.send(JSON.stringify({
            action: "onchat",
            data: {event: "GET_PEOPLE_CHAT_MES", data: {name, page: 1}}
        }));
    };
    if (socket.readyState === WebSocket.OPEN) {
        send();
    } else if (socket.readyState === WebSocket.CONNECTING) {
        const interval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                clearInterval(interval);
                send();
            }
        }, 100);
    }
};
export const getRoomChatMes = (name) => {
    if (!socket) return;
    const send = () => {
        socket.send(JSON.stringify({
            action: "onchat",
            data: {event: "GET_ROOM_CHAT_MES", data: {name, page: 1}}
        }));
    };
    if (socket.readyState === WebSocket.OPEN) {
        send();
    } else if (socket.readyState === WebSocket.CONNECTING) {
        const interval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                clearInterval(interval);
                send();
            }
        }, 100);
    }
};
export const register = (user, pass) => {
    if (!socket) return;
    socket.send(JSON.stringify({
        action: "onchat",
        data: {event: "REGISTER", data: {user, pass}},
    }));
};
export const create_room = (name) => {
    if (!socket) return;
    socket.send(JSON.stringify({
        action: "onchat",
        data: {event: "CREATE_ROOM", data: {name}}
    }));
};
export const joinRoom = (name) => {
    if (!socket) return;
    socket.send(JSON.stringify({
        action: "onchat",
        data: {event: "JOIN_ROOM", data: {name}}
    }));
};
export const sendChatToPeople = (to, mes, timestamp = Date.now()) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        messageQueue.push({ action: "onchat", data: {event: "SEND_CHAT", data: {type: "people", to, mes, timestamp}} });
        return;
    }
    socket.send(JSON.stringify({
        action: "onchat",
        data: {event: "SEND_CHAT", data: {type: "people", to, mes, timestamp}}
    }));
};

export const sendChatToRoom = (to, mes, timestamp = Date.now()) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
        action: "onchat",
        data: {event: "SEND_CHAT", data: {type: "room", to, mes, timestamp}}
    }));
};
// Giữ nguyên hàm checkUser cũ (online status)
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
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    sendMessageInternal({
        action: "onchat",
        data: { event: "GET_ROOM_MEMBERS", data: { name: roomName } }
    });
};
export const socketActions = {
    logoutUser: () => logoutUsers(),

};
