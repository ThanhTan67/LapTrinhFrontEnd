import { useEffect, useRef, useState } from 'react'; // Import các hook từ React để sử dụng
import '../scss/styles-light.min.css'; // Import CSS cho giao diện
import $ from 'jquery'; // Import thư viện jQuery
import 'bootstrap/dist/css/bootstrap.min.css'; // Import CSS của Bootstrap
import 'bootstrap/dist/js/bootstrap.bundle.min'; // Import JavaScript của Bootstrap
import 'magnific-popup/dist/magnific-popup.css'; // Import CSS của Magnific Popup
import 'magnific-popup'; // Import JavaScript của Magnific Popup
import ChatBox from "./Chat/chat"; // Import component ChatBox từ file ./Chat/chat
import { useNavigate } from "react-router-dom"; // Hook để chuyển hướng giữa các route trong React Router
import { useDispatch, useSelector } from "react-redux"; // Hooks từ Redux để gửi action và lấy state từ store Redux
import { initializeSocket, reLoginUser } from "../socket/socket"; // Import các hàm từ file socket/socket.js

function Home() {
    const login = useSelector((state) => state.login); // Lấy trạng thái đăng nhập từ store Redux
    const chatContainerRef = useRef(null); // Tạo ref để tham chiếu đến phần tử DOM của chat container
    const navigate = useNavigate(); // Hook để chuyển hướng giữa các route
    const dispatch = useDispatch(); // Hook để gửi action đến store Redux

    // Kiểm tra và duy trì trạng thái đăng nhập
    useEffect(() => {
        if (!login.status) { // Nếu người dùng chưa đăng nhập
            if (localStorage.getItem("reLogin") !== null) {
                // Kết nối lại socket nếu có thông tin đăng nhập từ localStorage
                initializeSocket('ws://140.238.54.136:8080/chat/chat');
                reLoginUser(localStorage.getItem("username"), localStorage.getItem("reLogin"));
            } else {
                navigate("/login"); // Chuyển hướng đến trang đăng nhập nếu không có thông tin đăng nhập
            }
        }
    }, [dispatch, navigate, login]); // useEffect này chạy khi dispatch, navigate hoặc login thay đổi

    // Các tác vụ DOM và sự kiện
    useEffect(() => {
        // Xử lý click vào danh sách liên lạc
        $(document).on('click', '.js-contact-list .contact-item', function () {
            $(".contact-item").removeClass("active");
            $(this).addClass("active");
        });

        // Xử lý toggle navigation
        $('.navigation-toggle').on("click", function (e) {
            e.stopPropagation(); // Ngăn sự kiện lan truyền
            $('.navigation').toggleClass("navigation-visible"); // Toggle class để hiển thị/ẩn navigation
        });

        // Ngăn sự kiện click trên navigation lan truyền ra ngoài
        $('.navigation').on("click", function (e) {
            e.stopPropagation(); // Ngăn sự kiện lan truyền
        });

        // Ẩn navigation khi click vào bất kỳ đâu trên body hoặc html
        $('body,html').on("click", function () {
            $('.navigation').removeClass('navigation-visible');
        });

        // Ẩn navigation khi resize cửa sổ nếu màn hình lớn hơn 1200px
        $(window).on("resize", function () {
            if ($(this).width() > 1200) {
                $('.navigation').removeClass('navigation-visible');
            }
        }).trigger('resize'); // Kích hoạt sự kiện resize ngay khi load trang

        // Ẩn phần main khi click vào nút chat-hide
        $(".chat-hide").on("click", function () {
            $(".main").removeClass("main-visible");
        });

        // Toggle hiển thị thông tin chat khi click vào nút chat-info-toggle
        $(".chat-info-toggle").on("click", function () {
            $(".chat-info").toggleClass('chat-info-visible');
        });

        // Đóng thông tin chat khi click vào nút chat-info-close
        $(".chat-info-close").on("click", function () {
            $(".chat-info").removeClass("chat-info-visible");
        });

        // Sử dụng Magnific Popup cho danh sách ảnh chia sẻ
        $('.shared-image-list').magnificPopup({
            delegate: 'a.shared-image',
            type: 'image',
            mainClass: 'mfp-fade',
            closeOnContentClick: true,
            showCloseBtn: false,
            zoom: {
                enabled: true,
                duration: 300,
                easing: 'ease',
            },
            image: {
                cursor: 'pointer',
            }
        });

        // Cleanup: Loại bỏ các event listener khi component unmount
        return () => {
            $(document).off('click', '.js-contact-list .contact-item');
            $('.navigation-toggle').off("click");
            $('.navigation').off("click");
            $('body,html').off("click");
            $(window).off("resize");
            $(".chat-hide").off("click");
            $(".chat-info-toggle").off("click");
            $(".chat-info-close").off("click");
        };
    }, []); // useEffect này chỉ chạy một lần khi component được render lần đầu

    // Scroll xuống cuối chat container khi component được render lại
    useEffect(() => {
        const chatContainer = chatContainerRef.current;
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });

    return (
        <>
            <ChatBox /> {/* Hiển thị component ChatBox */}
        </>
    )
}

export default Home;
