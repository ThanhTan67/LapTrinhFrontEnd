// src/components/friends/FriendsTab.js
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { getUsersList } from "../../../../socket/socket";
import { useNavigate } from "react-router-dom";
import { getPeopleChatMes, getRoomChatMes } from "../../../../socket/socket";

function FriendsTab() {
    const dispatch = useDispatch();
    const userList = useSelector(state => state.userList.data || []);
    const userOnlineStatus = useSelector(state => state.userOnlineStatus || {});
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        getUsersList();
    }, [dispatch]);

    const filteredUsers = userList.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUserClick = (user) => {
        if (user.type === 0) {
            getPeopleChatMes(user.name);
            navigate(`/Home/friend/${user.name}`);
        } else if (user.type === 1) {
            getRoomChatMes(user.name);
            navigate(`/Home/group/${user.name}`);
        }
    };

    return (
        <div className="friends-tab d-flex flex-column h-100">
            <div className="tab-header p-4 border-bottom">
                <h3 className="mb-0">Friends</h3>
            </div>

            <div className="p-4">
                <div className="input-group">
                    <input
                        type="text"
                        className="form-control form-control-lg"
                        placeholder="Tìm kiếm bạn bè hoặc nhóm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="btn btn-secondary btn-lg">
                        <i className="ri-search-line" />
                    </button>
                </div>
            </div>

            <div className="hide-scrollbar flex-grow-1 px-4 pb-4">
                {filteredUsers.length === 0 ? (
                    <p className="text-center text-muted py-5">
                        {searchQuery ? "Không tìm thấy" : "Danh sách trống"}
                    </p>
                ) : (
                    <ul className="list-unstyled contact-list">
                        {filteredUsers.map((user) => {
                            const status = userOnlineStatus[user.name];
                            const isOnline = status === "online";
                            const showStatus = status !== undefined;
                            const isGroup = user.type === 1;

                            return (
                                <li className="contact-item mb-3" key={user.name} onClick={() => handleUserClick(user)}>
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-container position-relative me-4">
                                            <div className={`avatar ${showStatus && isOnline ? 'avatar-online' : 'avatar-offline'}`}>
                                                <span className={`avatar-label ${isGroup ? 'group-avatar' : ''}`}>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            {showStatus && isOnline && <div className="status-indicator"></div>}
                                        </div>
                                        <div className="flex-grow-1 overflow-hidden">
                                            <h5 className="mb-1 text-truncate">{user.name}</h5>
                                            {showStatus && (
                                                <small className={isOnline ? "status-online" : "status-offline"}>
                                                    {isGroup
                                                        ? (isOnline ? "Có thành viên đang hoạt động" : "Không ai online")
                                                        : (isOnline ? "Đang hoạt động" : "Offline")
                                                    }
                                                </small>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="p-4 border-top">
                <button className="btn btn-primary btn-lg w-100">
                    Mời bạn bè
                </button>
            </div>
        </div>
    );
}

export default FriendsTab;