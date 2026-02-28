
import React, {useEffect, useState} from 'react';
import {useSelector} from "react-redux";
import {useParams} from "react-router-dom";
import {getPeopleChatMes, getRoomChatMes} from "../../../socket/socket";


function SearchChat() {
    const messages = useSelector(state => state.messages?.data);
    const { type, name } = useParams();
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (type && name) {
            if (type === 'friend') {
                getPeopleChatMes(name);
            } else if (type === 'group') {
                getRoomChatMes(name);
            }
        }
    }, [type, name]);


    // Xử lý khi người dùng nhấn Enter trong ô tìm kiếm
    const handleSearch = (event) => {
        if (event.key === 'Enter') {
            // Thực hiện tìm kiếm ở đây, ví dụ:
            console.log("Searching for:", searchTerm);
        }
    };

    // Lọc và đếm số lượng tin nhắn
    const filteredMessages = messages?.map(message => message.mes)
        .filter(mess => mess?.toLowerCase().includes(searchTerm.toLowerCase())) || [];

    return (
        <div>
            <div
                className="border-bottom collapse"
                id="search-chat"
            >
                <div className="px-1 py-4">
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col">
                                <div className="input-group">
                                    <input
                                        aria-describedby="search-in-chat-button"
                                        aria-label="Search in chat"
                                        className="form-control form-control-lg"
                                        placeholder="Search in chat"
                                        type="text"
                                    />
                                    <button
                                        className="btn btn-white btn-lg border"
                                        id="search-in-chat-button"
                                        type="button"
                                    >
                                        <i className="ri-search-line"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SearchChat;