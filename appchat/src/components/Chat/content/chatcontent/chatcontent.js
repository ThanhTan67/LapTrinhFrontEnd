// ChatContent.js
import React, {useEffect, useRef, useState, useMemo, useCallback} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {useNavigate, useParams} from "react-router-dom";
import {initializeSocket, reLoginUser} from "../../../../socket/socket";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import '../../../../assets/chatcontent.css'
import {decode} from "../../../../utils/convert-text";
import './style.css';
import {getDownloadURL} from "firebase/storage";
import {setActiveChat} from "../../../../redux/action/action";
import {getPeopleChatMes, getRoomChatMes} from "../../../../socket/socket";

// Component Avatar
const Avatar = React.memo(({name, size = 'sm'}) => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#f6c431', '#BB8FCE', '#85C1E2'
    ];

    const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    const backgroundColor = colors[colorIndex];

    return (
        <div
            className={`avatar1 avatar1-${size}`}
            style={{
                backgroundColor,
                backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)'
            }}
        >
            <span className="avatar1-text">
                {name.charAt(0).toUpperCase()}
            </span>
        </div>
    );
});

// Component Message riêng
const MessageItem = React.memo(({message, isOwn, username, formatTimestamp, onImageClick}) => {
    const renderContent = useCallback(() => {
        const content = message.content || '';

        if (content.startsWith('GIF:')) {
            const gif = content.replace('GIF:', '');
            const gifUrl = decode(gif);
            return (
                <div className="message-gif">
                    <img src={gifUrl} alt="GIF" loading="lazy" className="gif-image" />
                </div>
            );
        }

        if (content.startsWith('VIDEO:')) {
            const videoUrl = content.replace('VIDEO:', '');
            return (
                <div className="message-video">
                    <video controls preload="metadata" className="video-player">
                        <source src={videoUrl} type="video/mp4" />
                    </video>
                </div>
            );
        }

        if (content.startsWith('IMAGE:')) {
            const imageUrl = content.replace('IMAGE:', '');
            return (
                <div className="message-image">
                    <img
                        src={imageUrl}
                        alt="Image"
                        loading="lazy"
                        className="image-content"
                        onClick={() => onImageClick(imageUrl)}
                    />
                </div>
            );
        }

        if (content.startsWith('FILE:')) {
            const fileName = content.replace('FILE:', '');
            const decodedFileName = decode(fileName);
            return (
                <div className="message-file">
                    <i className="ri-file-line file-icon"></i>
                    <span className="file-name">{decodedFileName}</span>
                </div>
            );
        }

        return (
            <div className="message-text">
                <span>{decode(content)}</span>
            </div>
        );
    }, [message.content, onImageClick]);

    return (
        <div className={`message-row ${isOwn ? 'own' : ''}`}>
            {!isOwn && (
                <div className="message-avatar1">
                    <Avatar name={message.fromUser} size="sm" />
                </div>
            )}

            <div className="message-content-wrapper">
                {!isOwn && (
                    <div className="message-sender-name">
                        {message.fromUser}
                    </div>
                )}

                <div className={`message-bubble ${isOwn ? 'own' : ''} ${message.content?.startsWith('GIF:') ? 'has-gif' : ''}`}>
                    {renderContent()}
                </div>

                <div className={`message-footer ${isOwn ? 'own' : ''}`}>
                    <span className="timestamp">
                        {formatTimestamp(message.createAt)}
                    </span>
                    {isOwn && (
                        <i className="ri-check-double-line read-status" />
                    )}
                </div>
            </div>

            {isOwn && <div className="avatar1-spacer" />}
        </div>
    );
});

function ChatContent() {
    const login = useSelector((state) => state.login);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const {name} = useParams();
    const messages = useSelector(state => {
        const activeName = state.active?.name;
        return state.messagesByChat?.[activeName] || [];
    });
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const username = localStorage.getItem("username");
    const [expandedImage, setExpandedImage] = useState(null);
    const userList = useSelector(state => state.userList?.data);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [isScrolling, setIsScrolling] = useState(false);
    const [hasNewMessage, setHasNewMessage] = useState(false);

    const scrollTimeoutRef = useRef(null);
    const newMessageTimeoutRef = useRef(null);
    const scrollRAFRef = useRef(null);
    const prevMessagesLengthRef = useRef(0);
    const isInitialLoadRef = useRef(true);

    const sortedMessages = useMemo(() => {
        return [...messages].sort((a, b) => new Date(a.createAt) - new Date(b.createAt));
    }, [messages]);

    // Format timestamp (giữ nguyên)
    const formatTimestamp = useCallback((timestamp) => {
        if (!timestamp) return "";
        const [datePart, timePart] = timestamp.split(' ');
        if (!datePart || !timePart) return timestamp;
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        const messageDate = new Date(year, month - 1, day, hour, minute);
        const now = new Date();

        // Reset thời gian để so sánh ngày thuần túy
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
        const diffDays = Math.floor((today - messageDay) / (24 * 3600000));

        const diffMs = now - messageDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return "Vừa xong";
        if (diffMins >= 1 && diffMins < 30) return `${diffMins} phút`;
        if (diffMins >= 30 && diffHours < 24) return `${hour}:${minute}`;

        // Kiểm tra chính xác ngày hôm qua
        if (diffDays === 1) return `Hôm qua ${hour}:${minute}`;

        if (diffDays >= 1 && diffDays < 7) {
            const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const dayOfWeek = days[messageDate.getDay()];
            return `${dayOfWeek} ${hour}:${minute}`;
        }

        if (diffDays >= 7) return `${day}/${month}/${year} ${hour}:${minute}`;

        return `${hour}:${minute}`;
    }, []);

    // Kiểm tra vị trí scroll có ở bottom không
    const checkIfAtBottom = useCallback(() => {
        const container = chatContainerRef.current;
        if (!container) return true;

        const {scrollTop, scrollHeight, clientHeight} = container;
        return scrollHeight - scrollTop - clientHeight < 50;
    }, []);

    // KHÔNG scroll, chỉ set vị trí cuối cùng khi load messages
    useEffect(() => {
        if (sortedMessages.length > 0 && isInitialLoadRef.current) {
            // KHÔNG scroll, chỉ đảm bảo container ở vị trí cuối
            // Bằng cách set scrollTop = scrollHeight
            const container = chatContainerRef.current;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
            setIsAtBottom(true);
            isInitialLoadRef.current = false;
        }
    }, [name, sortedMessages.length]);

    // Xử lý khi có tin nhắn mới
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const newLength = sortedMessages.length;
        const hasNewMsg = newLength > prevMessagesLengthRef.current;

        if (hasNewMsg) {
            setHasNewMessage(true);
            container.classList.add('new-message');

            const lastMessage = sortedMessages[newLength - 1];
            const isOwnMessage = lastMessage.fromUser === username;
            const atBottom = checkIfAtBottom();

            // Nếu là tin nhắn của mình hoặc đang ở bottom -> set scrollTop = scrollHeight
            if (isOwnMessage || atBottom) {
                // Set trực tiếp scrollTop, không dùng scrollIntoView
                container.scrollTop = container.scrollHeight;
            }

            if (newMessageTimeoutRef.current) {
                clearTimeout(newMessageTimeoutRef.current);
            }

            newMessageTimeoutRef.current = setTimeout(() => {
                setHasNewMessage(false);
                container.classList.remove('new-message');
            }, 1500);
        }

        prevMessagesLengthRef.current = newLength;
    }, [sortedMessages.length, checkIfAtBottom, username]);

    // Xử lý scroll để hiện scrollbar
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const handleScrollStart = () => {
            setIsScrolling(true);
            container.classList.add('scrolling');

            setIsAtBottom(checkIfAtBottom());

            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
                container.classList.remove('scrolling');
            }, 1000);
        };

        container.addEventListener('scroll', handleScrollStart, {passive: true});

        return () => {
            container.removeEventListener('scroll', handleScrollStart);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [checkIfAtBottom]);

    // Xử lý scroll để theo dõi vị trí bottom
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (scrollRAFRef.current) {
                cancelAnimationFrame(scrollRAFRef.current);
            }

            scrollRAFRef.current = requestAnimationFrame(() => {
                setIsAtBottom(checkIfAtBottom());
            });
        };

        container.addEventListener('scroll', handleScroll, {passive: true});

        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollRAFRef.current) {
                cancelAnimationFrame(scrollRAFRef.current);
            }
        };
    }, [checkIfAtBottom]);

    // Cleanup timeouts
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            if (newMessageTimeoutRef.current) {
                clearTimeout(newMessageTimeoutRef.current);
            }
            if (scrollRAFRef.current) {
                cancelAnimationFrame(scrollRAFRef.current);
            }
        };
    }, []);

    // Check login
    useEffect(() => {
        if (!login.status) {
            if (localStorage.getItem("reLogin")) {
                initializeSocket('\'wss://serverchat.up.railway.app/chat');
                reLoginUser(username, localStorage.getItem("reLogin"));
            } else {
                navigate("/login");
            }
        }
    }, [dispatch, navigate, login, username]);

    useEffect(() => {
        if (name) {
            // Luôn dispatch setActiveChat với name và type mặc định
            // Type sẽ được xác định dựa trên URL pattern
            const isGroup = window.location.pathname.includes('/group/');
            dispatch(setActiveChat({name: name, type: isGroup ? 1 : 0}));

            // Load messages tương ứng
            if (isGroup) {
                getRoomChatMes(name);
            } else {
                getPeopleChatMes(name);
            }
        }
    }, [name, dispatch]); // Bỏ userList khỏi dependencies

    const handleImageClick = useCallback((imageUrl) => {
        setExpandedImage(imageUrl);
    }, []);

    const closeExpandedImage = useCallback(() => {
        setExpandedImage(null);
    }, []);

    const isDifferentDay = useCallback((curr, prev) => {
        const date1 = new Date(curr.createAt);
        const date2 = new Date(prev.createAt);
        return date1.toDateString() !== date2.toDateString();
    }, []);

    const isToday = useCallback((ts) => {
        const date = new Date(ts);
        const now = new Date();
        return date.toDateString() === now.toDateString();
    }, []);

    if (!name) {
        return (
            <div className="chat-content">
                <div className="empty-state">
                    <i className="ri-chat-1-line"></i>
                    <p>Chọn người bạn muốn nhắn để bắt đầu trò chuyện!</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="chat-content"
            ref={chatContainerRef}
            data-scrolling={isScrolling}
            data-new-message={hasNewMessage}
        >
            <div className="messages-container">
                {sortedMessages.map((message, index) => {
                    const showTodayLabel = index === 0 || isDifferentDay(message, sortedMessages[index - 1]);
                    const isOwn = message.fromUser === username;
                    const msgId = message.timestamp || message.id || `${message.createAt}-${message.fromUser}-${index}`;

                    return (
                        <React.Fragment key={msgId}>
                            {showTodayLabel && isToday(message.createAt) && (
                                <div className="date-divider">
                                    <span className="date-label">Hôm nay</span>
                                </div>
                            )}

                            <MessageItem
                                message={message}
                                isOwn={isOwn}
                                username={username}
                                formatTimestamp={formatTimestamp}
                                onImageClick={handleImageClick}
                            />
                        </React.Fragment>
                    );
                })}

                {expandedImage && (
                    <div className="image-expand-overlay" onClick={closeExpandedImage}>
                        <img
                            src={expandedImage}
                            alt="Expanded"
                            className="expanded-image"
                            loading="lazy"
                        />
                        <button className="close-button" onClick={closeExpandedImage}>
                            <i className="ri-close-line"></i>
                        </button>
                    </div>
                )}

                <div ref={messagesEndRef} className="scroll-anchor"/>
            </div>
        </div>
    );
}

export default ChatContent;