// src/utils/singleTabAuth.js
import { toast } from 'react-toastify';

const SESSION_KEY = 'active_login_session_v2025';

let currentTabId = window.name;  // THAY ĐỔI: Sử dụng window.name thay vì sessionStorage để persist chắc chắn hơn trên reload
if (!currentTabId) {
    currentTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    window.name = currentTabId;
}

export function markThisTabAsActive(username) {
    const session = {
        tabId: currentTabId,
        username,
        timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function isThisTabActive() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    try {
        const session = JSON.parse(raw);
        return session.tabId === currentTabId;
    } catch {
        return false;
    }
}

export function clearSessionData() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('reLogin');
    localStorage.removeItem('username');
}

// redirect + reset redux
export function forceLogoutAndRedirect(dispatch, navigate, message) {
    clearSessionData();
    dispatch({ type: 'RESET_APP_STATE' });
    if (message) {
        toast.info(message, { autoClose: 4000 });
    }
    navigate('/Login', { replace: true });
}

export function initializeSingleTabAuth(dispatch, navigate) {
    const onStorage = (e) => {
        if (e.key !== SESSION_KEY) {
            // nếu session_key bị xóa (e.key = SESSION_KEY && e.newValue === null)
            if (e.key === SESSION_KEY && !e.newValue) {
                // session bị xóa ở nơi khác => nếu chúng ta không active, chắc chắn phải về login
                if (!isThisTabActive()) {
                    forceLogoutAndRedirect(dispatch, navigate, 'Phiên đăng nhập đã hết hoặc bị đăng xuất.');
                } else {
                    // nếu chính tab đang active mà session bị xóa => bất thường, force logout
                    forceLogoutAndRedirect(dispatch, navigate, 'Phiên của bạn đã bị kết thúc.');
                }
            }
            return;
        }
        // nếu key là SESSION_KEY
        if (e.key === SESSION_KEY) {
            try {
                const newSession = e.newValue ? JSON.parse(e.newValue) : null;
                const currentUser = localStorage.getItem('username');
                // 1) session mới được tạo ở tab khác với cùng user => bị thay thế
                if (newSession && currentUser && newSession.username === currentUser && newSession.tabId !== currentTabId) {
                    forceLogoutAndRedirect(dispatch, navigate, 'Tài khoản đã đăng nhập ở tab khác');
                }
                // 2) session bị xóa (newSession === null) => xử lý bên trên
                if (!newSession && currentUser) {
                    forceLogoutAndRedirect(dispatch, navigate, 'Phiên đăng nhập đã bị kết thúc.');
                }
            } catch (err) {
                // ignore parse errors
            }
        }
    };

    window.addEventListener('storage', onStorage);

    const onUnload = () => {
        // Không gửi LOGOUT hoặc clearSessionData nữa để tránh mất session khi reload.
        // Server sẽ xử lý qua socket close với grace period.
        if (!isThisTabActive()) return;
        // Không clear hoặc send LOGOUT ở đây.
    };

    window.addEventListener('pagehide', onUnload);

    return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('pagehide', onUnload);
    };
}