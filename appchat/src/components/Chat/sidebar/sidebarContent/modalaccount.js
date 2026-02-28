import React, {useEffect, useState} from "react";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {initializeSocket, logoutUser, logoutUsers, socketActions} from '../../../../socket/socket';

const Logout = () => {
    const [socket, setSocket] = useState(null);
    const dispatch = useDispatch();
    const logoutStatus = useSelector((state) => state.logout.status);
    const navigate = useNavigate();
    const username = localStorage.getItem('username');

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

    const handleLogout = (e) => {
        e.preventDefault();
        logoutUsers();
    };

    return (
        <div
            aria-hidden="true"
            aria-labelledby="modal-account"
            className="modal fade"
            id="modal-account"
            tabIndex="-1"
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="profile text-center">
                        <div className="profile-img text-primary px-5">
                            <svg
                                fill="currentColor"
                                viewBox="0 0 300 100"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <defs>
                                    <style
                                        dangerouslySetInnerHTML={{
                                            __html: '                                    .st1 {                                        fill: #fff;                                        opacity: 0.1;                                    }                                ',
                                        }}
                                    />
                                </defs>
                                <path d="M300,0v80c0,11-9,20-20,20H20C9,100,0,91,0,80V0H300z" />
                                <path
                                    className="st1"
                                    d="M50,71c-16,0-29,13-29,29h10c0-10.5,8.5-19,19-19s19,8.5,19,19h10C79,84,66,71,50,71z"
                                />
                                <path
                                    className="st1"
                                    d="M31.6,0H21.3C21.8,1.6,22,3.3,22,5c0,10.5-8.5,19-19,19c-1,0-2-0.1-3-0.2v10.1C1,34,2,34,3,34c16,0,29-13,29-29C32,3.3,31.8,1.6,31.6,0z"
                                />
                                <path
                                    className="st1"
                                    d="M238.5,58C217.3,58,200,75.3,200,96.5c0,1.2,0,2.3,0.2,3.5h10.1c-0.1-1.2-0.2-2.3-0.2-3.5c0-15.7,12.8-28.5,28.5-28.5S267,80.8,267,96.5c0,1.2-0.1,2.3-0.2,3.5h10.1c0.1-1.2,0.2-2.3,0.2-3.5C277,75.3,259.7,58,238.5,58z"
                                />
                                <path
                                    className="st1"
                                    d="M299,22c-11,0-20-9-20-20c0-0.7,0-1.3,0.1-2h-10C269,0.7,269,1.3,269,2c0,16.5,13.5,30,30,30c0.3,0,0.7,0,1,0V22C299.7,22,299.3,22,299,22z"
                                />
                            </svg>
                        </div>
                        <div className="profile-content">
                            <div className="avatar avatar-lg">
                                <span className="avatar-label bg-soft-success text-success fs-3">
                                    {username?username.charAt(0):''}
                                </span>
                            </div>
                            <h5 className="m-1">{username}</h5>
                            <p className="text-muted">Online</p>
                        </div>
                    </div>
                    {/* <div className="modal-body p-0">
                        <ul className="list-group list-group-flush">
                            <li className="list-group-item p-4">
                                <div className="row align-items-center">
                                    <div className="col">
                                        <h5 className="mb-1">Location</h5>
                                        <p className="text-muted mb-0">New York, USA</p>
                                    </div>
                                    <div className="col-auto">
                                        <button className="btn btn-icon btn-light rounded-circle" type="button">
                                            <i className="ri-global-line" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                            <li className="list-group-item p-4">
                                <div className="row align-items-center">
                                    <div className="col">
                                        <h5 className="mb-1">E-mail</h5>
                                        <p className="text-muted mb-0">john@gmail.com</p>
                                    </div>
                                    <div className="col-auto">
                                        <button className="btn btn-icon btn-light rounded-circle" type="button">
                                            <i className="ri-mail-line" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                            <li className="list-group-item p-4">
                                <div className="row align-items-center">
                                    <div className="col">
                                        <h5 className="mb-1">Phone</h5>
                                        <p className="text-muted mb-0">646-351-2445</p>
                                    </div>
                                    <div className="col-auto">
                                        <button className="btn btn-icon btn-light rounded-circle" type="button">
                                            <i className="ri-phone-line" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                            <li className="list-group-item p-4">
                                <div className="row align-items-center">
                                    <div className="col">
                                        <h5 className="mb-1">Active status</h5>
                                        <p className="text-muted mb-0">Share your active status with friends</p>
                                    </div>
                                    <div className="col-auto">
                                        <div className="form-check form-switch">
                                            <input
                                                className="form-check-input"
                                                defaultChecked
                                                id="switch-active-status"
                                                type="checkbox"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </li>
                        </ul>
                    </div> */}
                    <div className="modal-footer">
                        <button className="btn btn-secondary" data-bs-dismiss="modal" type="button">
                            Đóng
                        </button>
                        <button className="btn btn-primary" type="submit" onClick={handleLogout}>
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Logout;
