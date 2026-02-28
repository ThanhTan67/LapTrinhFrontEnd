import React, { useEffect } from 'react';
import { useParams } from "react-router-dom";
import { getPeopleChatMes, getRoomChatMes } from "../../../socket/socket";
import { useSelector } from "react-redux";

function UserProfile() {
    const { type, name } = useParams();

    // Lấy dữ liệu từ Redux
    const roomMembers = useSelector((state) => state.roomMembers?.[name] || []);
    const userOnlineStatus = useSelector((state) => state.userOnlineStatus || {});

    useEffect(() => {
        if (name) {
            if (type === 'friend') {
                getPeopleChatMes(name);
            } else if (type === 'group') {
                getRoomChatMes(name);
            }
        }
    }, [type, name]);

    // Sắp xếp thành viên theo thứ tự A-Z
    const sortedMembers = [...roomMembers].sort((a, b) =>
        a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })
    );

    return (
        <div className="chat-info h-100 border-start">
            <div className="d-flex flex-column h-100">

                {/* HEADER */}
                <div className="chat-info-header d-flex align-items-center border-bottom">
                    <ul className="d-flex justify-content-between align-items-center list-unstyled w-100 mx-4 mb-0">
                        <li>
                            <h3 className="mb-0">Profile</h3>
                        </li>
                        <li>
                            <button className="chat-info-close btn btn-icon btn-base px-0">
                                <i className="ri-close-line" />
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="hide-scrollbar h-100">

                    {/* AVATAR & TÊN */}
                    <div className="text-center p-4 pt-14">
                        <div className="avatar avatar-xl mb-4">
                            <span className="avatar-label bg-soft-primary text-primary fs-3">
                                {name ? name.charAt(0).toUpperCase() : ""}
                            </span>
                        </div>
                        <h5 className="mb-1">{name}</h5>
                    </div>

                    {/* TAB NAVIGATION */}
                    <div className="text-center mb-2">
                        <ul className="nav nav-pills nav-segmented" id="pills-tab-user-profile" role="tablist">
                            <li className="nav-item" role="presentation">
                                <button
                                    className="nav-link active"
                                    data-bs-target="#pills-about"
                                    data-bs-toggle="pill"
                                    type="button"
                                    role="tab"
                                >
                                    Thông tin
                                </button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button
                                    className="nav-link"
                                    data-bs-target="#pills-image"
                                    data-bs-toggle="pill"
                                    type="button"
                                    role="tab"
                                >
                                    Ảnh
                                </button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button
                                    className="nav-link"
                                    data-bs-target="#pills-files"
                                    data-bs-toggle="pill"
                                    type="button"
                                    role="tab"
                                >
                                    Files
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* TAB CONTENT */}
                    <div className="tab-content" id="pills-tab-user-profile-content">

                        {/* TAB THÔNG TIN - DANH SÁCH THÀNH VIÊN */}
                        <div className="tab-pane fade show active" id="pills-about" role="tabpanel">
                            <ul className="list-group list-group-flush">
                                {type === 'group' && (
                                    <li className="list-group-item py-4">
                                        <h6 className="mb-3 text-uppercase fw-semibold text-muted">
                                            Danh sách thành viên ({sortedMembers.length})
                                        </h6>

                                        {/* DANH SÁCH THÀNH VIÊN - INLINE STYLE ĐẸP */}
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {sortedMembers.length > 0 ? (
                                                sortedMembers.map((user) => {
                                                    const isOnline = userOnlineStatus[user.name] === 'online';
                                                    return (
                                                        <li key={user.name} style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            padding: '12px 14px',
                                                            marginBottom: '6px',
                                                            borderRadius: '10px',
                                                            backgroundColor: '#f8f9fa',
                                                            transition: 'all 0.2s ease'
                                                        }}>
                                                            {/* Avatar */}
                                                            <div style={{
                                                                width: '38px',
                                                                height: '38px',
                                                                borderRadius: '50%',
                                                                backgroundColor: '#e9ecef',
                                                                color: '#495057',
                                                                fontWeight: '600',
                                                                fontSize: '15px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                marginRight: '14px',
                                                                flexShrink: 0
                                                            }}>
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </div>

                                                            {/* Tên */}
                                                            <span style={{
                                                                fontWeight: '500',
                                                                fontSize: '15px',
                                                                flex: 1,
                                                                color: '#212529'
                                                            }}>
                                                                {user.name}
                                                            </span>

                                                            {/* Trạng thái Online/Offline */}
                                                            <span style={{
                                                                fontSize: '13px',
                                                                padding: '4px 12px',
                                                                borderRadius: '20px',
                                                                fontWeight: '500',
                                                                backgroundColor: isOnline ? '#d4edda' : '#f8d7da',
                                                                color: isOnline ? '#155724' : '#721c24'
                                                            }}>
                                                                {isOnline ? 'Online' : 'Offline'}
                                                            </span>
                                                        </li>
                                                    );
                                                })
                                            ) : (
                                                <li className="text-muted py-3 text-center">
                                                    Không có thành viên nào
                                                </li>
                                            )}
                                        </ul>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* TAB ẢNH */}
                        <div className="tab-pane fade" id="pills-image" role="tabpanel">
                            <div className="p-4 text-center text-muted">
                                <i className="ri-image-line" style={{ fontSize: '48px', opacity: 0.3 }}></i>
                                <p className="mt-3">Chưa có ảnh nào</p>
                            </div>
                        </div>

                        {/* TAB FILES - GIỮ NGUYÊN NHƯ CODE GỐC */}
                        <div className="tab-pane fade" id="pills-files" role="tabpanel">
                            <ul className="list-group list-group-flush">
                                <li className="list-group-item py-4">
                                    <div className="row align-items-center gx-4">
                                        <div className="col-auto">
                                            <div className="avatar avatar-sm">
                                                <span className="avatar-label">
                                                    <i className="ri-image-line" />
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col overflow-hidden">
                                            <h6 className="text-truncate mb-1">Image002.jpg</h6>
                                            <ul className="list-inline m-0">
                                                <li className="list-inline-item">
                                                    <p className="text-uppercase text-muted mb-0 fs-6">365 KB</p>
                                                </li>
                                                <li className="list-inline-item">
                                                    <p className="text-uppercase text-muted mb-0 fs-6">JPG</p>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="col-auto">
                                            <div className="dropdown">
                                                <button
                                                    className="btn btn-icon btn-base btn-sm"
                                                    data-bs-toggle="dropdown"
                                                    type="button"
                                                >
                                                    <i className="ri-more-fill" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right">
                                                    <li>
                                                        <a className="dropdown-item d-flex align-items-center justify-content-between" href="#">
                                                            Download <i className="ri-download-line" />
                                                        </a>
                                                    </li>
                                                    <li>
                                                        <a className="dropdown-item d-flex align-items-center justify-content-between" href="#">
                                                            Share <i className="ri-share-line" />
                                                        </a>
                                                    </li>
                                                    <li><div className="dropdown-divider" /></li>
                                                    <li>
                                                        <a className="dropdown-item d-flex align-items-center justify-content-between" href="#">
                                                            Delete <i className="ri-delete-bin-line" />
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserProfile;