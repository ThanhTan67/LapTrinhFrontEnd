import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {initializeSocket, logoutUsers, socketActions} from '../../../../socket/socket';


    function SettingTab() {
        const [socket, setSocket] = useState(null);
        const logoutStatus = useSelector((state) => state.logout.status);
        const dispatch = useDispatch();
        const navigate = useNavigate();

        useEffect(() => {
            const ws = initializeSocket('ws://localhost:8080/chat');
            setSocket(ws);

            return () => {
                if (ws) {
                    ws.close();
                }
            };
        }, []);
    useEffect(() => {
        if (logoutStatus === 'success') {
            navigate('/Login');
        }
    }, [logoutStatus]);

    // Hàm đăng xuất
    const handleLogout = (e) => {
        // console.log($.fn.modal); // Kiểm tra xem modal() có được định nghĩa không
        // // Đóng tất cả các modal đang mở
        // $('.modal').modal('hide');
        //
        // // Thêm thời gian trễ nhỏ để đảm bảo tất cả các modals được ẩn hoàn toàn
        // setTimeout(() => {
        //     // Xóa backdrop thủ công nếu còn sót
        //     $('.modal-backdrop').remove();
        //
        //     // Đảm bảo không còn backdrop nào
        //     $('body').removeClass('modal-open');
        //     $('body').css('padding-right', '');
        //
        //     // Gọi hàm logout của socket
        //     socketActions.logoutUser();
        //
        //     // Điều hướng tới trang login
        //     navigate("/login");
        // }, 500); // Thời gian trễ 500ms để đảm bảo mọi thứ đã được xử lý
        e.preventDefault();
        logoutUsers();
    };

    return (
        <div className="d-flex flex-column h-100">
            <div className="tab-header d-flex align-items-center border-bottom">
                <ul className="d-flex justify-content-between align-items-center list-unstyled w-100 mx-4 mb-0">
                    <li>
                        <h3 className="mb-0">
                            Settings
                        </h3>
                    </li>
                    <li>
                        <ul className="list-inline">
                            <li className="list-inline-item">
                                <button
                                    className="navigation-toggle btn btn-secondary btn-icon d-xl-none"
                                    type="button"
                                >
                                    <i className="ri-menu-line"/>
                                </button>
                            </li>
                        </ul>
                    </li>
                </ul>
            </div>
            <div className="m-4">
                <div className="input-group">
                    <input
                        aria-describedby="search-settings-button"
                        aria-label="Search settings"
                        className="form-control form-control-lg form-control-solid"
                        placeholder="Search settings"
                        type="text"
                    />
                    <button
                        className="btn btn-secondary btn-lg"
                        id="search-settings-button"
                        type="button"
                    >
                        <i className="ri-search-line"/>
                    </button>
                </div>
            </div>
            <div className="hide-scrollbar h-100">
                <div className="m-4 mt-0">
                    <div className="card mb-3">
                        <div className="card-body">
                            <div className="row align-items-center gx-4">
                                <div className="col-auto">
                                    <div className="avatar avatar-online">
                          <span className="avatar-label bg-soft-success text-success">
                            JD
                          </span>
                                    </div>
                                </div>
                                <div className="col">
                                    <h5 className="mb-1">
                                        John Davis
                                    </h5>
                                    <p className="text-muted mb-0">
                                        john@gmail.com
                                    </p>
                                </div>
                                <button className="btn btn-sm btn-icon btn-base" onClick={handleLogout}>
                                    <i className="ri-logout-box-line"/>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="mb-3">
                        <div className="d-flex align-items-center mx-4 mb-3">
                            <small className="text-muted me-auto">
                                Acount
                            </small>
                        </div>
                        <div className="card">
                            <div className="card-body">
                                <div
                                    className="accordion accordion-flush"
                                    id="accordion-account-settings"
                                >
                                    <div className="accordion-item">
                                        <div
                                            className="accordion-header"
                                            id="account-heading-1"
                                        >
                                            <div
                                                aria-controls="account-collapse-1"
                                                aria-expanded="false"
                                                className="accordion-button collapsed p-0 pb-4"
                                                data-bs-target="#account-collapse-1"
                                                data-bs-toggle="collapse"
                                                role="button"
                                            >
                                                <div>
                                                    <h5 className="mb-1">
                                                        Account settings
                                                    </h5>
                                                    <p className="text-muted mb-0">
                                                        Update account settings
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            aria-labelledby="account-heading-1"
                                            className="accordion-collapse collapse"
                                            id="account-collapse-1"
                                        >
                                            <div className="accordion-body p-0 pb-4">
                                                <div className="mb-4">
                                                    <div className="input-group">
                                                        <input
                                                            aria-label="Name"
                                                            className="form-control form-control-lg form-control-solid"
                                                            placeholder="Name"
                                                            type="text"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mb-4">
                                                    <div className="input-group">
                                                        <input
                                                            aria-label="Email"
                                                            className="form-control form-control-lg form-control-solid"
                                                            placeholder="Email"
                                                            type="text"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mb-4">
                                                    <div className="input-group">
                                                        <input
                                                            aria-label="Phone"
                                                            className="form-control form-control-lg form-control-solid"
                                                            placeholder="Phone"
                                                            type="text"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mb-4">
                                                    <div className="input-group">
                                  <textarea
                                      className="form-control form-control-lg form-control-solid"
                                      placeholder="About text"
                                      rows="3"
                                  />
                                                    </div>
                                                </div>
                                                <button className="btn btn-lg btn-primary w-100">
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="accordion-item">
                                        <div
                                            className="accordion-header"
                                            id="account-heading-2"
                                        >
                                            <div
                                                aria-controls="account-collapse-2"
                                                aria-expanded="false"
                                                className="accordion-button collapsed p-0 pt-4"
                                                data-bs-target="#account-collapse-2"
                                                data-bs-toggle="collapse"
                                                role="button"
                                            >
                                                <div>
                                                    <h5 className="mb-1">
                                                        Linked accounts
                                                    </h5>
                                                    <p className="text-muted mb-0">
                                                        Linked with you accounts
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            aria-labelledby="account-heading-2"
                                            className="accordion-collapse collapse"
                                            id="account-collapse-2"
                                        >
                                            <div className="accordion-body p-0 pt-4">
                                                <div className="mb-4">
                                                    <div className="input-group">
                                                        <input
                                                            aria-label="Google"
                                                            className="form-control form-control-lg form-control-solid"
                                                            placeholder="Google"
                                                            type="text"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mb-4">
                                                    <div className="input-group">
                                                        <input
                                                            aria-label="Twitter"
                                                            className="form-control form-control-lg form-control-solid"
                                                            placeholder="Twitter"
                                                            type="text"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mb-4">
                                                    <div className="input-group">
                                                        <input
                                                            aria-label="Facebook"
                                                            className="form-control form-control-lg form-control-solid"
                                                            placeholder="Facebook"
                                                            type="text"
                                                        />
                                                    </div>
                                                </div>
                                                <button className="btn btn-lg btn-primary w-100">
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mb-3">
                        <div className="d-flex align-items-center mx-4 mb-3">
                            <small className="text-muted me-auto">
                                Security
                            </small>
                        </div>
                        <div className="card">
                            <div className="card-body">
                                <div
                                    className="accordion accordion-flush"
                                    id="accordion-security-settings"
                                >
                                    <div className="accordion-item">
                                        <div
                                            className="accordion-header"
                                            id="security-heading-1"
                                        >
                                            <div
                                                aria-controls="security-collapse-1"
                                                aria-expanded="false"
                                                className="accordion-button collapsed p-0 pb-4"
                                                data-bs-target="#security-collapse-1"
                                                data-bs-toggle="collapse"
                                                role="button"
                                            >
                                                <div>
                                                    <h5 className="mb-1">
                                                        Password settings
                                                    </h5>
                                                    <p className="text-muted mb-0">
                                                        Manage your password
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            aria-labelledby="security-heading-1"
                                            className="accordion-collapse collapse"
                                            id="security-collapse-1"
                                        >
                                            <div className="accordion-body p-0 pb-4">
                                                <div className="mb-4">
                                                    <div className="input-group">
                                                        <input
                                                            aria-label="Current password"
                                                            className="form-control form-control-lg form-control-solid"
                                                            placeholder="Current password"
                                                            type="password"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mb-4">
                                                    <div className="input-group">
                                                        <input
                                                            aria-label="New password"
                                                            className="form-control form-control-lg form-control-solid"
                                                            placeholder="New password"
                                                            type="password"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mb-4">
                                                    <div className="input-group">
                                                        <input
                                                            aria-label="Confirm password"
                                                            className="form-control form-control-lg form-control-solid"
                                                            placeholder="Confirm password"
                                                            type="password"
                                                        />
                                                    </div>
                                                </div>
                                                <button className="btn btn-lg btn-primary w-100">
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="accordion-item">
                                        <div className="accordion-header">
                                            <div className="row align-items-center mt-4">
                                                <div className="col">
                                                    <h5 className="mb-1">
                                                        Two-step authentication
                                                    </h5>
                                                    <p className="text-muted mb-0">
                                                        Enable two-step authentication
                                                    </p>
                                                </div>
                                                <div className="col-auto">
                                                    <div className="form-check form-switch">
                                                        <input
                                                            className="form-check-input"
                                                            defaultChecked
                                                            id="switch-authentication"
                                                            type="checkbox"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mb-3">
                        <div className="d-flex align-items-center mx-4 mb-3">
                            <small className="text-muted me-auto">
                                Notifications
                            </small>
                        </div>
                        <div className="card">
                            <div className="card-body">
                                <div
                                    className="accordion accordion-flush"
                                    id="accordion-notification-settings"
                                >
                                    <div className="accordion-item">
                                        <div
                                            className="accordion-header"
                                            id="notification-heading-1"
                                        >
                                            <div
                                                aria-controls="notification-collapse-1"
                                                aria-expanded="false"
                                                className="accordion-button collapsed p-0 pb-4"
                                                data-bs-target="#notification-collapse-1"
                                                data-bs-toggle="collapse"
                                                role="button"
                                            >
                                                <div>
                                                    <h5 className="mb-1">
                                                        Notifications
                                                    </h5>
                                                    <p className="text-muted mb-0">
                                                        Manage notification settings
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            aria-labelledby="notification-heading-1"
                                            className="accordion-collapse collapse"
                                            id="notification-collapse-1"
                                        >
                                            <div className="accordion-body p-0 pb-4">
                                                <ul className="list-group list-group-flush">
                                                    <li className="list-group-item p-0 pb-4">
                                                        <div className="row align-items-center">
                                                            <div className="col">
                                                                <h5 className="mb-1">
                                                                    Sound effects
                                                                </h5>
                                                                <p className="text-muted mb-0">
                                                                    Enable notificaton sound effects
                                                                </p>
                                                            </div>
                                                            <div className="col-auto">
                                                                <div
                                                                    className="form-check form-switch">
                                                                    <input
                                                                        className="form-check-input"
                                                                        id="switch-sound-notification"
                                                                        type="checkbox"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                    <li className="list-group-item p-0 pt-4">
                                                        <div className="row align-items-center">
                                                            <div className="col">
                                                                <h5 className="mb-1">
                                                                    Browser notifications
                                                                </h5>
                                                                <p className="text-muted mb-0">
                                                                    Receive notifications from
                                                                    browser
                                                                </p>
                                                            </div>
                                                            <div className="col-auto">
                                                                <div
                                                                    className="form-check form-switch">
                                                                    <input
                                                                        className="form-check-input"
                                                                        defaultChecked
                                                                        id="switch-browser-notification"
                                                                        type="checkbox"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="accordion-item">
                                        <div className="accordion-header">
                                            <div className="row align-items-center mt-4">
                                                <div className="col">
                                                    <h5 className="mb-1">
                                                        Read receipts
                                                    </h5>
                                                    <p className="text-muted mb-0">
                                                        Turn on to see read recipts
                                                    </p>
                                                </div>
                                                <div className="col-auto">
                                                    <div className="form-check form-switch">
                                                        <input
                                                            className="form-check-input"
                                                            id="switch-receipts"
                                                            type="checkbox"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mb-3">
                        <div className="d-flex align-items-center mx-4 mb-3">
                            <small className="text-muted me-auto">
                                Last activity
                            </small>
                            <a
                                className="text-muted small"
                                href="#"
                            >
                                Logout from all devices{' '}
                            </a>
                        </div>
                        <div className="card">
                            <div className="card-body">
                                <ul className="list-group list-group-flush">
                                    <li className="list-group-item p-0 pb-4">
                                        <div className="row align-items-center">
                                            <div className="col">
                                                <h5 className="mb-1">
                                                    Windows · USA, NY
                                                </h5>
                                                <p className="text-muted mb-0">
                                                    Today at 1:25 PM | Browser: Edge
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                    <li className="list-group-item p-0 pt-4">
                                        <div className="row align-items-center">
                                            <div className="col">
                                                <h5 className="mb-1">
                                                    Android · USA, NY
                                                </h5>
                                                <p className="text-muted mb-0">
                                                    Today at 7:25 AM | Browser: Chrome
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SettingTab;