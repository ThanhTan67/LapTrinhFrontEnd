// src/components/home.js
import { useEffect, useRef } from 'react';
import '../scss/styles-light.min.css';
import $ from 'jquery';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import 'magnific-popup/dist/magnific-popup.css';
import 'magnific-popup';
import ChatBox from "./Chat/chat";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { reLoginUser } from "../socket/socket";

function Home() {
    const login = useSelector((state) => state.login);
    const chatContainerRef = useRef(null);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Kiểm tra và duy trì trạng thái đăng nhập
    useEffect(() => {
        if (!login.status) {
            const reLoginCode = localStorage.getItem("reLogin");
            const username = localStorage.getItem("username");

            if (reLoginCode && username) {
                console.log('🏠 Home: reLoginUser', username);
                // CHỈ gọi reLoginUser, KHÔNG gọi initializeSocket
                reLoginUser(username, reLoginCode);
            } else {
                navigate("/login");
            }
        }
    }, [dispatch, navigate, login]);

    // Các tác vụ DOM và sự kiện
    useEffect(() => {
        // Xử lý click vào danh sách liên lạc
        $(document).on('click', '.js-contact-list .contact-item', function () {
            $(".contact-item").removeClass("active");
            $(this).addClass("active");
        });

        // Xử lý toggle navigation
        $('.navigation-toggle').on("click", function (e) {
            e.stopPropagation();
            $('.navigation').toggleClass("navigation-visible");
        });

        // Ngăn sự kiện click trên navigation lan truyền ra ngoài
        $('.navigation').on("click", function (e) {
            e.stopPropagation();
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
        }).trigger('resize');

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
    }, []);

    // Scroll xuống cuối chat container khi component được render lại
    useEffect(() => {
        const chatContainer = chatContainerRef.current;
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });

    return (
        <>
            <ChatBox />
        </>
    );
}

export default Home;