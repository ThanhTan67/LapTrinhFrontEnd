// ChatBox.js
import React, { useState } from 'react';
import '../../scss/styles-light.min.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import 'magnific-popup/dist/magnific-popup.css';
import 'magnific-popup';
import Sidebar from "./sidebar/sidebar";
import ModalAccount from "./sidebar/sidebarContent/modalaccount";
import ModalInvite from "./sidebar/sidebarContent/modalinvite";
import UserProfile from "./content/userprofile";
import ChatFooter from "./content/chatfooter/chatfooter";
import ChatContent from "./content/chatcontent/chatcontent";
import ChatHeader from "./content/chatheader/chatheader";
import SearchChat from "./content/searchchat";

function ChatBox() {
    const [activeComponent, setActiveComponent] = useState('ChatContent');
    const [name, setName] = useState('');

    // Hàm này sẽ được gọi khi người dùng chọn một người bạn hoặc nhóm từ sidebar
    const handleSelectChat = (selectedComponent, selectedName) => {
        setActiveComponent(selectedComponent);
        setName(selectedName);
    };

    console.log('Active Component:', activeComponent);
    console.log('Name:', name);

    return (
        <>
            <div className="layout">
                <Sidebar onSelectChat={handleSelectChat} />
                <div className="main main-visible overflow-hidden h-100">
                    <div className="chat d-flex flex-row h-100">
                        <div className="chat-body h-100 w-100 d-flex flex-column">
                            <ChatHeader />
                            <SearchChat />
                            <ChatContent/>
                            <ChatFooter name={name} />
                        </div>
                        <UserProfile />
                    </div>
                </div>
            </div>
            <ModalAccount />
            <ModalInvite />
        </>
    );
}

export default ChatBox;