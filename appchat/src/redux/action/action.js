// action/action.js

// Auth actions
export const REGISTER_SUCCESS = 'REGISTER_SUCCESS';
export const REGISTER_ERROR = 'REGISTER_ERROR';
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_ERROR = 'LOGIN_ERROR';
export const RE_LOGIN_SUCCESS = 'RE_LOGIN_SUCCESS';
export const RE_LOGIN_ERROR = 'RE_LOGIN_ERROR';
export const LOGOUT_SUCCESS = 'LOGOUT_SUCCESS';
export const LOGOUT_ERROR = 'LOGOUT_ERROR';
export const FORCE_LOGOUT = 'FORCE_LOGOUT';

// User list actions
export const GET_USER_LIST_SUCCESS = 'GET_USER_LIST_SUCCESS';
export const GET_USER_LIST_FAILURE = 'GET_USER_LIST_FAILURE';

// Message actions
export const GET_PEOPLE_CHAT_MES_SUCCESS = 'GET_PEOPLE_CHAT_MES_SUCCESS';
export const GET_PEOPLE_CHAT_MES_FAILURE = 'GET_PEOPLE_CHAT_MES_FAILURE';
export const GET_ROOM_CHAT_MES_SUCCESS = 'GET_ROOM_CHAT_MES_SUCCESS';
export const GET_ROOM_CHAT_MES_FAILURE = 'GET_ROOM_CHAT_MES_FAILURE';
export const SEND_CHAT_TO_PEOPLE_SUCCESS = 'SEND_CHAT_TO_PEOPLE_SUCCESS';
export const SEND_CHAT_TO_PEOPLE_FAILURE = 'SEND_CHAT_TO_PEOPLE_FAILURE';
export const SEND_CHAT_TO_ROOM_SUCCESS = 'SEND_CHAT_TO_ROOM_SUCCESS';
export const SEND_CHAT_TO_ROOM_FAILURE = 'SEND_CHAT_TO_ROOM_FAILURE';
export const SEND_CHAT_SUCCESS = 'SEND_CHAT_SUCCESS';
export const APPEND_OWN_MESSAGE = 'APPEND_OWN_MESSAGE';
export const APPEND_INCOMING_MESSAGE = 'APPEND_INCOMING_MESSAGE';
export const CLEAR_CHAT_MESSAGES = 'CLEAR_CHAT_MESSAGES';
export const CLEAR_ALL_MESSAGES = 'CLEAR_ALL_MESSAGES';

// Room actions
export const CREATE_ROOM_SUCCESS = 'CREATE_ROOM_SUCCESS';
export const CREATE_ROOM_ERROR = 'CREATE_ROOM_ERROR';
export const JOIN_ROOM_SUCCESS = 'JOIN_ROOM_SUCCESS';
export const JOIN_ROOM_FAILURE = 'JOIN_ROOM_FAILURE';

// User status actions
export const CHECK_USER_SUCCESS = 'CHECK_USER_SUCCESS';
export const CHECK_USER_ERROR = 'CHECK_USER_ERROR';
export const UPDATE_USER_ONLINE_STATUS = 'UPDATE_USER_ONLINE_STATUS';

// Chat actions
export const SET_ACTIVE_CHAT = 'SET_ACTIVE_CHAT';
export const UPDATE_LAST_MESSAGE = 'UPDATE_LAST_MESSAGE';

// Reset actions
export const RESET_STATUS = 'RESET_STATUS';
export const RESET_APP_STATE = 'RESET_APP_STATE';

// Action creators
export const registerSuccess = (data) => ({ type: REGISTER_SUCCESS, data });
export const registerError = (error) => ({ type: REGISTER_ERROR, error });

export const loginSuccess = (data) => ({ type: LOGIN_SUCCESS, data });
export const loginError = (error) => ({ type: LOGIN_ERROR, error });

export const reLoginSuccess = (data) => ({ type: RE_LOGIN_SUCCESS, data });
export const reLoginError = (error) => ({ type: RE_LOGIN_ERROR, error });

export const logoutSuccess = (data) => ({ type: LOGOUT_SUCCESS, data });
export const logoutError = (error) => ({ type: LOGOUT_ERROR, error });

export const getUserListSuccess = (data) => ({ type: GET_USER_LIST_SUCCESS, data });
export const getUserListFailure = (error) => ({ type: GET_USER_LIST_FAILURE, error });

export const getPeopleChatMesSuccess = (data) => ({ type: GET_PEOPLE_CHAT_MES_SUCCESS, data });
export const getPeopleChatMesFailure = (error) => ({ type: GET_PEOPLE_CHAT_MES_FAILURE, error });

export const getRoomChatMesSuccess = (data) => ({ type: GET_ROOM_CHAT_MES_SUCCESS, data });
export const getRoomChatMesFailure = (error) => ({ type: GET_ROOM_CHAT_MES_FAILURE, error });

export const sendChatToPeopleSuccess = (payload) => ({ type: SEND_CHAT_TO_PEOPLE_SUCCESS, payload });
export const sendChatToPeopleFailure = (error) => ({ type: SEND_CHAT_TO_PEOPLE_FAILURE, error });

export const sendChatToRoomSuccess = (payload) => ({ type: SEND_CHAT_TO_ROOM_SUCCESS, payload });
export const sendChatToRoomFailure = (error) => ({ type: SEND_CHAT_TO_ROOM_FAILURE, error });

export const sendChatSuccess = (payload) => ({ type: SEND_CHAT_SUCCESS, payload });

export const appendOwnMessage = (payload) => ({ type: APPEND_OWN_MESSAGE, payload });
export const appendIncomingMessage = (payload) => ({ type: APPEND_INCOMING_MESSAGE, payload });

export const createRoomSuccess = (data) => ({ type: CREATE_ROOM_SUCCESS, data });
export const createRoomError = (error) => ({ type: CREATE_ROOM_ERROR, error });

export const joinRoomSuccess = (data) => ({ type: JOIN_ROOM_SUCCESS, data });
export const joinRoomFailure = (error) => ({ type: JOIN_ROOM_FAILURE, error });

export const checkUserSuccess = (payload, data) => ({ type: CHECK_USER_SUCCESS, payload, data });
export const checkUserError = (error) => ({ type: CHECK_USER_ERROR, error });

export const setActiveChat = (payload) => ({ type: SET_ACTIVE_CHAT, payload });

export const updateUserOnlineStatus = (payload, data) => ({
    type: UPDATE_USER_ONLINE_STATUS,
    payload,
    data
});

// export const updateChatListOrder = (payload) => ({
//     type: UPDATE_CHAT_LIST_ORDER,
//     payload
// });

export const updateLastMessage = (payload) => ({
    type: UPDATE_LAST_MESSAGE,
    payload
});

export const clearChatMessages = (chatName) => ({
    type: CLEAR_CHAT_MESSAGES,
    payload: chatName
});

export const clearAllMessages = () => ({
    type: CLEAR_ALL_MESSAGES
});

export const resetStatus = () => ({ type: RESET_STATUS });
export const resetAppState = () => ({ type: RESET_APP_STATE });

// Thêm vào cuối file action/action.js

// Chat list order actions
export const UPDATE_CHAT_LIST_ORDER = 'UPDATE_CHAT_LIST_ORDER';
export const MOVE_CHAT_TO_TOP = 'MOVE_CHAT_TO_TOP';
export const ANIMATE_CHAT_MOVEMENT = 'ANIMATE_CHAT_MOVEMENT';

export const updateChatListOrder = (payload) => ({
    type: UPDATE_CHAT_LIST_ORDER,
    payload
});

export const moveChatToTop = (chatName, chatType) => ({
    type: MOVE_CHAT_TO_TOP,
    payload: { chatName, chatType }
});

export const animateChatMovement = (chatName) => ({
    type: ANIMATE_CHAT_MOVEMENT,
    payload: chatName
});

