import {
    GET_USER_LIST_FAILURE,
    GET_USER_LIST_SUCCESS,
    LOGIN_ERROR,
    LOGIN_SUCCESS,
    RE_LOGIN_ERROR,
    RE_LOGIN_SUCCESS,
    SEND_CHAT_TO_PEOPLE_FAILURE,
    SEND_CHAT_TO_PEOPLE_SUCCESS,
    LOGOUT_SUCCESS,
    LOGOUT_ERROR,
    RESET_STATUS,
    GET_PEOPLE_CHAT_MES_SUCCESS,
    GET_PEOPLE_CHAT_MES_FAILURE,
    JOIN_ROOM_SUCCESS,
    JOIN_ROOM_FAILURE,
    CREATE_ROOM_SUCCESS,
    CREATE_ROOM_ERROR,
    CHECK_USER_SUCCESS,
    CHECK_USER_ERROR,
    REGISTER_SUCCESS,
    REGISTER_ERROR,
    SEND_CHAT_TO_ROOM_SUCCESS,
    SEND_CHAT_TO_ROOM_FAILURE,
    GET_ROOM_CHAT_MES_SUCCESS,
    GET_ROOM_CHAT_MES_FAILURE,
    SEND_CHAT_SUCCESS,
    UPDATE_USER_ONLINE_STATUS,
    RESET_APP_STATE,
    APPEND_OWN_MESSAGE,
    APPEND_INCOMING_MESSAGE,
    SET_ACTIVE_CHAT,
    UPDATE_CHAT_LIST_ORDER,
    UPDATE_LAST_MESSAGE,
    MOVE_CHAT_TO_TOP,
    ANIMATE_CHAT_MOVEMENT,

} from "../action/action";
import {format} from 'date-fns';

const initialState = {
    register: {},
    login: {},
    logout: {},
    listUser: {},
    messages: {data: [], error: null},
    messagesByChat: {},
    active: {name: '', type: null},
    userList: {data: null, error: null},
    checkUser: {status: null, data: null, error: null},
    userStatuses: [],
    userOnlineStatus: {},
    joinRoom: {status: null, data: null, error: null},
    createRoom: {status: null, data: null, error: null},
    lastMessageTimes: {}, // { "chatName": timestamp }
    lastMessages: {}, // { "chatName": "nội dung tin nhắn cuối" }
    lastMessageSenders: {},
    roomMembers: {},
    file: [],
};

const socketReducer = (state = initialState, action) => {
    if (!action || !action.type) return state;

    switch (action.type) {
        case RESET_APP_STATE:
            return {...initialState};

        case REGISTER_SUCCESS:
            return {...state, register: {status: 'success', data: action.data}};
        case REGISTER_ERROR:
            return {...state, register: {status: 'error', error: action.error}};

        case LOGIN_SUCCESS:
        case RE_LOGIN_SUCCESS:
            return {...state, login: {status: 'success', data: action.data}};
        case LOGIN_ERROR:
        case RE_LOGIN_ERROR:
            return {...state, login: {status: 'error', error: action.error}};

        case GET_USER_LIST_SUCCESS: {
            const userList = action.data || [];
            const username = localStorage.getItem("username");
            const filtered = userList.filter(
                (user) => !(user.name === username && user.type === 0)
            );

            // Lấy messages từ state
            const messages = state.messages?.data || [];
            const lastMessageTimes = {};
            const lastMessages = {};
            const lastMessageSenders = {}; // Thêm để lưu người gửi tin nhắn cuối

            filtered.forEach(chat => {
                // Tìm tất cả messages của chat này
                const chatMessages = messages.filter(msg => {
                    if (chat.type === 0) {
                        return (msg.fromUser === chat.name && msg.toTarget === username) ||
                            (msg.fromUser === username && msg.toTarget === chat.name);
                    } else {
                        return msg.toTarget === chat.name;
                    }
                });

                if (chatMessages.length > 0) {
                    // Sắp xếp theo thời gian giảm dần và lấy tin nhắn mới nhất
                    const sortedMsgs = [...chatMessages].sort((a, b) =>
                        new Date(b.createAt) - new Date(a.createAt)
                    );
                    const lastMsg = sortedMsgs[0];

                    lastMessageTimes[chat.name] = new Date(lastMsg.createAt).getTime();
                    lastMessages[chat.name] = lastMsg.content;
                    lastMessageSenders[chat.name] = lastMsg.fromUser; // Lưu người gửi
                } else {
                    lastMessageTimes[chat.name] = 0;
                    lastMessages[chat.name] = '';
                    lastMessageSenders[chat.name] = '';
                }
            });

            return {
                ...state,
                userList: {data: filtered, error: null},
                lastMessageTimes,
                lastMessages,
                lastMessageSenders
            };
        }

        case GET_USER_LIST_FAILURE:
            return {...state, userList: {data: null, error: action.error}};

        case SEND_CHAT_TO_PEOPLE_SUCCESS: {
            const newmess = action.payload;
            if (!newmess) return state;
            return {
                ...state,
                messages: {data: [...state.messages.data, newmess], error: null},
            };
        }
        case SEND_CHAT_TO_PEOPLE_FAILURE:
            return {...state, messages: {data: null, error: action.error}};

        case SEND_CHAT_TO_ROOM_SUCCESS: {
            const newMessage = action.payload;
            if (!newMessage) return state;
            return {
                ...state,
                messages: {data: [...state.messages.data, newMessage], error: null},
            };
        }
        case SEND_CHAT_TO_ROOM_FAILURE:
            return {...state, messages: {data: null, error: action.error}};

        case SEND_CHAT_SUCCESS: {
            const newmess = action.payload;
            if (!newmess) return state;
            newmess.createAt = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
            return {
                ...state,
                messages: {data: [...(state.messages?.data || []), newmess], error: null},
            };
        }

        case LOGOUT_SUCCESS:
            return {
                ...initialState,
                logout: {status: 'success', data: action.data || {}},
            };
        case LOGOUT_ERROR:
            return {...state, logout: {status: 'error', error: action.error}};

        case RESET_STATUS:
            return {
                ...state,
                logout: {},
                register: {},
                joinRoom: {status: null, data: null, error: null},   // ← thêm dòng này
                createRoom: {status: null, data: null, error: null}
            };

        // socketReducer.js - Thêm case JOIN_ROOM_SUCCESS
        case JOIN_ROOM_SUCCESS: {
            const roomJoin = action.data?.name; // Lấy tên nhóm từ response
            if (!roomJoin) return state;

            // Lấy userList hiện tại
            const currentUserList = state.userList?.data || [];
            const username = localStorage.getItem("username");

            // Kiểm tra xem nhóm đã tồn tại trong danh sách chưa
            const roomExists = currentUserList.some(
                item => item.name === roomJoin && item.type === 1
            );

            // Nếu chưa có, thêm vào userList
            const updatedUserList = roomExists
                ? currentUserList
                : [...currentUserList, {name: roomJoin, type: 1}];

            // Lọc bỏ chính mình khỏi userList nếu có
            const filtered = updatedUserList.filter(
                (user) => !(user.name === username && user.type === 0)
            );

            return {
                ...state,
                messages: {...state.messages, error: null},
                userList: {data: filtered, error: null},
                joinRoom: {
                    data: action.data,
                    error: null,
                    status: 'success',
                },
            };
        }

        case JOIN_ROOM_FAILURE:
            return {
                ...state,
                joinRoom: {...state.joinRoom, error: action.error, status: 'error'},
            };

        case CREATE_ROOM_SUCCESS: {
            const room = action.data;
            if (!room) return state;
            return {
                ...state,
                messages: {...state.messages, error: null},
                createRoom: {
                    data: [...(state.createRoom.data || []), room],
                    error: null,
                    status: 'success',
                },
            };
        }
        case CREATE_ROOM_ERROR:
            return {
                ...state,
                createRoom: {...state.createRoom, error: action.error, status: 'error'},
            };

        case CHECK_USER_SUCCESS:
            if (!action.payload || !action.data) return state;
            return {
                ...state,
                userOnlineStatus: {
                    ...state.userOnlineStatus,
                    [action.payload]: action.data,
                },
            };
        case CHECK_USER_ERROR:
            return {...state, userStatuses: []};

        // socketReducer.js - Sửa case APPEND_OWN_MESSAGE và APPEND_INCOMING_MESSAGE

        case GET_ROOM_CHAT_MES_SUCCESS:
        case GET_PEOPLE_CHAT_MES_SUCCESS: {
            const chatName = state.active?.name;
            if (!chatName) return state;

            const isRoom = action.type === GET_ROOM_CHAT_MES_SUCCESS;
            const chatData = isRoom ? action.data?.chatData || [] : action.data || [];
            const members = isRoom ? action.data?.userList || [] : [];

            const existing = state.messagesByChat[chatName] || [];
            const merged = [...existing, ...chatData]
                .filter((msg, idx, self) => idx === self.findIndex(m => m.id === msg.id))
                .sort((a, b) => new Date(a.timestamp || a.createAt) - new Date(b.timestamp || b.createAt));

            return {
                ...state,
                messagesByChat: { ...state.messagesByChat, [chatName]: merged },
                messages: { data: merged },
                roomMembers: isRoom
                    ? { ...state.roomMembers, [chatName]: members }
                    : state.roomMembers
            };
        }
        case APPEND_OWN_MESSAGE:
        case APPEND_INCOMING_MESSAGE: {
            const newMsg = action.payload;
            if (!newMsg) return state;

            const currentUser = localStorage.getItem('username');
            const chatName = newMsg.type === 1
                ? newMsg.toTarget
                : (newMsg.fromUser === currentUser ? newMsg.toTarget : newMsg.fromUser);

            let currentMsgs = state.messagesByChat[chatName] || [];

            // FIX DOUBLE: Nếu đã có tin cùng timestamp → thay thế (tin tạm → tin thật)
            const existingIndex = currentMsgs.findIndex(m =>
                m.timestamp === newMsg.timestamp && m.content === newMsg.content
            );

            let updatedMsgs;
            if (existingIndex !== -1) {
                updatedMsgs = [...currentMsgs];
                updatedMsgs[existingIndex] = newMsg;   // thay thế
            } else {
                updatedMsgs = [...currentMsgs, newMsg];
            }

            updatedMsgs.sort((a, b) =>
                new Date(a.timestamp || a.createAt) - new Date(b.timestamp || b.createAt)
            );

            const isCurrentChat = state.active?.name === chatName;
            const msgTime = new Date(newMsg.createAt || newMsg.timestamp).getTime();

            return {
                ...state,
                messagesByChat: { ...state.messagesByChat, [chatName]: updatedMsgs },
                messages: isCurrentChat ? { data: updatedMsgs, error: null } : state.messages,
                lastMessageTimes: { ...state.lastMessageTimes, [chatName]: msgTime },
                lastMessages: { ...state.lastMessages, [chatName]: newMsg.content },
                lastMessageSenders: { ...state.lastMessageSenders, [chatName]: newMsg.fromUser }
            };
        }

        case SET_ACTIVE_CHAT: {
            const chatName = action.payload.name;
            const cached = state.messagesByChat[chatName] || [];
            return {
                ...state,
                active: action.payload,
                messages: {data: cached}
            };
        }

        case GET_PEOPLE_CHAT_MES_FAILURE:
        case GET_ROOM_CHAT_MES_FAILURE:
            return {...state, messages: {data: [], error: action.error || 'Lỗi tải tin nhắn'}};

        case UPDATE_USER_ONLINE_STATUS:
            if (!action.payload || !action.data) return state;
            return {
                ...state,
                userOnlineStatus: {
                    ...state.userOnlineStatus,
                    [action.payload]: action.data,
                },
            };

        // Thêm case mới để cập nhật thứ tự chat
        case UPDATE_CHAT_LIST_ORDER: {
            const chatItem = action.payload;
            if (!chatItem || !chatItem.name) return state;

            const currentUserList = state.userList?.data || [];
            const username = localStorage.getItem("username");

            // Cập nhật thời gian cho chat này
            const currentTime = Date.now();
            const updatedLastMessageTimes = {
                ...state.lastMessageTimes,
                [chatItem.name]: currentTime
            };

            // Sắp xếp lại userList dựa trên thời gian tin nhắn cuối
            const sortedUserList = [...currentUserList].sort((a, b) => {
                const timeA = updatedLastMessageTimes[a.name] || 0;
                const timeB = updatedLastMessageTimes[b.name] || 0;
                return timeB - timeA; // Mới nhất lên đầu
            });

            // Lọc bỏ chính mình
            const filtered = sortedUserList.filter(
                (user) => !(user.name === username && user.type === 0)
            );

            return {
                ...state,
                userList: {data: filtered, error: null},
                lastMessageTimes: updatedLastMessageTimes
            };
        }

        case UPDATE_LAST_MESSAGE: {
            const {chatName, lastMessage, timestamp} = action.payload;
            return {
                ...state,
                lastMessages: {
                    ...state.lastMessages,
                    [chatName]: lastMessage
                },
                lastMessageTimes: {
                    ...state.lastMessageTimes,
                    [chatName]: timestamp || Date.now()
                }
            };
        }
        // Thêm vào socketReducer.js trong phần switch case

        case MOVE_CHAT_TO_TOP: {
            const { chatName, chatType } = action.payload;
            const currentUserList = state.userList?.data || [];

            // Tìm chat cần move
            const chatToMove = currentUserList.find(
                item => item.name === chatName && item.type === chatType
            );

            if (!chatToMove) return state;

            // Lọc bỏ chat đó khỏi list
            const otherChats = currentUserList.filter(
                item => !(item.name === chatName && item.type === chatType)
            );

            // Đưa chat lên đầu
            const newUserList = [chatToMove, ...otherChats];

            return {
                ...state,
                userList: { data: newUserList, error: null },
                movingChat: chatName // Lưu để animation
            };
        }

        case ANIMATE_CHAT_MOVEMENT: {
            return {
                ...state,
                movingChat: action.payload
            };
        }

        default:
            return state;
    }
};

export default socketReducer;