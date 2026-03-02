// src/components/chat/ChatTab.js
import React, {useEffect, useState, useCallback, useRef} from 'react';
import {useLocation, useNavigate} from "react-router-dom";
import {useSelector, useDispatch} from "react-redux";
import {motion, AnimatePresence} from 'framer-motion';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faUserPlus,
    faUsers,
    faSignInAlt,
    faArrowLeft,
    faSearch,
    faTimes,
    faCheck,
    faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';
import {Modal, Button, Form, InputGroup, Spinner, Badge} from 'react-bootstrap';
import {ToastContainer, toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../../assets/chattab.css';

// Actions
import {resetStatus, setActiveChat} from "../../../../redux/action/action";

// Socket functions
import {
    create_room,
    getPeopleChatMes,
    getRoomChatMes,
    getUsersList,
    initializeSocket,
    joinRoom,
    reLoginUser,
    checkUserExists,
    checkRoomExists,
} from "../../../../socket/socket";

// Utils
import {decode} from "../../../../utils/convert-text";

// Animation variants
const chatItemVariants = {
    initial: {opacity: 0, y: 20},
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 25
        }
    },
    exit: {
        opacity: 0,
        x: -100,
        transition: {
            duration: 0.2
        }
    },
    hover: {
        scale: 1.02,
        backgroundColor: "#f8f9fa",
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 25
        }
    },
    tap: {
        scale: 0.98
    }
};

const modalVariants = {
    hidden: {opacity: 0, scale: 0.8},
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 25
        }
    },
    exit: {
        opacity: 0,
        scale: 0.8,
        transition: {
            duration: 0.2
        }
    }
};

// Debounce helper
function debounce(func, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
}

function ChatTab({toggleSidebar}) {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const location = useLocation();

    // ==================== REDUX STATE ====================
    const login = useSelector(state => state.login);
    const userList = useSelector(state => state.userList?.data || []);
    const userOnlineStatus = useSelector(state => state.userOnlineStatus || {});
    const messages = useSelector(state => state.messages?.data || []);

    // States cho last message
    const lastMessageTimes = useSelector(state => state.lastMessageTimes || {});
    const lastMessages = useSelector(state => state.lastMessages || {});
    const lastMessageSenders = useSelector(state => state.lastMessageSenders || {});

    const createRoomStatus = useSelector(state => state.createRoom?.status);
    const joinRoomStatus = useSelector(state => state.joinRoom?.status);

    // ==================== LOCAL STATE ====================
    // Modal state
    const [activeModal, setActiveModal] = useState(null);
    const [modalHistory, setModalHistory] = useState([]);

    // Form states
    const [nameUser, setNameUser] = useState('');
    const [groupName, setGroupName] = useState('');
    const [roomName, setRoomName] = useState('');

    // Validation states
    const [searching, setSearching] = useState(false);
    const [exists, setExists] = useState(null);
    const [lastChecked, setLastChecked] = useState('');
    const [searchingRoom, setSearchingRoom] = useState(false);
    const [roomExists, setRoomExists] = useState(null);
    const [lastCheckedRoom, setLastCheckedRoom] = useState('');

    // UI states
    const [activeTab, setActiveTab] = useState('direct-tab');
    const [searchTerm, setSearchTerm] = useState('');
    const [isJoiningNewGroup, setIsJoiningNewGroup] = useState(false);
    const [targetJoinRoom, setTargetJoinRoom] = useState('');
    const [selectedChat, setSelectedChat] = useState(null);
    const [notifications, setNotifications] = useState({});

    // Refs
    const createToastShown = useRef(false);
    const joinToastShown = useRef(false);
    const searchInputRef = useRef(null);

    // ==================== COMPUTED VALUES ====================
    const currentUser = localStorage.getItem("username");

// Format last message theo kiểu Messenger (đã fix media + emoji + ảnh)
    const formatLastMessage = (chat, type) => {
        const content = lastMessages[chat.name];
        const sender = lastMessageSenders[chat.name];
        if (!content) return "Chưa có tin nhắn";

        let displayText = '';

        // Xử lý media/GIF/ảnh/video/file/audio
        if (content.startsWith('IMAGE:')) {
            displayText = "📷 Hình ảnh";
        } else if (content.startsWith('FILE:')) {
            displayText = "📎 File";
        } else if (content.startsWith('VIDEO:')) {
            displayText = "🎥 Video";
        } else if (content.startsWith('GIF:')) {
            displayText = "🎨 GIF";
        } else if (content.startsWith('AUDIO:')) {
            displayText = "🎵 Audio";
        }
        // Text thường hoặc emoji thuần
        else {
            const decoded = decode(content);
            displayText = decoded.length > 35 ? decoded.substring(0, 35) + '...' : decoded;
        }

        // Áp dụng prefix giống tin nhắn thường → title nhỏ nhất quán
        if (type === 0) { // Direct chat
            return sender === currentUser ? `Bạn: ${displayText}` : displayText;
        } else { // Group chat
            if (sender === currentUser) {
                return `Bạn: ${displayText}`;
            } else {
                const senderName = sender ? sender.split(' ').pop() || sender : 'Ai đó';
                return `${senderName}: ${displayText}`;
            }
        }
    };

    // Format thời gian như Messenger
    const formatTime = (timestamp) => {
        if (!timestamp || timestamp === 0) return '';

        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const diffMinutes = Math.floor(diff / 60000);
        const diffHours = Math.floor(diff / 3600000);
        const diffDays = Math.floor(diff / 86400000);

        if (diffMinutes < 1) return 'Vừa xong';
        if (diffMinutes < 60) return `${diffMinutes} phút`;
        if (diffHours < 24 && date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Hôm qua';
        }
        if (diffDays < 7) {
            const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            return days[date.getDay()];
        }
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit'
        });
    };

    // Tạo object chứa thông tin chat để sort
    const createChatList = (type) => {
        const list = userList
            .filter(u => u.type === type && (type === 0 ? u.name !== currentUser : true))
            .map(item => ({
                ...item,
                lastTime: lastMessageTimes[item.name] || 0,
                lastMessage: lastMessages[item.name],
                lastSender: lastMessageSenders[item.name],
                displayMessage: formatLastMessage(item, type),
                unread: notifications[item.name] || 0
            }));

        return list.sort((a, b) => {
            const timeA = a.lastTime || 0;
            const timeB = b.lastTime || 0;
            return timeB - timeA;
        });
    };

    const friendsList = createChatList(0)
        .filter(friend => friend.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const groupsList = createChatList(1)
        .map(group => ({
            ...group,
            memberCount: Math.floor(Math.random() * 20) + 2
        }))
        .filter(group => group.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // ==================== EFFECTS ====================

    useEffect(() => {
        if (location.pathname.includes('/group/')) {
            setActiveTab('groups-tab');
            const groupName = decodeURIComponent(location.pathname.split('/group/')[1]);
            setSelectedChat({
                name: groupName,
                type: 1
            });
        } else if (location.pathname.includes('/friend/')) {
            setActiveTab('direct-tab');
            const friendName = decodeURIComponent(location.pathname.split('/friend/')[1]);
            setSelectedChat({
                name: friendName,
                type: 0
            });
        }
    }, [location.pathname]);

    useEffect(() => {
        if (activeModal === 'createGroup' || activeModal === 'joinGroup') {
            dispatch(resetStatus());
        }
    }, [activeModal, dispatch]);

    useEffect(() => {
        if (login?.status) {
            getUsersList();
        }
    }, [login?.status]);

    useEffect(() => {
        if (!login?.status) {
            const reLoginToken = localStorage.getItem("reLogin");
            if (reLoginToken) {
                initializeSocket('wss://serverchat.up.railway.app/chat');
                reLoginUser(currentUser, reLoginToken);
            } else {
                navigate("/login");
            }
        }
    }, [login?.status, navigate, currentUser]);

    // Kiểm tra user tồn tại (debounced)
    const debouncedCheck = useCallback(debounce(async (username) => {
        const trimmed = username.trim();
        if (!trimmed || trimmed === currentUser) {
            setExists(null);
            setSearching(false);
            return;
        }
        if (trimmed === lastChecked) return;

        setSearching(true);
        setLastChecked(trimmed);

        try {
            const userExists = await checkUserExists(trimmed);
            setExists(userExists);
        } catch (err) {
            setExists(false);
            toast.error("Không thể kiểm tra người dùng");
        } finally {
            setSearching(false);
        }
    }, 600), [lastChecked, currentUser]);

    useEffect(() => {
        if (activeModal === 'newChat' && nameUser.trim()) {
            debouncedCheck(nameUser);
        } else if (activeModal !== 'newChat') {
            setExists(null);
            setSearching(false);
            setLastChecked('');
        }
    }, [nameUser, activeModal, debouncedCheck]);

    // Kiểm tra room tồn tại (debounced)
    const debouncedCheckRoom = useCallback(debounce(async (name) => {
        const trimmed = name.trim();
        if (!trimmed) {
            setRoomExists(null);
            setSearchingRoom(false);
            return;
        }
        if (trimmed === lastCheckedRoom) return;

        setSearchingRoom(true);
        setLastCheckedRoom(trimmed);

        try {
            const exists = await checkRoomExists(trimmed);
            setRoomExists(exists);
        } catch (err) {
            setRoomExists(false);
            toast.error("Không thể kiểm tra nhóm");
        } finally {
            setSearchingRoom(false);
        }
    }, 600), [lastCheckedRoom]);

    useEffect(() => {
        if (activeModal === 'joinGroup' && roomName.trim()) {
            debouncedCheckRoom(roomName);
        } else if (activeModal !== 'joinGroup') {
            setRoomExists(null);
            setSearchingRoom(false);
            setLastCheckedRoom('');
        }
    }, [roomName, activeModal, debouncedCheckRoom]);

    // Xử lý JOIN_ROOM success
    useEffect(() => {
        if (joinRoomStatus === "success" && activeModal === 'joinGroup' && !joinToastShown.current) {
            joinToastShown.current = true;
            const room = roomName.trim();

            toast.success(
                <div>
                    <strong>Tham gia nhóm thành công!</strong>
                    <br/>
                    <small>Đang chuyển đến nhóm {room}</small>
                </div>,
                {
                    toastId: "join-group-success",
                    autoClose: 2000,
                    icon: "🎉"
                }
            );

            getUsersList();

            const roomExists = groupsList.some(g => g.name === room);

            if (roomExists) {
                setTimeout(() => {
                    handleClose();
                    navigate(`/Home/group/${room}`);
                }, 500);
            } else {
                setIsJoiningNewGroup(true);
                setTargetJoinRoom(room);
            }

            setTimeout(() => {
                dispatch(resetStatus());
                joinToastShown.current = false;
            }, 1000);
        }
    }, [joinRoomStatus, activeModal, roomName, groupsList, dispatch, navigate]);

    // Theo dõi groupsList để tự động navigate
    useEffect(() => {
        if (!isJoiningNewGroup || !targetJoinRoom) return;

        if (groupsList.some(g => g.name === targetJoinRoom)) {
            setIsJoiningNewGroup(false);
            setTargetJoinRoom('');
            handleClose();
            navigate(`/Home/group/${targetJoinRoom}`);
        }
    }, [groupsList, isJoiningNewGroup, targetJoinRoom, navigate]);

    // Xử lý CREATE_ROOM success
    useEffect(() => {
        if (activeModal !== 'createGroup') {
            createToastShown.current = false;
            return;
        }

        if (createRoomStatus === "success" && !createToastShown.current) {
            createToastShown.current = true;
            const group = groupName.trim();

            toast.success(
                <div>
                    <strong>Tạo nhóm thành công!</strong>
                    <br/>
                    <small>Đang chuyển đến nhóm {group}</small>
                </div>,
                {
                    toastId: "create-group-success",
                    autoClose: 1500,
                    icon: "🎉"
                }
            );

            getUsersList();
            setActiveTab('groups-tab');
            dispatch(resetStatus());
            handleClose();

            setTimeout(() => navigate(`/Home/group/${group}`), 800);

        } else if (createRoomStatus === "error") {
            toast.error("Tên nhóm đã tồn tại hoặc lỗi!");
            dispatch(resetStatus());
            createToastShown.current = false;
        }
    }, [createRoomStatus, activeModal, groupName, dispatch, navigate]);

    // ==================== HANDLERS ====================

    const handleCreateNewChat = () => {
        const trimmed = nameUser.trim();

        if (!trimmed) {
            toast.warning("Vui lòng nhập tên người dùng!");
            return;
        }

        if (trimmed === currentUser) {
            toast.info("Bạn không thể nhắn tin cho chính mình!");
            return;
        }

        if (exists === false) {
            toast.error(`Người dùng "${trimmed}" không tồn tại!`);
            return;
        }

        if (searching || exists !== true) {
            toast.info("Vui lòng chờ kiểm tra...");
            return;
        }

        getUsersList();
        getPeopleChatMes(trimmed);
        dispatch(setActiveChat({name: trimmed, type: 0}));
        setSelectedChat({name: trimmed, type: 0});
        navigate(`/Home/friend/${trimmed}`);
        handleClose();

        toast.success(
            <div>
                <strong>Đã mở cuộc trò chuyện!</strong>
                <br/>
                <small>Bắt đầu nhắn tin với {trimmed}</small>
            </div>,
            {icon: "💬"}
        );
    };

    const handleCreateRoom = () => {
        const trimmed = groupName.trim();
        if (!trimmed) {
            toast.warning("Vui lòng nhập tên nhóm!");
            return;
        }
        create_room(trimmed);
    };

    const handleJoinRoom = () => {
        const trimmed = roomName.trim();
        if (!trimmed) {
            toast.warning("Vui lòng nhập tên nhóm!");
            return;
        }

        setActiveTab('groups-tab');

        if (groupsList.some(g => g.name === trimmed)) {
            dispatch(setActiveChat({name: trimmed, type: 1}));
            setSelectedChat({name: trimmed, type: 1});
            navigate(`/Home/group/${trimmed}`);
            handleClose();
            return;
        }

        if (roomExists === false) {
            toast.error(`Nhóm "${trimmed}" không tồn tại!`);
            return;
        }

        if (searchingRoom || roomExists !== true) {
            toast.info("Vui lòng chờ kiểm tra nhóm...");
            return;
        }

        joinRoom(trimmed);
    };

    const handleUserClick = (item) => {
        if (notifications[item.name]) {
            setNotifications(prev => ({
                ...prev,
                [item.name]: 0
            }));
        }

        setSelectedChat({
            name: item.name,
            type: item.type
        });

        dispatch(setActiveChat({name: item.name, type: item.type}));

        if (item.type === 0) {
            setActiveTab('direct-tab');
            getPeopleChatMes(item.name);
            navigate(`/Home/friend/${item.name}`);
        } else {
            setActiveTab('groups-tab');
            getRoomChatMes(item.name);
            navigate(`/Home/group/${item.name}`);
        }
    };

    const handleClose = () => {
        setActiveModal(null);
        setModalHistory([]);
        setNameUser('');
        setGroupName('');
        setRoomName('');
        setExists(null);
        setSearching(false);
        setLastChecked('');
        setRoomExists(null);
        setSearchingRoom(false);
        setLastCheckedRoom('');
        createToastShown.current = false;
        joinToastShown.current = false;
        setIsJoiningNewGroup(false);
        setTargetJoinRoom('');
    };

    const handleBack = () => {
        if (modalHistory.length > 0) {
            const previousModal = modalHistory[modalHistory.length - 1];
            setModalHistory(prev => prev.slice(0, -1));
            setActiveModal(previousModal);
        } else {
            setActiveModal('main');
        }
    };

    const openModal = (modalName) => {
        if (activeModal) {
            setModalHistory(prev => [...prev, activeModal]);
        }
        setActiveModal(modalName);
    };

    const clearSearch = () => {
        setSearchTerm('');
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    // ==================== RENDER ====================

    return (
        <motion.div
            className="d-flex flex-column h-100 chat-tab-container"
            initial={{opacity: 0, x: -20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.3}}
        >
            {/* Header */}
            <motion.div
                className="tab-header d-flex align-items-center border-bottom px-3 py-3"
                initial={{y: -20, opacity: 0}}
                animate={{y: 0, opacity: 1}}
                transition={{delay: 0.1}}
            >
                <motion.h4
                    className="mb-0 flex-grow-1"
                    whileHover={{scale: 1.02}}
                >
                    Chats
                </motion.h4>
                <motion.div
                    whileHover={{scale: 1.1, rotate: 90}}
                    whileTap={{scale: 0.9}}
                >
                    <FontAwesomeIcon
                        icon={faPlus}
                        size="lg"
                        className="text-primary cursor-pointer"
                        onClick={() => openModal('main')}
                        style={{cursor: 'pointer'}}
                    />
                </motion.div>
                <motion.button
                    className="btn btn-icon d-xl-none ms-3"
                    onClick={toggleSidebar}
                    whileHover={{scale: 1.1}}
                    whileTap={{scale: 0.9}}
                >
                    <i className="ri-menu-line fs-4"/>
                </motion.button>
            </motion.div>

            {/* Search Bar */}
            <motion.div
                className="px-3 py-2 border-bottom"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.15}}
            >
                <div className="search-wrapper position-relative">
                    <FontAwesomeIcon
                        icon={faSearch}
                        className="search-icon position-absolute text-muted"
                        style={{
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            zIndex: 10
                        }}
                    />
                    <Form.Control
                        ref={searchInputRef}
                        type="text"
                        placeholder="Tìm kiếm cuộc trò chuyện..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pe-4 py-2"
                        style={{
                            borderRadius: "30px",
                            paddingLeft: "40px"
                        }}
                    />
                    {searchTerm && (
                        <motion.button
                            className="position-absolute border-0 bg-transparent"
                            style={{right: '12px', top: '2px', zIndex: 10}}
                            onClick={clearSearch}
                            initial={{opacity: 0, scale: 0}}
                            animate={{opacity: 1, scale: 1}}
                            exit={{opacity: 0, scale: 0}}
                            whileHover={{scale: 1.1}}
                        >
                            <FontAwesomeIcon icon={faTimes} className="text-muted"/>
                        </motion.button>
                    )}
                </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
                className="px-3 py-2 border-bottom"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.2}}
            >
                <ul className="nav nav-pills nav-fill gap-2" id="chat-tabs" role="tablist">
                    <li className="nav-item flex-grow-1" role="presentation">
                        <motion.button
                            className={`nav-link w-100 ${activeTab === 'direct-tab' ? 'active' : ''}`}
                            onClick={() => setActiveTab('direct-tab')}
                            whileHover={{scale: 1.02}}
                            whileTap={{scale: 0.98}}
                            transition={{type: "spring", stiffness: 400}}
                        >
                            <div className="d-flex align-items-center justify-content-center gap-2">
                                <span>Bạn bè</span>
                                {friendsList.length > 0 && (
                                    <Badge bg="primary" pill>
                                        {friendsList.length}
                                    </Badge>
                                )}
                            </div>
                        </motion.button>
                    </li>
                    <li className="nav-item flex-grow-1" role="presentation">
                        <motion.button
                            className={`nav-link w-100 ${activeTab === 'groups-tab' ? 'active' : ''}`}
                            onClick={() => setActiveTab('groups-tab')}
                            whileHover={{scale: 1.02}}
                            whileTap={{scale: 0.98}}
                            transition={{type: "spring", stiffness: 400}}
                        >
                            <div className="d-flex align-items-center justify-content-center gap-2">
                                <span>Nhóm</span>
                                {groupsList.length > 0 && (
                                    <Badge bg="success" pill>
                                        {groupsList.length}
                                    </Badge>
                                )}
                            </div>
                        </motion.button>
                    </li>
                </ul>
            </motion.div>

            {/* Danh sách chat */}
            <motion.div
                className="flex-grow-1 overflow-auto hide-scrollbar px-3 pt-2"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.25}}
            >
                <div className="tab-content">
                    {/* Friends Tab */}
                    <div className={`tab-pane fade ${activeTab === 'direct-tab' ? 'show active' : ''}`} id="direct-tab">
                        {friendsList.length === 0 ? (
                            <motion.div
                                className="text-center py-5"
                                initial={{opacity: 0, y: 20}}
                                animate={{opacity: 1, y: 0}}
                                transition={{delay: 0.3}}
                            >
                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatType: "reverse"
                                    }}
                                >
                                    <span className="display-1">💬</span>
                                </motion.div>
                                <p className="text-muted mt-3">
                                    {searchTerm ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có cuộc trò chuyện nào'}
                                </p>
                                {!searchTerm && (
                                    <motion.button
                                        className="btn btn-outline-primary mt-2"
                                        onClick={() => openModal('newChat')}
                                        whileHover={{scale: 1.05}}
                                        whileTap={{scale: 0.95}}
                                    >
                                        <FontAwesomeIcon icon={faUserPlus} className="me-2"/>
                                        Bắt đầu chat mới
                                    </motion.button>
                                )}
                            </motion.div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                <ul className="list-unstyled mb-0">
                                    {friendsList.map((user, index) => {
                                        const isOnline = userOnlineStatus[user.name] === "online";

                                        return (
                                            <motion.li
                                                key={user.name}
                                                variants={chatItemVariants}
                                                initial="initial"
                                                animate="animate"
                                                exit="exit"
                                                whileHover="hover"
                                                whileTap="tap"
                                                custom={index}
                                                transition={{delay: index * 0.03}}
                                                className={`contact-item p-3 mb-2 rounded cursor-pointer ${
                                                    selectedChat?.name === user.name && selectedChat?.type === 0 ? 'active-chat' : ''
                                                }`}
                                                onClick={() => handleUserClick(user)}
                                                style={{cursor: 'pointer'}}
                                            >
                                                {user.unread > 0 && (
                                                    <motion.div
                                                        className="position-absolute top-0 start-0 bg-primary"
                                                        style={{
                                                            width: '4px',
                                                            height: '100%'
                                                        }}
                                                        initial={{height: 0}}
                                                        animate={{height: '100%'}}
                                                        transition={{duration: 0.3}}
                                                    />
                                                )}

                                                <div className="d-flex align-items-center">
                                                    <div className="position-relative me-3">
                                                        <motion.div
                                                            className={`avatar1 avatar1-md ${isOnline ? 'avatar1-online' : 'avatar1-offline'}`}
                                                            whileHover={{scale: 1.1}}
                                                            whileTap={{scale: 0.95}}
                                                        >
                                                            <span className="avatar1-label bg-soft-info text-info fs-5">
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </motion.div>

                                                        {isOnline && (
                                                            <motion.span
                                                                className="badge bg-success rounded-circle p-1 position-absolute bottom-0 end-0"
                                                                initial={{scale: 0}}
                                                                animate={{scale: 1}}
                                                                transition={{
                                                                    type: "spring",
                                                                    stiffness: 500,
                                                                    damping: 25
                                                                }}
                                                            />
                                                        )}

                                                        {user.unread > 0 && (
                                                            <motion.span
                                                                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                                                                initial={{scale: 0}}
                                                                animate={{scale: 1}}
                                                                transition={{type: "spring"}}
                                                            >
                                                                {user.unread}
                                                            </motion.span>
                                                        )}
                                                    </div>

                                                    <div className="flex-grow-1 min-width-0">
                                                        <div
                                                            className="d-flex justify-content-between align-items-center">
                                                            <motion.h6
                                                                className="mb-0 text-truncate"
                                                                style={{
                                                                    maxWidth: '150px',
                                                                    fontWeight: user.unread > 0 ? 'bold' : 'normal'
                                                                }}
                                                            >
                                                                {user.name}
                                                            </motion.h6>
                                                            {user.lastTime > 0 && (
                                                                <motion.small
                                                                    className="text-muted ms-2"
                                                                    style={{fontSize: '0.7rem'}}
                                                                    initial={{opacity: 0}}
                                                                    animate={{opacity: 1}}
                                                                >
                                                                    {formatTime(user.lastTime)}
                                                                </motion.small>
                                                            )}
                                                        </div>

                                                        <motion.div
                                                            className="d-flex justify-content-between align-items-center"
                                                            animate={{
                                                                opacity: user.lastMessage ? 1 : 0.5
                                                            }}
                                                        >
                                                            <small
                                                                className={`text-truncate ${user.unread > 0 ? 'fw-bold text-dark' : 'text-muted'}`}
                                                                style={{maxWidth: '180px', fontSize: '0.85rem'}}
                                                            >
                                                                {user.displayMessage}
                                                            </small>

                                                            {user.unread > 0 && (
                                                                <motion.div
                                                                    initial={{scale: 0}}
                                                                    animate={{scale: 1}}
                                                                    transition={{type: "spring"}}
                                                                >
                                                                    <FontAwesomeIcon
                                                                        icon={faCheck}
                                                                        className="text-primary ms-1"
                                                                        style={{fontSize: '0.8rem'}}
                                                                    />
                                                                </motion.div>
                                                            )}
                                                        </motion.div>
                                                    </div>
                                                </div>
                                            </motion.li>
                                        );
                                    })}
                                </ul>
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Groups Tab */}
                    <div className={`tab-pane fade ${activeTab === 'groups-tab' ? 'show active' : ''}`} id="groups-tab">
                        {groupsList.length === 0 ? (
                            <motion.div
                                className="text-center py-5"
                                initial={{opacity: 0, y: 20}}
                                animate={{opacity: 1, y: 0}}
                                transition={{delay: 0.3}}
                            >
                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatType: "reverse"
                                    }}
                                >
                                    <span className="display-1">👥</span>
                                </motion.div>
                                <p className="text-muted mt-3">
                                    {searchTerm ? 'Không tìm thấy nhóm nào' : 'Chưa tham gia nhóm nào'}
                                </p>
                                {!searchTerm && (
                                    <div className="d-flex gap-2 justify-content-center">
                                        <motion.button
                                            className="btn btn-outline-primary"
                                            onClick={() => openModal('createGroup')}
                                            whileHover={{scale: 1.05}}
                                            whileTap={{scale: 0.95}}
                                        >
                                            <FontAwesomeIcon icon={faUsers} className="me-2"/>
                                            Tạo nhóm
                                        </motion.button>
                                        <motion.button
                                            className="btn btn-outline-success"
                                            onClick={() => openModal('joinGroup')}
                                            whileHover={{scale: 1.05}}
                                            whileTap={{scale: 0.95}}
                                        >
                                            <FontAwesomeIcon icon={faSignInAlt} className="me-2"/>
                                            Tham gia
                                        </motion.button>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                <ul className="list-unstyled mb-0">
                                    {groupsList.map((group, index) => (
                                        <motion.li
                                            key={group.name}
                                            variants={chatItemVariants}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                            whileHover="hover"
                                            whileTap="tap"
                                            custom={index}
                                            transition={{delay: index * 0.03}}
                                            className={`contact-item p-3 mb-2 rounded cursor-pointer ${
                                                selectedChat?.name === group.name && selectedChat?.type === 1 ? 'active-chat' : ''
                                            }`}
                                            onClick={() => handleUserClick(group)}
                                            style={{cursor: 'pointer'}}
                                        >
                                            <div className="d-flex align-items-center">
                                                <div className="position-relative me-3">
                                                    <motion.div
                                                        className="avatar1 avatar1-md"
                                                        whileHover={{scale: 1.1}}
                                                        whileTap={{scale: 0.95}}
                                                    >
                                                        <span
                                                            className="avatar1-label bg-soft-primary text-primary fs-5">
                                                            {group.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </motion.div>
                                                    <span
                                                        className="position-absolute bottom-0 end-0 bg-white rounded-circle p-1">
                                                        <FontAwesomeIcon icon={faUsers} size="xs"
                                                                         className="text-primary"/>
                                                    </span>
                                                </div>

                                                <div className="flex-grow-1 min-width-0">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <h6 className="mb-0 text-truncate" style={{maxWidth: '150px'}}>
                                                            {group.name}
                                                        </h6>
                                                        {group.lastTime > 0 && (
                                                            <small className="text-muted ms-2"
                                                                   style={{fontSize: '0.7rem'}}>
                                                                {formatTime(group.lastTime)}
                                                            </small>
                                                        )}
                                                    </div>

                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <small className="text-muted text-truncate"
                                                               style={{maxWidth: '150px', fontSize: '0.85rem'}}>
                                                            {group.displayMessage}
                                                        </small>
                                                        <Badge bg="light" text="dark" pill className="ms-2"
                                                               style={{fontSize: '0.7rem'}}>
                                                            {group.memberCount}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.li>
                                    ))}
                                </ul>
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Modals */}
            <AnimatePresence>
                {/* Main Modal */}
                {activeModal === 'main' && (
                    <motion.div
                        className="modal-overlay"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => {
                            if (e.target.className === 'modal-overlay') {
                                handleClose();
                            }
                        }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999
                        }}
                    >
                        <div className="modal-dialog" style={{maxWidth: '500px', width: '90%'}}>
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Tạo mới</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={handleClose}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <div className="d-grid gap-3">
                                        <motion.button
                                            className="btn btn-outline-primary btn-lg"
                                            onClick={() => openModal('newChat')}
                                            whileHover={{scale: 1.02}}
                                            whileTap={{scale: 0.98}}
                                        >
                                            <FontAwesomeIcon icon={faUserPlus} className="me-2"/>
                                            Nhắn tin mới
                                        </motion.button>
                                        <motion.button
                                            className="btn btn-outline-success btn-lg"
                                            onClick={() => openModal('createGroup')}
                                            whileHover={{scale: 1.02}}
                                            whileTap={{scale: 0.98}}
                                        >
                                            <FontAwesomeIcon icon={faUsers} className="me-2"/>
                                            Tạo nhóm mới
                                        </motion.button>
                                        <motion.button
                                            className="btn btn-outline-info btn-lg"
                                            onClick={() => openModal('joinGroup')}
                                            whileHover={{scale: 1.02}}
                                            whileTap={{scale: 0.98}}
                                        >
                                            <FontAwesomeIcon icon={faSignInAlt} className="me-2"/>
                                            Tham gia nhóm
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* New Chat Modal */}
                {activeModal === 'newChat' && (
                    <motion.div
                        className="modal-overlay"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => {
                            if (e.target.className === 'modal-overlay') {
                                handleClose();
                            }
                        }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999
                        }}
                    >
                        <div className="modal-dialog" style={{maxWidth: '500px', width: '90%'}}>
                            <div className="modal-content">
                                <div className="modal-header">
                                    <button
                                        type="button"
                                        className="btn btn-link text-decoration-none p-0 me-3"
                                        onClick={handleBack}
                                    >
                                        <FontAwesomeIcon icon={faArrowLeft}/>
                                    </button>
                                    <h5 className="modal-title flex-grow-1">Nhắn tin mới</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={handleClose}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <Form>
                                        <InputGroup className="mb-3">
                                            <InputGroup.Text>
                                                <FontAwesomeIcon icon={faUserPlus}/>
                                            </InputGroup.Text>
                                            <Form.Control
                                                type="text"
                                                placeholder="Nhập tên người dùng..."
                                                value={nameUser}
                                                onChange={(e) => setNameUser(e.target.value)}
                                                autoFocus
                                                isInvalid={exists === false}
                                                isValid={exists === true}
                                            />
                                            {searching && (
                                                <InputGroup.Text>
                                                    <Spinner animation="border" size="sm"/>
                                                </InputGroup.Text>
                                            )}
                                            {exists === true && (
                                                <InputGroup.Text className="text-success">
                                                    <FontAwesomeIcon icon={faCheck}/>
                                                </InputGroup.Text>
                                            )}
                                            {exists === false && (
                                                <InputGroup.Text className="text-danger">
                                                    <FontAwesomeIcon icon={faExclamationCircle}/>
                                                </InputGroup.Text>
                                            )}
                                        </InputGroup>

                                        {exists === false && (
                                            <motion.div
                                                className="alert alert-danger py-2"
                                                initial={{opacity: 0, y: -10}}
                                                animate={{opacity: 1, y: 0}}
                                            >
                                                <small>
                                                    <FontAwesomeIcon icon={faExclamationCircle} className="me-1"/>
                                                    Người dùng "{nameUser}" không tồn tại!
                                                </small>
                                            </motion.div>
                                        )}

                                        {nameUser && nameUser === currentUser && (
                                            <motion.div
                                                className="alert alert-warning py-2"
                                                initial={{opacity: 0, y: -10}}
                                                animate={{opacity: 1, y: 0}}
                                            >
                                                <small>Bạn không thể nhắn tin cho chính mình!</small>
                                            </motion.div>
                                        )}
                                    </Form>
                                </div>
                                <div className="modal-footer">
                                    <Button variant="secondary" onClick={handleClose}>
                                        Hủy
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleCreateNewChat}
                                        disabled={!nameUser || searching || exists !== true || nameUser === currentUser}
                                    >
                                        Bắt đầu
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Create Group Modal */}
                {activeModal === 'createGroup' && (
                    <motion.div
                        className="modal-overlay"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => {
                            if (e.target.className === 'modal-overlay') {
                                handleClose();
                            }
                        }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999
                        }}
                    >
                        <div className="modal-dialog" style={{maxWidth: '500px', width: '90%'}}>
                            <div className="modal-content">
                                <div className="modal-header">
                                    <button
                                        type="button"
                                        className="btn btn-link text-decoration-none p-0 me-3"
                                        onClick={handleBack}
                                    >
                                        <FontAwesomeIcon icon={faArrowLeft}/>
                                    </button>
                                    <h5 className="modal-title flex-grow-1">Tạo nhóm mới</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={handleClose}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <Form>
                                        <InputGroup className="mb-3">
                                            <InputGroup.Text>
                                                <FontAwesomeIcon icon={faUsers}/>
                                            </InputGroup.Text>
                                            <Form.Control
                                                type="text"
                                                placeholder="Nhập tên nhóm..."
                                                value={groupName}
                                                onChange={(e) => setGroupName(e.target.value)}
                                                autoFocus
                                            />
                                        </InputGroup>
                                    </Form>
                                </div>
                                <div className="modal-footer">
                                    <Button variant="secondary" onClick={handleClose}>
                                        Hủy
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleCreateRoom}
                                        disabled={!groupName.trim() || createRoomStatus === "loading"}
                                    >
                                        {createRoomStatus === "loading" ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2"/>
                                                Đang tạo...
                                            </>
                                        ) : (
                                            'Tạo nhóm'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Join Group Modal */}
                {activeModal === 'joinGroup' && (
                    <motion.div
                        className="modal-overlay"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => {
                            if (e.target.className === 'modal-overlay') {
                                handleClose();
                            }
                        }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999
                        }}
                    >
                        <div className="modal-dialog" style={{maxWidth: '500px', width: '90%'}}>
                            <div className="modal-content">
                                <div className="modal-header">
                                    <button
                                        type="button"
                                        className="btn btn-link text-decoration-none p-0 me-3"
                                        onClick={handleBack}
                                    >
                                        <FontAwesomeIcon icon={faArrowLeft}/>
                                    </button>
                                    <h5 className="modal-title flex-grow-1">Tham gia nhóm</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={handleClose}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <Form>
                                        <InputGroup className="mb-3">
                                            <InputGroup.Text>
                                                <FontAwesomeIcon icon={faSignInAlt}/>
                                            </InputGroup.Text>
                                            <Form.Control
                                                type="text"
                                                placeholder="Nhập tên nhóm..."
                                                value={roomName}
                                                onChange={(e) => setRoomName(e.target.value)}
                                                autoFocus
                                                isInvalid={roomExists === false}
                                                isValid={roomExists === true}
                                            />
                                            {searchingRoom && (
                                                <InputGroup.Text>
                                                    <Spinner animation="border" size="sm"/>
                                                </InputGroup.Text>
                                            )}
                                            {roomExists === true && (
                                                <InputGroup.Text className="text-success">
                                                    <FontAwesomeIcon icon={faCheck}/>
                                                </InputGroup.Text>
                                            )}
                                            {roomExists === false && (
                                                <InputGroup.Text className="text-danger">
                                                    <FontAwesomeIcon icon={faExclamationCircle}/>
                                                </InputGroup.Text>
                                            )}
                                        </InputGroup>

                                        {roomExists === false && (
                                            <motion.div
                                                className="alert alert-danger py-2"
                                                initial={{opacity: 0, y: -10}}
                                                animate={{opacity: 1, y: 0}}
                                            >
                                                <small>
                                                    <FontAwesomeIcon icon={faExclamationCircle} className="me-1"/>
                                                    Nhóm "{roomName}" không tồn tại!
                                                </small>
                                            </motion.div>
                                        )}

                                        {roomExists === true && (
                                            <motion.div
                                                className="alert alert-success py-2"
                                                initial={{opacity: 0, y: -10}}
                                                animate={{opacity: 1, y: 0}}
                                            >
                                                <small>
                                                    <FontAwesomeIcon icon={faCheck} className="me-1"/>
                                                    Nhóm đã tồn tại, bạn có thể tham gia ngay!
                                                </small>
                                            </motion.div>
                                        )}
                                    </Form>
                                </div>
                                <div className="modal-footer">
                                    <Button variant="secondary" onClick={handleClose}>
                                        Hủy
                                    </Button>
                                    <Button
                                        variant="success"
                                        onClick={handleJoinRoom}
                                        disabled={!roomName.trim() || searchingRoom || roomExists === false}
                                    >
                                        {searchingRoom ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2"/>
                                                Đang kiểm tra...
                                            </>
                                        ) : roomExists === true ? (
                                            'Tham gia ngay'
                                        ) : (
                                            'Tham gia'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ToastContainer
                position="top-right"
                autoClose={4000}
                theme="colored"
                limit={3}
                newestOnTop
                pauseOnHover
            />
        </motion.div>
    );
}

export default ChatTab;