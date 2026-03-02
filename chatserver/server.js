// server.js
require('dotenv').config();
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const {
    User,
    ActiveUserSession,
    Room,
    RoomMember,
    Message,
    sequelize,
    createDatabaseIfNotExists,
    syncDatabase
} = require('./db');

// Lấy giá trị từ biến môi trường
const PORT = process.env.PORT || 8080;
const WS_PATH = process.env.WS_PATH || '/chat';
const SESSION_PREFIX = process.env.SESSION_PREFIX || 'sess_';
const RELOGIN_PREFIX = process.env.RELOGIN_PREFIX || 'nlu_';
const TIMEZONE_OFFSET = parseInt(process.env.TIMEZONE_OFFSET) || 7;
const KEEP_ALIVE_INTERVAL = parseInt(process.env.KEEP_ALIVE_INTERVAL) || 30000;
const SESSION_CLEANUP_INTERVAL = parseInt(process.env.SESSION_CLEANUP_INTERVAL) || 60000;
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT) || 90000;
const LOGOUT_DELAY = parseInt(process.env.LOGOUT_DELAY) || 5000;

const online = new Map(); // username → Set<ws>

// Khởi tạo database
async function initializeDatabase() {
    try {
        // Tạo database nếu chưa tồn tại
        await createDatabaseIfNotExists();

        // Kiểm tra kết nối
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // Tạo các tables
        await syncDatabase();

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

/**
 * Force logout user từ tất cả các socket khác
 */
async function forceLogoutUser(username, excludeWs = null, reason = 'Đăng nhập từ nơi khác') {
    const sockets = online.get(username);
    if (!sockets) return;

    try {
        for (const sock of Array.from(sockets)) {
            if (sock === excludeWs) continue;
            if (sock.readyState === WebSocket.OPEN) {
                send(sock, { status: 'success', event: 'FORCE_LOGOUT', mes: reason });
            }
            try {
                sock.terminate();
            } catch (e) { /* ignore */ }
        }
    } finally {
        if (online.has(username) && online.get(username).size === 0) {
            online.delete(username);
        }
    }
}

/**
 * Gửi message đến client
 */
function send(ws, payload) {
    try {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
        }
    } catch (err) {
        console.error('Send error:', err);
    }
}

/**
 * Format thời gian theo giờ Việt Nam
 */
function formatVietnamTime(timestamp) {
    const date = new Date(timestamp);
    const vietnamTime = new Date(date.getTime() + (TIMEZONE_OFFSET * 60 * 60 * 1000));

    const year = vietnamTime.getUTCFullYear();
    const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vietnamTime.getUTCDate()).padStart(2, '0');
    const hours = String(vietnamTime.getUTCHours()).padStart(2, '0');
    const minutes = String(vietnamTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(vietnamTime.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Cập nhật danh sách user cho client
 */
async function broadcastUserListUpdate(username, excludeWs = null) {
    try {
        const peopleMessages = await Message.findAll({
            attributes: ['fromUser', 'toTarget'],
            where: {
                type: 'people',
                [Op.or]: [{ fromUser: username }, { toTarget: username }]
            },
            raw: true
        });

        const rooms = await RoomMember.findAll({
            attributes: ['roomName'],
            where: { username },
            raw: true
        });

        const userSet = new Set();
        const roomSet = new Set();

        peopleMessages.forEach(msg => {
            if (msg.fromUser && msg.fromUser !== username) userSet.add(msg.fromUser);
            if (msg.toTarget && msg.toTarget !== username) userSet.add(msg.toTarget);
        });

        rooms.forEach(room => {
            if (room.roomName) roomSet.add(room.roomName);
        });

        const userList = [
            ...Array.from(userSet).map(name => ({ name, type: 0 })),
            ...Array.from(roomSet).map(name => ({ name, type: 1 }))
        ];

        const sockets = online.get(username);
        if (sockets) {
            for (const sock of sockets) {
                if (sock.readyState === WebSocket.OPEN && sock !== excludeWs) {
                    send(sock, {
                        status: 'success',
                        event: 'GET_USER_LIST',
                        data: userList
                    });
                }
            }
        }
    } catch (err) {
        console.error('broadcastUserListUpdate error:', err);
    }
}

/**
 * Kiểm tra authentication
 */
async function requireAuth(ws, event) {
    if (!ws.username || !ws.session_id) {
        send(ws, { status: 'fail', event, mes: 'NOT_AUTHENTICATED' });
        return false;
    }

    try {
        const session = await ActiveUserSession.findOne({
            where: { username: ws.username, session_id: ws.session_id }
        });

        if (!session) {
            send(ws, { status: 'fail', event, mes: 'SESSION_INVALID_OR_EXPIRED' });
            return false;
        }

        session.last_heartbeat = Date.now();
        await session.save();
        return true;
    } catch (error) {
        console.error('requireAuth error:', error);
        send(ws, { status: 'fail', event, mes: 'AUTH_ERROR' });
        return false;
    }
}

// Khởi tạo WebSocket server
async function startServer() {
    // Initialize database first
    await initializeDatabase();

    // Tạo HTTP server
    const http = require('http');
    const server = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('WebSocket server is running\n');
    });

    // Tạo WebSocket server
    const wss = new WebSocket.Server({
        server,
        path: WS_PATH,
        verifyClient: (info, cb) => {
            console.log('Client connecting from:', info.origin || info.req.headers.origin);
            cb(true);
        }
    });

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 HTTP server running at http://0.0.0.0:${PORT}`);
        console.log(`🚀 WebSocket server running at ws://0.0.0.0:${PORT}${WS_PATH}`);
    });

    // Broadcast functions
    function broadcastToAll(payload, excludeWs = null) {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
                send(client, payload);
            }
        });
    }

    async function broadcastToRoom(roomName, payload, excludeWs = null) {
        try {
            const members = await RoomMember.findAll({ where: { roomName } });
            const memberUsernames = new Set(members.map(m => m.username));

            for (const [username, sockets] of online.entries()) {
                if (memberUsernames.has(username)) {
                    for (const sock of sockets) {
                        if (sock.readyState === WebSocket.OPEN && sock !== excludeWs) {
                            send(sock, payload);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('broadcastToRoom error:', err);
        }
    }

    function broadcastToUser(username, payload, excludeWs = null) {
        const sockets = online.get(username);
        if (!sockets) return;

        for (const sock of sockets) {
            if (sock.readyState === WebSocket.OPEN && sock !== excludeWs) {
                send(sock, payload);
            }
        }
    }

    // KEEP-ALIVE
    setInterval(() => {
        wss.clients.forEach(ws => {
            if (ws.isAlive === false) {
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping(() => { });
        });
    }, KEEP_ALIVE_INTERVAL);

    // Cleanup session
    setInterval(async () => {
        try {
            const expiredSessions = await ActiveUserSession.findAll({
                where: { last_heartbeat: { [Op.lt]: Date.now() - SESSION_TIMEOUT } }
            });

            for (const session of expiredSessions) {
                if (!online.has(session.username)) {
                    await session.destroy();
                    broadcastToAll({
                        status: 'success',
                        event: 'USER_STATUS',
                        data: { username: session.username, online: false }
                    });
                }
            }
        } catch (error) {
            console.error('Session cleanup error:', error);
        }
    }, SESSION_CLEANUP_INTERVAL);

    // WebSocket connection handler
    wss.on('connection', (ws, req) => {
        ws.isAlive = true;

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        console.log('🟢 Client connected from:', req.socket.remoteAddress);

        ws.on('close', async () => {
            try {
                if (ws.username && online.has(ws.username)) {
                    const set = online.get(ws.username);
                    set.delete(ws);

                    if (set.size === 0) {
                        online.delete(ws.username);
                        console.log(`🔴 User ${ws.username} disconnected`);

                        setTimeout(async () => {
                            if (!online.has(ws.username)) {
                                await ActiveUserSession.destroy({ where: { username: ws.username } });
                                broadcastToAll({
                                    status: 'success',
                                    event: 'USER_STATUS',
                                    data: { username: ws.username, online: false }
                                });
                            }
                        }, LOGOUT_DELAY);
                    }
                }
            } catch (err) {
                console.error('Error in close handler:', err);
            }
        });

        ws.on('error', (err) => console.error('WebSocket error:', err));

        ws.on('message', async (raw) => {
            let msg;
            try {
                msg = JSON.parse(raw.toString());
            } catch (err) {
                console.error('Invalid JSON:', raw.toString());
                return;
            }

            const { action, data } = msg || {};
            if (action !== 'onchat' || !data) return;

            const { event, data: payload } = data;
            if (!event) return;

            console.log(`📨 Event: ${event}`);

            try {
                switch (event) {
                    case 'REGISTER': {
                        const user = payload?.user?.trim();
                        const pass = payload?.pass ?? '';

                        if (!user || !pass) {
                            return send(ws, { status: 'fail', event: 'REGISTER', mes: 'INVALID_INPUT' });
                        }

                        const exists = await User.findByPk(user);
                        if (exists) {
                            return send(ws, { status: 'fail', event: 'REGISTER', mes: 'USER_EXISTS' });
                        }

                        await User.create({ username: user, password: pass });
                        send(ws, { status: 'success', event: 'REGISTER', data: {} });
                        break;
                    }

                    case 'LOGIN': {
                        const inputUser = payload?.user?.trim();
                        const pass = payload?.pass;

                        if (!inputUser || !pass) {
                            return send(ws, {
                                status: 'fail',
                                event: 'LOGIN',
                                mes: 'Vui lòng nhập đầy đủ thông tin đăng nhập'
                            });
                        }

                        const user = await User.findByPk(inputUser);
                        if (!user || user.password !== pass) {
                            return send(ws, {
                                status: 'fail',
                                event: 'LOGIN',
                                mes: 'Tên đăng nhập hoặc mật khẩu không chính xác'
                            });
                        }

                        const existing = await ActiveUserSession.findOne({ where: { username: inputUser } });
                        if (existing) {
                            console.log(`[LOGIN] Đã có session trước của ${inputUser}`);
                            await forceLogoutUser(inputUser);
                            try {
                                await existing.destroy();
                            } catch (e) {
                                console.error(e);
                            }
                        }

                        const sessionId = SESSION_PREFIX + uuidv4().replace(/-/g, '');
                        const code = RELOGIN_PREFIX + uuidv4().replace(/-/g, '').substring(0, 10);

                        await ActiveUserSession.create({
                            username: inputUser,
                            session_id: sessionId,
                            device_info: req.headers['user-agent'] || 'unknown',
                            ip_address: req.socket.remoteAddress || 'unknown',
                            last_heartbeat: Date.now(),
                            created_at: Date.now(),
                        });

                        user.reloginCode = code;
                        await user.save();

                        ws.username = inputUser;
                        ws.session_id = sessionId;

                        if (!online.has(inputUser)) online.set(inputUser, new Set());
                        online.get(inputUser).add(ws);

                        send(ws, {
                            status: 'success',
                            event: 'LOGIN',
                            data: { RE_LOGIN_CODE: code, user: inputUser }
                        });

                        broadcastToAll({
                            status: 'success',
                            event: 'USER_STATUS',
                            data: { username: inputUser, online: true }
                        });
                        break;
                    }

                    case 'RE_LOGIN': {
                        const inputUser = payload?.user?.trim();
                        const code = payload?.code;

                        if (!inputUser || !code) {
                            return send(ws, { status: 'fail', event: 'RE_LOGIN', mes: 'Thiếu thông tin' });
                        }

                        const user = await User.findByPk(inputUser);
                        if (!user || user.reloginCode !== code) {
                            return send(ws, {
                                status: 'fail',
                                event: 'RE_LOGIN',
                                mes: 'Mã đăng nhập lại không hợp lệ'
                            });
                        }

                        let session = await ActiveUserSession.findOne({ where: { username: inputUser } });
                        if (!session) {
                            return send(ws, { status: 'fail', event: 'RE_LOGIN', mes: 'SESSION_EXPIRED' });
                        }

                        session.last_heartbeat = Date.now();
                        await session.save();

                        ws.username = inputUser;
                        ws.session_id = session.session_id;

                        if (!online.has(inputUser)) online.set(inputUser, new Set());
                        online.get(inputUser).add(ws);

                        await forceLogoutUser(inputUser, ws, 'Phiên bị thay thế bởi tab/máy khác.');

                        send(ws, {
                            status: 'success',
                            event: 'RE_LOGIN',
                            data: { RE_LOGIN_CODE: code, user: inputUser }
                        });

                        broadcastToAll({
                            status: 'success',
                            event: 'USER_STATUS',
                            data: { username: inputUser, online: true }
                        });
                        break;
                    }

                    case 'HEARTBEAT': {
                        if (!await requireAuth(ws, event)) return;
                        send(ws, { status: 'success', event: 'HEARTBEAT', data: {} });
                        break;
                    }

                    case 'LOGOUT': {
                        if (!await requireAuth(ws, event)) return;
                        const username = ws.username;
                        // Xóa session khỏi database
                        await ActiveUserSession.destroy({ where: { username } });

                        // Xóa khỏi online map (KHÔNG terminate socket hiện tại)
                        if (online.has(username)) {
                            online.delete(username);
                        }
                        // Gửi phản hồi thành công
                        send(ws, { status: 'success', event: 'LOGOUT', data: {} });
                        // Broadcast offline cho tất cả client khác
                        broadcastToAll({
                            status: 'success',
                            event: 'USER_STATUS',
                            data: { username, online: false }
                        });
                        // Dọn dẹp ws
                        ws.username = null;
                        ws.session_id = null;
                        console.log(`✅ User ${username} logout thành công (graceful)`);
                        break;
                    }

                    case 'CREATE_ROOM': {
                        if (!await requireAuth(ws, event)) return;

                        const name = payload?.name?.trim();
                        if (!name) return send(ws, { status: 'fail', event: 'CREATE_ROOM', mes: 'INVALID_INPUT' });

                        const exists = await Room.findOne({ where: { name } });
                        if (exists) return send(ws, { status: 'fail', event: 'CREATE_ROOM', mes: 'ROOM_EXISTS' });

                        await Room.create({ name });
                        await RoomMember.create({ roomName: name, username: ws.username });

                        send(ws, { status: 'success', event: 'CREATE_ROOM', data: {} });
                        break;
                    }

                    case 'JOIN_ROOM': {
                        if (!await requireAuth(ws, event)) return;

                        const name = payload?.name?.trim();
                        if (!name) return send(ws, { status: 'fail', event: 'JOIN_ROOM', mes: 'INVALID_INPUT' });

                        const room = await Room.findOne({ where: { name } });
                        if (!room) return send(ws, { status: 'fail', event: 'JOIN_ROOM', mes: 'ROOM_NOT_FOUND' });

                        const existingMember = await RoomMember.findOne({
                            where: { roomName: name, username: ws.username }
                        });

                        if (!existingMember) {
                            await RoomMember.create({ roomName: name, username: ws.username });
                        }

                        send(ws, {
                            status: 'success',
                            event: 'JOIN_ROOM',
                            data: { name }
                        });

                        await broadcastUserListUpdate(ws.username, ws);
                        break;
                    }

                    case 'SEND_CHAT': {
                        if (!await requireAuth(ws, event)) return;

                        const type = payload?.type;
                        const to = payload?.to?.trim();
                        const mes = (payload?.mes ?? '').trim();
                        const clientTimestamp = payload?.timestamp;

                        if (!type || !to || !mes) {
                            return send(ws, {
                                status: 'fail',
                                event: 'SEND_CHAT',
                                mes: 'INVALID_INPUT'
                            });
                        }

                        if (type === 'room') {
                            const room = await Room.findOne({ where: { name: to } });
                            if (!room) return send(ws, { status: 'fail', event: 'SEND_CHAT', mes: 'ROOM_NOT_FOUND' });

                            const isMember = await RoomMember.findOne({ where: { roomName: to, username: ws.username } });
                            if (!isMember) return send(ws, { status: 'fail', event: 'SEND_CHAT', mes: 'NOT_ROOM_MEMBER' });
                        } else if (type === 'people') {
                            const user = await User.findByPk(to);
                            if (!user) return send(ws, { status: 'fail', event: 'SEND_CHAT', mes: 'USER_NOT_FOUND' });
                        } else {
                            return send(ws, { status: 'fail', event: 'SEND_CHAT', mes: 'INVALID_TYPE' });
                        }

                        const timestamp = clientTimestamp || Date.now();

                        const message = await Message.create({
                            type,
                            fromUser: ws.username,
                            toTarget: to,
                            content: mes,
                            timestamp
                        });

                        const messageData = {
                            ...message.toJSON(),
                            type: type === 'room' ? 1 : 0,
                            createAt: formatVietnamTime(timestamp),
                            originalTimestamp: timestamp
                        };

                        send(ws, { status: 'success', event: 'SEND_CHAT', data: messageData });

                        const broadcastPayload = { status: 'success', event: 'NEW_CHAT', data: messageData };

                        if (type === 'room') {
                            await broadcastToRoom(to, broadcastPayload, ws);
                        } else {
                            broadcastToUser(to, broadcastPayload, ws);
                        }
                        break;
                    }

                    case 'CHECK_USER_EXISTS': {
                        const username = payload?.username?.trim();
                        if (!username) return send(ws, { status: 'fail', event: 'CHECK_USER_EXISTS', mes: 'INVALID_INPUT' });

                        try {
                            const user = await User.findByPk(username);
                            const exists = !!user;
                            send(ws, { status: 'success', event: 'CHECK_USER_EXISTS', data: { username, exists } });
                        } catch (err) {
                            send(ws, { status: 'fail', event: 'CHECK_USER_EXISTS', mes: 'SERVER_ERROR' });
                        }
                        break;
                    }

                    case 'CHECK_ROOM_EXISTS': {
                        const roomName = payload?.name?.trim();
                        console.log(`[SERVER] Nhận CHECK_ROOM_EXISTS: roomName=${roomName}`);

                        if (!roomName) {
                            return send(ws, { status: 'fail', event: 'CHECK_ROOM_EXISTS', mes: 'INVALID_INPUT' });
                        }

                        try {
                            const room = await Room.findOne({ where: { name: roomName } });
                            const exists = !!room;
                            console.log(`[SERVER] Nhóm "${roomName}" tồn tại? ${exists}`);
                            send(ws, {
                                status: 'success',
                                event: 'CHECK_ROOM_EXISTS',
                                data: { name: roomName, exists }
                            });
                        } catch (err) {
                            console.error('[SERVER] Lỗi CHECK_ROOM_EXISTS:', err);
                            send(ws, { status: 'fail', event: 'CHECK_ROOM_EXISTS', mes: 'SERVER_ERROR' });
                        }
                        break;
                    }

                    case 'GET_USER_LIST': {
                        if (!await requireAuth(ws, event)) return;

                        const currentUser = ws.username;

                        const peopleMessages = await Message.findAll({
                            attributes: ['fromUser', 'toTarget'],
                            where: {
                                type: 'people',
                                [Op.or]: [{ fromUser: currentUser }, { toTarget: currentUser }]
                            },
                            raw: true
                        });

                        const rooms = await RoomMember.findAll({
                            attributes: ['roomName'],
                            where: { username: currentUser },
                            raw: true
                        });

                        const userSet = new Set();
                        const roomSet = new Set();

                        peopleMessages.forEach(msg => {
                            if (msg.fromUser && msg.fromUser !== currentUser) userSet.add(msg.fromUser);
                            if (msg.toTarget && msg.toTarget !== currentUser) userSet.add(msg.toTarget);
                        });

                        rooms.forEach(room => {
                            if (room.roomName) roomSet.add(room.roomName);
                        });

                        const userList = [
                            ...Array.from(userSet).map(username => ({ name: username, type: 0 })),
                            ...Array.from(roomSet).map(roomName => ({ name: roomName, type: 1 }))
                        ];

                        send(ws, { status: 'success', event: 'GET_USER_LIST', data: userList });
                        break;
                    }

                    case 'GET_PEOPLE_CHAT_MES': {
                        if (!await requireAuth(ws, event)) return;

                        const name = payload?.name?.trim();
                        if (!name) return send(ws, { status: 'fail', event: 'GET_PEOPLE_CHAT_MES', mes: 'INVALID_INPUT' });

                        const peer = await User.findByPk(name);
                        if (!peer) return send(ws, { status: 'fail', event: 'GET_PEOPLE_CHAT_MES', mes: 'USER_NOT_FOUND' });

                        const messages = await Message.findAll({
                            where: {
                                type: 'people',
                                [Op.or]: [
                                    { fromUser: ws.username, toTarget: name },
                                    { fromUser: name, toTarget: ws.username }
                                ]
                            },
                            order: [['timestamp', 'ASC']]
                        });

                        const formattedMessages = messages.map(msg => {
                            return {
                                ...msg.toJSON(),
                                type: 0,
                                createAt: formatVietnamTime(msg.timestamp),
                                originalTimestamp: msg.timestamp
                            };
                        });

                        send(ws, { status: 'success', event: 'GET_PEOPLE_CHAT_MES', data: formattedMessages });
                        break;
                    }

                    case 'GET_ROOM_CHAT_MES': {
                        if (!await requireAuth(ws, event)) return;

                        const name = payload?.name?.trim();
                        if (!name) return send(ws, { status: 'fail', event: 'GET_ROOM_CHAT_MES', mes: 'INVALID_INPUT' });

                        const room = await Room.findOne({ where: { name } });
                        if (!room) return send(ws, { status: 'fail', event: 'GET_ROOM_CHAT_MES', mes: 'ROOM_NOT_FOUND' });

                        const isMember = await RoomMember.findOne({ where: { roomName: name, username: ws.username } });
                        if (!isMember) return send(ws, { status: 'fail', event: 'GET_ROOM_CHAT_MES', mes: 'NOT_ROOM_MEMBER' });

                        const messages = await Message.findAll({
                            where: { type: 'room', toTarget: name },
                            order: [['timestamp', 'ASC']]
                        });

                        const chatData = messages.map(msg => {
                            return {
                                ...msg.toJSON(),
                                type: 1,
                                createAt: formatVietnamTime(msg.timestamp),
                                originalTimestamp: msg.timestamp
                            };
                        });

                        const members = await RoomMember.findAll({ where: { roomName: name } });
                        const userList = members.map(m => ({ name: m.username }));

                        send(ws, {
                            status: 'success',
                            event: 'GET_ROOM_CHAT_MES',
                            data: { chatData, userList, own: ws.username }
                        });
                        break;
                    }

                    case 'CHECK_USER': {
                        const user = payload?.user?.trim();
                        if (!user) return send(ws, { status: 'fail', event: 'CHECK_USER', mes: 'INVALID_INPUT' });

                        const isOnline = online.has(user);
                        send(ws, { status: 'success', event: 'CHECK_USER', data: { online: isOnline } });
                        break;
                    }

                    default:
                        send(ws, { status: 'fail', event: 'UNKNOWN_EVENT', mes: 'EVENT_NOT_SUPPORTED' });
                }
            } catch (err) {
                console.error(`⚠️ Server error handling ${event}:`, err);
                send(ws, { status: 'fail', event: event || 'UNKNOWN', mes: 'SERVER_ERROR' });
            }
        });
    });
}

// Xử lý lỗi
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});

// Start server
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});