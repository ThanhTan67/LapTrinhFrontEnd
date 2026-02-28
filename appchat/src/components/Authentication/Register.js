import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { register } from '../../socket/socket';
import { useDispatch, useSelector } from "react-redux";
import { resetStatus } from "../../redux/action/action";
import { getDatabase, ref, set, get, query, orderByChild, equalTo } from "firebase/database";

const Register = () => {
    //khai báo các state sử dụng trong component
    const [username, setUsername] = useState('');//state để lưu trữ username
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false); // state đê điều khiển hiển thị password
    const navigate = useNavigate();// Hook từ react-router-dom để điều hướng trang
    const dispatch = useDispatch();// Hook từ Redux để gửi các action đến store
    const registerStatus = useSelector((state) => state.register.status);// Sử dụng useSelector để lấy trạng thái đăng ký từ store
    const [agree, setAgree] = useState(false);// State để xác nhận đồng ý với điều khoản

    // Sử dụng useEffect để xử lý khi trạng thái đăng ký thay đổi
    useEffect(() => {
        if (registerStatus === "success") {
            setError("");// Xóa thông báo lỗi nếu đăng ký thành công
            saveUserToFirebase();// Lưu thông tin người dùng vào Firebase
            navigate('/Login');
            dispatch(resetStatus());// Reset trạng thái đăng ký trong store
        } else if (registerStatus === "error") {
            setError("Tài khoản đã tồn tại");
        }
    }, [registerStatus, navigate, dispatch]);

    const validatePassword = (password) => {
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
        return regex.test(password);//trả ve true false, tìm trong password có các phần tử được yêu cầu không
        //password phải chứa tất cả các phần tử mà regex yêu cầu để được coi là hợp lệ.
    };
  //xử lý khi người dùng submit form đăng ký
    const handleSubmit = (e) => {
        e.preventDefault();//ngăn chặn hành động mặc định của form khi người dùng nhấn nút submit,để không làm tải lại trang
        //không có giá trị
        if (!username || !password || !agree) {
            setError('Vui lòng nhập đầy đủ thông tin và chọn đồng ý');
            return;
        }
        if (!validatePassword(password)) {
            setError('Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ cái, số và ký tự đặc biệt.');
            return;
        }

        register(username, password);
    };

    const saveUserToFirebase = async () => {
        const db = getDatabase();
        const usersRef = ref(db, 'users');
        // Sử dụng hàm ref(db, 'users') để tham chiếu đến collection 'users' trong database.
        //nó cho phép bạn làm việc với danh sách người dùng đã được lưu trữ tại vị trí users trong cơ sở dữ liệu Firebase.
        /*const usersRef = ref(db, 'users'); không trả về mảng. Thay vào đó, nó trả về một đối tượng Reference của Firebase,
        cho phép bạn tương tác với vị trí users trong cơ sở dữ liệu. Bạn có thể sử dụng usersRef để thực hiện các thao tác như đọc,
         ghi, hoặc lắng nghe thay đổi dữ liệu tại vị trí đó.

Để lấy dữ liệu từ usersRef, bạn cần sử dụng các phương thức như get() để nhận dữ liệu, có thể được trả về dưới dạng mảng hoặc
đối tượng tùy thuộc vào cách bạn lưu trữ dữ liệu trong Firebase.*/
        const userQuery = query(usersRef, orderByChild('username'), equalTo(username));
        //để tìm kiếm người dùng theo tên người dùng (username).
        //Tạo một truy vấn từ tham chiếu usersRef.
        const snapshot = await get(userQuery);
        //Sử dụng await để đợi kết quả truy vấn, và lưu nó vào biến snapshot.
        if (!snapshot.exists()) {
            //Kiểm tra xem kết quả truy vấn có tồn tại hay không. Nếu không tồn tại, nghĩa là tên đăng nhập chưa được sử dụng.
            const allUsersSnapshot = await get(usersRef);
            //Thực hiện một truy vấn để lấy tất cả người dùng từ collection 'users'.
            let newUserId = 1;
            //khởi tạo id người dùng mới là 1
            if (allUsersSnapshot.exists()) {
                const users = allUsersSnapshot.val();
                //val() được sử dụng để chuyển đổi dữ liệu từ đối tượng DataSnapshot thành một đối tượng JavaScript
                const userIds = Object.keys(users).map(id => parseInt(id, 10));//là mảng
                //Object.keys(users) lấy tất cả các ID người dùng dưới dạng chuỗi.
                // .map(id => parseInt(id, 10)) chuyển đổi tất cả các ID này từ chuỗi thành số nguyên.
                //Kết quả cuối cùng là một mảng chứa các ID người dùng dưới dạng số nguyên.
                newUserId = Math.max(...userIds) + 1;
                //Tìm ID lớn nhất và cộng thêm 1 để tạo ra ID mới cho người dùng sắp đăng ký.
            }
            // Lưu người dùng mới vào cơ sở dữ liệu
            set(ref(db, `users/${newUserId}`), {
                id: newUserId,
                username: username,
                password: password
            }).then(() => {
                console.log('User saved successfully');
            }).catch((error) => {
                console.error('Error saving user: ', error);
            });
        }
    };
    //hàm hiển thị mật khẩu
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div>
            <section className="signup">
                <div className="container">
                    <div className="signup-content">
                        <div className="signup-form">
                            <h2 className="form-title">Đăng ký</h2>
                            {error && <p style={{ color: 'red' }}>{error}</p>}
                    {/*Trong JSX, cú pháp {condition && expression} là một cách viết tắt để điều kiện hiển thị nội dung.*/}
                            <form method="POST" className="register-form" id="register-form" onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label htmlFor="name">
                                        <FontAwesomeIcon icon={faUser}/>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        id="name"
                                        placeholder="Nhập username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        //khi giá trị của trường nhập thay đổi thì nó sẽ cập nhật trạng thái của username
                                        required //đánh dấu trường bắt buộc
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="pass">
                                        <FontAwesomeIcon icon={faLock}/>
                                    </label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="pass"
                                        id="pass"
                                        placeholder="Nhập mật khẩu"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <FontAwesomeIcon
                                        icon={showPassword ? faEyeSlash : faEye}
                                        className="password-icon"
                                        onClick={togglePasswordVisibility}
                                        style={{
                                            cursor: 'pointer',
                                            position: 'absolute',
                                            top: '50%',
                                            right: '10px',
                                            transform: 'translateY(-50%)'
                                        }}
                                    />
                                </div>
                                <div className="form-group" style={{marginTop: '-10px'}}>
                                    <input
                                        type="checkbox"
                                        name="agree-term"
                                        id="agree-term"
                                        className="agree-term"
                                        checked={agree}
                                        onChange={(e) => setAgree(e.target.checked)}
                                    />
                                    <label htmlFor="agree-term" className="label-agree-term">
                                        <span><span></span></span> Đồng ý với các điều khoản
                                    </label>
                                </div>
                                <div className="form-group form-button">
                                    <input type="submit" name="signup" id="signup" className="form-submit"
                                           value="Đăng ký"/>
                                </div>
                            </form>
                        </div>
                        <div className="signup-image">
                            <figure>
                                <img width={400} height={500} src="/image/signup-image.jpg" alt="sing up image"/>
                            </figure>
                            <Link to="/Login" className="signup-image-link">
                                Đã có tài khoản? Đăng nhập!
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Register;
