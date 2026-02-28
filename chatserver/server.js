// server.js
const WebSocket = require('ws');
const {v4: uuidv4} = require('uuid');
const {Op} = require('sequelize');
const {User, ActiveUserSession, Room, RoomMember, Message} = require('./db');
const wss = new WebSocket.Server({port: 8080, path: '/chat'});
const online = new Map(); // username → Set<ws>
async function forceLogoutUser(username, excludeWs = null, reason = 'Đăng nhập từ nơi khác') {
    const sockets = online.get(username);
    if (!sockets) return;
    try {
        for (const sock of Array.from(sockets)) {
            if (sock === excludeWs) continue;
            if (sock.readyState === WebSocket.OPEN) {
                send(sock, {status: 'success', event: 'FORCE_LOGOUT', mes: reason});
            }
            try {
                sock.terminate();
            } catch (e) { /* ignore */
            }
        }
    } finally {
    }
}

function send(ws, payload) {
    try {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
        }
    } catch (err) {
        console.error('Send error:', err);
    }
}

function broadcastToAll(payload, excludeWs = null) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
            send(client, payload);
        }
    });
}

async function broadcastToRoom(roomName, payload, excludeWs = null) {
    try {
        const members = await RoomMember.findAll({where: {roomName}});
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


// Hàm helper để format thời gian theo giờ Việt Nam
function formatVietnamTime(timestamp) {
    const date = new Date(timestamp);
    // Chuyển về giờ Việt Nam (UTC+7)
    const vietnamTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));

    // Format YYYY-MM-DD HH:mm:ss
    const year = vietnamTime.getUTCFullYear();
    const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vietnamTime.getUTCDate()).padStart(2, '0');
    const hours = String(vietnamTime.getUTCHours()).padStart(2, '0');
    const minutes = String(vietnamTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(vietnamTime.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// server.js - Thêm hàm broadcastUserListUpdate
async function broadcastUserListUpdate(username, excludeWs = null) {
    try {
        // Lấy danh sách user/room của user này
        const peopleMessages = await Message.findAll({
            attributes: ['fromUser', 'toTarget'],
            where: {
                type: 'people',
                [Op.or]: [{fromUser: username}, {toTarget: username}]
            },
            raw: true
        });

        const rooms = await RoomMember.findAll({
            attributes: ['roomName'],
            where: {username},
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
            ...Array.from(userSet).map(name => ({name, type: 0})),
            ...Array.from(roomSet).map(name => ({name, type: 1}))
        ];

        // Gửi cập nhật cho tất cả các socket của user này
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

async function requireAuth(ws, event) {
    if (!ws.username || !ws.session_id) {
        send(ws, {status: 'fail', event, mes: 'NOT_AUTHENTICATED'});
        return false;
    }
    const session = await ActiveUserSession.findOne({where: {username: ws.username, session_id: ws.session_id}});
    if (!session) {
        send(ws, {status: 'fail', event, mes: 'SESSION_INVALID_OR_EXPIRED'});
        return false;
    }
    session.last_heartbeat = Date.now();
    await session.save();
    return true;
}

// KEEP-ALIVE
const KEEP_ALIVE_INTERVAL = 30000;
setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
            ws.terminate();
            return;
        }
        ws.isAlive = false;
        ws.ping(() => {
        });
    });
}, KEEP_ALIVE_INTERVAL);
// Cleanup session chết
setInterval(async () => {
    const expiredSessions = await ActiveUserSession.findAll({
        where: {last_heartbeat: {[Op.lt]: Date.now() - 90000}}
    });
    for (const session of expiredSessions) {
        if (!online.has(session.username)) {
            await session.destroy();
            broadcastToAll({
                status: 'success',
                event: 'USER_STATUS',
                data: {username: session.username, online: false}
            });
        }
    }
}, 60000);
wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    console.log('🟢 Client connected');
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
                            await ActiveUserSession.destroy({where: {username: ws.username}});
                            broadcastToAll({
                                status: 'success',
                                event: 'USER_STATUS',
                                data: {username: ws.username, online: false}
                            });
                        }
                    }, 5000);
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
            return;
        }
        const {action, data} = msg || {};
        if (action !== 'onchat' || !data) return;
        const {event, data: payload} = data;
        if (!event) return;
        console.log(`📨 Event: ${event}`, payload);
        try {
            switch (event) {
                case 'REGISTER': {
                    const user = payload?.user?.trim();
                    const pass = payload?.pass ?? '';
                    if (!user || !pass) return send(ws, {status: 'fail', event: 'REGISTER', mes: 'INVALID_INPUT'});
                    const exists = await User.findByPk(user);
                    if (exists) return send(ws, {status: 'fail', event: 'REGISTER', mes: 'USER_EXISTS'});
                    await User.create({username: user, password: pass});
                    send(ws, {status: 'success', event: 'REGISTER', data: {}});
                    break;
                }
                case 'LOGIN': {
                    const inputUser = payload?.user?.trim();
                    const pass = payload?.pass;
                    const user = await User.findByPk(inputUser);
                    if (!inputUser || !pass) {
                        return send(ws, {
                            status: 'fail',
                            event: 'LOGIN',
                            mes: 'Vui lòng nhập đầy đủ thông tin đăng nhập'
                        });
                    }

                    if (!user || user.password !== pass) {
                        return send(ws, {
                            status: 'fail',
                            event: 'LOGIN',
                            mes: 'Tên đăng nhập hoặc mật khẩu không chính xác'
                        });
                    }
                    const existing = await ActiveUserSession.findOne({where: {username: inputUser}});
                    if (existing) {
                        console.log(`[LOGIN] Đã có session trước của ${inputUser}, sẽ force logout các socket cũ`);
                        await forceLogoutUser(inputUser);
                        try {
                            await existing.destroy();
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    const sessionId = 'sess_' + uuidv4().replace(/-/g, '');
                    const code = 'nlu_' + uuidv4().replace(/-/g, '').substring(0, 10);
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
                    send(ws, {status: 'success', event: 'LOGIN', data: {RE_LOGIN_CODE: code, user: inputUser}});
                    broadcastToAll({
                        status: 'success',
                        event: 'USER_STATUS',
                        data: {username: inputUser, online: true}
                    });
                    break;
                }
                case 'RE_LOGIN': {
                    const inputUser = payload?.user?.trim();
                    const code = payload?.code;
                    if (!inputUser || !code) {
                        return send(ws, {status: 'fail', event: 'RE_LOGIN', mes: 'Thiếu thông tin'});
                    }
                    const user = await User.findByPk(inputUser);
                    if (!user || user.reloginCode !== code) {
                        return send(ws, {status: 'fail', event: 'RE_LOGIN', mes: 'Mã đăng nhập lại không hợp lệ'});
                    }
                    let session = await ActiveUserSession.findOne({where: {username: inputUser}});
                    if (!session) {
                        return send(ws, {status: 'fail', event: 'RE_LOGIN', mes: 'SESSION_EXPIRED'});
                    }
                    session.last_heartbeat = Date.now();
                    await session.save();
                    ws.username = inputUser;
                    ws.session_id = session.session_id;
                    if (!online.has(inputUser)) online.set(inputUser, new Set());
                    online.get(inputUser).add(ws);
                    await forceLogoutUser(inputUser, ws, 'Phiên bị thay thế bởi tab/máy khác.');
                    send(ws, {status: 'success', event: 'RE_LOGIN', data: {RE_LOGIN_CODE: code, user: inputUser}});
                    broadcastToAll({
                        status: 'success',
                        event: 'USER_STATUS',
                        data: {username: inputUser, online: true}
                    });
                    break;
                }
                case 'HEARTBEAT': {
                    if (!await requireAuth(ws, event)) return;
                    send(ws, {status: 'success', event: 'HEARTBEAT', data: {}});
                    break;
                }
                case 'LOGOUT': {
                    if (!await requireAuth(ws, event)) return;
                    const username = ws.username;
                    await ActiveUserSession.destroy({where: {username}});
                    await forceLogoutUser(username, null, 'Đã đăng xuất');
                    if (online.has(username)) online.delete(username);
                    ws.username = null;
                    ws.session_id = null;
                    send(ws, {status: 'success', event: 'LOGOUT', data: {}});
                    broadcastToAll({status: 'success', event: 'USER_STATUS', data: {username, online: false}});
                    break;
                }
                case 'CREATE_ROOM': {
                    if (!await requireAuth(ws, event)) return;
                    const name = payload?.name?.trim();
                    if (!name) return send(ws, {status: 'fail', event: 'CREATE_ROOM', mes: 'INVALID_INPUT'});
                    const exists = await Room.findOne({where: {name}});
                    if (exists) return send(ws, {status: 'fail', event: 'CREATE_ROOM', mes: 'ROOM_EXISTS'});
                    await Room.create({name});
                    await RoomMember.create({roomName: name, username: ws.username});
                    send(ws, {status: 'success', event: 'CREATE_ROOM', data: {}});
                    break;
                }
                // case 'JOIN_ROOM': {
                //     if (!await requireAuth(ws, event)) return;
                //     const name = payload?.name?.trim();
                //     if (!name) return send(ws, {status: 'fail', event: 'JOIN_ROOM', mes: 'INVALID_INPUT'});
                //     const room = await Room.findOne({where: {name}});
                //     if (!room) return send(ws, {status: 'fail', event: 'JOIN_ROOM', mes: 'ROOM_NOT_FOUND'});
                //     await RoomMember.findOrCreate({
                //         where: {roomName: name, username: ws.username},
                //         defaults: {roomName: name, username: ws.username}
                //     });
                //     send(ws, {status: 'success', event: 'JOIN_ROOM', data: {name}});
                //     break;
                // }

                case 'JOIN_ROOM': {
                    if (!await requireAuth(ws, event)) return;
                    const name = payload?.name?.trim();
                    if (!name) return send(ws, { status: 'fail', event: 'JOIN_ROOM', mes: 'INVALID_INPUT' });

                    const room = await Room.findOne({ where: { name } });
                    if (!room) return send(ws, { status: 'fail', event: 'JOIN_ROOM', mes: 'ROOM_NOT_FOUND' });

                    // Kiểm tra đã là member chưa
                    const existingMember = await RoomMember.findOne({
                        where: { roomName: name, username: ws.username }
                    });

                    if (!existingMember) {
                        await RoomMember.create({ roomName: name, username: ws.username });
                    }

                    // Gửi response thành công
                    send(ws, {
                        status: 'success',
                        event: 'JOIN_ROOM',
                        data: { name }
                    });

                    // Broadcast cập nhật user list cho user này
                    await broadcastUserListUpdate(ws.username, ws);

                    break;
                }
                case 'SEND_CHAT': {
                    if (!await requireAuth(ws, event)) return;
                    const type = payload?.type;
                    const to = payload?.to?.trim();
                    const mes = (payload?.mes ?? '').trim();
                    const clientTimestamp = payload?.timestamp;

                    if (!type || !to || !mes) return send(ws, {
                        status: 'fail',
                        event: 'SEND_CHAT',
                        mes: 'INVALID_INPUT'
                    });

                    if (type === 'room') {
                        const room = await Room.findOne({where: {name: to}});
                        if (!room) return send(ws, {status: 'fail', event: 'SEND_CHAT', mes: 'ROOM_NOT_FOUND'});
                        const isMember = await RoomMember.findOne({where: {roomName: to, username: ws.username}});
                        if (!isMember) return send(ws, {status: 'fail', event: 'SEND_CHAT', mes: 'NOT_ROOM_MEMBER'});
                    } else if (type === 'people') {
                        const user = await User.findByPk(to);
                        if (!user) return send(ws, {status: 'fail', event: 'SEND_CHAT', mes: 'USER_NOT_FOUND'});
                    } else {
                        return send(ws, {status: 'fail', event: 'SEND_CHAT', mes: 'INVALID_TYPE'});
                    }

                    // Sử dụng timestamp từ client nếu có, nếu không thì dùng thời gian server
                    const timestamp = clientTimestamp || Date.now();

                    // Lưu timestamp gốc (UTC) vào database
                    const message = await Message.create({
                        type,
                        fromUser: ws.username,
                        toTarget: to,
                        content: mes,
                        timestamp // Lưu timestamp UTC
                    });

                    // Format createAt theo giờ Việt Nam để gửi xuống client
                    const messageData = {
                        ...message.toJSON(),
                        type: type === 'room' ? 1 : 0,
                        createAt: formatVietnamTime(timestamp), // Sử dụng hàm format mới
                        originalTimestamp: timestamp // Giữ lại timestamp gốc nếu cần
                    };

                    send(ws, {status: 'success', event: 'SEND_CHAT', data: messageData});
                    const broadcastPayload = {status: 'success', event: 'NEW_CHAT', data: messageData};
                    if (type === 'room') {
                        await broadcastToRoom(to, broadcastPayload, ws);
                    } else {
                        broadcastToUser(to, broadcastPayload, ws);
                    }
                    break;
                }
                case 'CHECK_USER_EXISTS': {
                    const username = payload?.username?.trim();
                    if (!username) return send(ws, {status: 'fail', event: 'CHECK_USER_EXISTS', mes: 'INVALID_INPUT'});
                    try {
                        const user = await User.findByPk(username);
                        const exists = !!user;
                        send(ws, {status: 'success', event: 'CHECK_USER_EXISTS', data: {username, exists}});
                    } catch (err) {
                        send(ws, {status: 'fail', event: 'CHECK_USER_EXISTS', mes: 'SERVER_ERROR'});
                    }
                    break;
                }
                case 'CHECK_ROOM_EXISTS': {
                    const roomName = payload?.name?.trim();
                    console.log(`[SERVER] Nhận CHECK_ROOM_EXISTS: roomName=${roomName}`);
                    if (!roomName) {
                        return send(ws, {status: 'fail', event: 'CHECK_ROOM_EXISTS', mes: 'INVALID_INPUT'});
                    }
                    try {
                        const room = await Room.findOne({where: {name: roomName}});
                        const exists = !!room;
                        console.log(`[SERVER] Nhóm "${roomName}" tồn tại? ${exists}`);
                        send(ws, {
                            status: 'success',
                            event: 'CHECK_ROOM_EXISTS',
                            data: {name: roomName, exists}
                        });
                    } catch (err) {
                        console.error('[SERVER] Lỗi CHECK_ROOM_EXISTS:', err);
                        send(ws, {status: 'fail', event: 'CHECK_ROOM_EXISTS', mes: 'SERVER_ERROR'});
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
                            [Op.or]: [{fromUser: currentUser}, {toTarget: currentUser}]
                        },
                        raw: true
                    });
                    const rooms = await RoomMember.findAll({
                        attributes: ['roomName'],
                        where: {username: currentUser},
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
                        ...Array.from(userSet).map(username => ({name: username, type: 0})),
                        ...Array.from(roomSet).map(roomName => ({name: roomName, type: 1}))
                    ];
                    send(ws, {status: 'success', event: 'GET_USER_LIST', data: userList});
                    break;
                }
                case 'GET_PEOPLE_CHAT_MES': {
                    if (!await requireAuth(ws, event)) return;
                    const name = payload?.name?.trim();
                    if (!name) return send(ws, {status: 'fail', event: 'GET_PEOPLE_CHAT_MES', mes: 'INVALID_INPUT'});

                    const peer = await User.findByPk(name);
                    if (!peer) return send(ws, {status: 'fail', event: 'GET_PEOPLE_CHAT_MES', mes: 'USER_NOT_FOUND'});

                    const messages = await Message.findAll({
                        where: {
                            type: 'people',
                            [Op.or]: [
                                {fromUser: ws.username, toTarget: name},
                                {fromUser: name, toTarget: ws.username}
                            ]
                        },
                        order: [['timestamp', 'ASC']]
                    });

                    const formattedMessages = messages.map(msg => {
                        return {
                            ...msg.toJSON(),
                            type: 0,
                            createAt: formatVietnamTime(msg.timestamp), // Format theo giờ Việt Nam
                            originalTimestamp: msg.timestamp
                        };
                    });

                    send(ws, {status: 'success', event: 'GET_PEOPLE_CHAT_MES', data: formattedMessages});
                    break;
                }

// Trong case 'GET_ROOM_CHAT_MES'
                case 'GET_ROOM_CHAT_MES': {
                    if (!await requireAuth(ws, event)) return;
                    const name = payload?.name?.trim();
                    if (!name) return send(ws, {status: 'fail', event: 'GET_ROOM_CHAT_MES', mes: 'INVALID_INPUT'});

                    const room = await Room.findOne({where: {name}});
                    if (!room) return send(ws, {status: 'fail', event: 'GET_ROOM_CHAT_MES', mes: 'ROOM_NOT_FOUND'});

                    const isMember = await RoomMember.findOne({where: {roomName: name, username: ws.username}});
                    if (!isMember) return send(ws, {status: 'fail', event: 'GET_ROOM_CHAT_MES', mes: 'NOT_ROOM_MEMBER'});

                    const messages = await Message.findAll({
                        where: {type: 'room', toTarget: name},
                        order: [['timestamp', 'ASC']]
                    });

                    const chatData = messages.map(msg => {
                        return {
                            ...msg.toJSON(),
                            type: 1,
                            createAt: formatVietnamTime(msg.timestamp), // Format theo giờ Việt Nam
                            originalTimestamp: msg.timestamp
                        };
                    });

                    const members = await RoomMember.findAll({where: {roomName: name}});
                    const userList = members
                        .filter(m => m.username !== ws.username)
                        .map(m => ({name: m.username}));

                    send(ws, {
                        status: 'success',
                        event: 'GET_ROOM_CHAT_MES',
                        data: {chatData, userList, own: ws.username}
                    });
                    break;
                }
                case 'CHECK_USER': {
                    const user = payload?.user?.trim();
                    if (!user) return send(ws, {status: 'fail', event: 'CHECK_USER', mes: 'INVALID_INPUT'});
                    const isOnline = online.has(user);
                    send(ws, {status: 'success', event: 'CHECK_USER', data: {online: isOnline}});
                    break;
                }
                default:
                    send(ws, {status: 'fail', event: 'UNKNOWN_EVENT', mes: 'EVENT_NOT_SUPPORTED'});
            }
        } catch (err) {
            console.error(`⚠️ Server error handling ${event}:`, err);
            send(ws, {status: 'fail', event: event || 'UNKNOWN', mes: 'SERVER_ERROR'});
        }
    });
});
console.log('🚀 WebSocket server running at ws://140.238.54.136:8080/chat');