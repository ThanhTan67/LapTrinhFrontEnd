import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Authentication.css';
import { toast } from 'react-toastify';
import { loginUser, reLoginUser, initializeSocket } from "../../socket/socket";
import $ from 'jquery';
import { resetStatus } from "../../redux/action/action";
import { initializeSingleTabAuth, markThisTabAsActive } from '../../utils/single-tab-auth';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitCount, setSubmitCount] = useState(0);

    const loginStatus = useSelector((state) => state?.login?.status || 'idle');
    const loginErrorMsg = useSelector((state) => state?.login?.error || '');

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const errorKeyRef = useRef(Date.now());

    // ====================== KHỞI TẠO SOCKET SAU LOGOUT ======================
    useEffect(() => {
        const socketUrl = 'wss://appchat-server.up.railway.app/chat';
        initializeSocket(socketUrl);

        return () => {
            // Không đóng socket khi chuyển sang Home
        };
    }, []);

    // ====================== CLEANUP MODAL ======================
    useEffect(() => {
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open');
        $('body').css('padding-right', '');

        const cleanup = initializeSingleTabAuth(dispatch, navigate);
        return cleanup;
    }, [dispatch, navigate]);

    // ====================== LOGIN SUCCESS ======================
    useEffect(() => {
        if (loginStatus === 'success') {
            localStorage.setItem('username', username.trim());
            markThisTabAsActive(username.trim());
            navigate('/Home', { replace: true });
        }
    }, [loginStatus, username, navigate]);

    // ====================== XỬ LÝ LỖI ======================
    useEffect(() => {
        if (loginStatus === 'error') {
            const msg = loginErrorMsg || 'Đăng nhập thất bại. Vui lòng thử lại.';
            errorKeyRef.current = Date.now();
            setError(msg);
            toast.error(msg, {
                position: "top-right",
                autoClose: 8000,
                toastId: `error-${Date.now()}`
            });
            localStorage.removeItem('reLogin');
        } else if (loginStatus === 'loading' || loginStatus === 'idle') {
            setError('');
        }
    }, [loginStatus, loginErrorMsg, submitCount]);

    // ====================== RE-LOGIN ======================
    useEffect(() => {
        const reLoginCode = localStorage.getItem('reLogin');
        const storedUsername = localStorage.getItem('username');
        if (reLoginCode && storedUsername && loginStatus !== 'success') {
            reLoginUser(storedUsername, reLoginCode);
        }
    }, [loginStatus]);

    // ====================== HANDLERS ======================
    const handleUsernameChange = (e) => {
        setUsername(e.target.value);
        if (error) setError('');
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (error) setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('Vui lòng nhập đầy đủ thông tin');
            toast.warn('Vui lòng nhập đầy đủ thông tin', { autoClose: 4000 });
            return;
        }

        setSubmitCount(prev => prev + 1);
        setError('');
        dispatch(resetStatus());
        loginUser(username.trim(), password.trim());
    };

    const handleCloseError = () => setError('');
    const togglePassword = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowPassword(!showPassword);
    };

    return (
        <div>
            <section className="sign-in">
                <div className="container">
                    <div className="signin-content">
                        <div className="signin-image">
                            <figure>
                                <img src="/image/signin-image.jpg" alt="sign in image" width={400} height={500} />
                            </figure>
                            <Link to="/Register" className="signup-image-link">
                                <FontAwesomeIcon style={{ fontSize: '22px' }} icon={faUser} /> Tạo tài khoản
                            </Link>
                        </div>

                        <div className="signin-form">
                            <h2 className="form-title">Đăng nhập</h2>

                            {error && (
                                <div key={errorKeyRef.current} className="alert alert-danger alert-dismissible fade show" role="alert">
                                    <strong><i className="fas fa-exclamation-circle"></i></strong> {error}
                                    <button type="button" className="btn-close" onClick={handleCloseError} aria-label="Close" />
                                </div>
                            )}

                            <form method="POST" className="register-form" id="login-form" onSubmit={handleSubmit}>
                                {/* Username */}
                                <div className="form-group" style={{ position: 'relative', marginBottom: '25px' }}>
                                    <label htmlFor="your_username" style={{
                                        position: 'absolute',
                                        left: '0',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#333'
                                    }}>
                                        <FontAwesomeIcon style={{ fontSize: '18px' }} icon={faUser} />
                                    </label>
                                    <input
                                        type="text"
                                        name="your_username"
                                        id="your_username"
                                        placeholder="Tên đăng nhập"
                                        value={username}
                                        onChange={handleUsernameChange}
                                        style={{
                                            width: '100%',
                                            padding: '8px 8px 8px 35px',
                                            border: 'none',
                                            borderBottom: '2px solid #ccc',
                                            outline: 'none',
                                            fontSize: '15px',
                                            transition: 'border-color 0.3s',
                                            fontFamily: 'inherit'
                                        }}
                                        onFocus={(e) => e.target.style.borderBottomColor = '#6c5ce7'}
                                        onBlur={(e) => e.target.style.borderBottomColor = '#ccc'}
                                        autoComplete="off"
                                    />
                                </div>

                                {/* Password */}
                                <div className="form-group" style={{ position: 'relative', marginBottom: '25px' }}>
                                    <label htmlFor="your_pass" style={{
                                        position: 'absolute',
                                        left: '0',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#333',
                                        zIndex: 1
                                    }}>
                                        <FontAwesomeIcon style={{ fontSize: '18px' }} icon={faLock} />
                                    </label>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="your_pass"
                                            id="your_pass"
                                            placeholder="Mật khẩu"
                                            value={password}
                                            onChange={handlePasswordChange}
                                            style={{
                                                width: '100%',
                                                padding: '8px 40px 8px 35px',
                                                border: 'none',
                                                borderBottom: '2px solid #ccc',
                                                outline: 'none',
                                                fontSize: '15px',
                                                transition: 'border-color 0.3s',
                                                fontFamily: 'inherit'
                                            }}
                                            onFocus={(e) => e.target.style.borderBottomColor = '#6c5ce7'}
                                            onBlur={(e) => e.target.style.borderBottomColor = '#ccc'}
                                            autoComplete="off"
                                        />
                                        <button
                                            type="button"
                                            onClick={togglePassword}
                                            style={{
                                                position: 'absolute',
                                                right: '5px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: '#999',
                                                fontSize: '16px',
                                                cursor: 'pointer',
                                                padding: '5px',
                                                zIndex: 2,
                                                transition: 'color 0.3s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.color = '#6c5ce7'}
                                            onMouseLeave={(e) => e.target.style.color = '#999'}
                                            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                        >
                                            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                        </button>
                                    </div>
                                </div>

                                {/* Remember me */}
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <input type="checkbox" name="remember-me" id="remember-me" className="agree-term visually-hidden" />
                                    <label htmlFor="remember-me" className="label-agree-term">
                                        <span><span></span></span>Ghi nhớ tài khoản
                                    </label>
                                </div>

                                {/* Button submit */}
                                <div className="form-group form-button">
                                    <input
                                        type="submit"
                                        name="signin"
                                        id="signin"
                                        className="form-submit"
                                        value={loginStatus === 'loading' ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}
                                        disabled={loginStatus === 'loading'}
                                        style={{
                                            background: '#507eb5',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '10px 30px',
                                            borderRadius: '5px',
                                            fontSize: '16px',
                                            fontWeight: '500',
                                            cursor: loginStatus === 'loading' ? 'not-allowed' : 'pointer',
                                            opacity: loginStatus === 'loading' ? 0.7 : 1,
                                            transition: 'background 0.3s'
                                        }}
                                    />
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Login;