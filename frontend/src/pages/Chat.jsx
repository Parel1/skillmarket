import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiFetch } from "../services/api";

function Chat() {
    const navigate = useNavigate();
    const { conversationId } = useParams();

    const [conversations, setConversations] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");

    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        loadConversations();
    }, [conversationId, navigate]);

    async function loadConversations() {
        setLoadingConversations(true);

        try {
            const data = await apiFetch("/conversations");

            const list = Array.isArray(data)
                ? data
                : data.data || [];

            setConversations(list);

            if (conversationId) {
                const conversation = list.find(
                    (item) =>
                        String(item.id) ===
                        String(conversationId)
                );

                if (conversation) {
                    await openConversation(conversation);
                }
            }
        } catch (error) {
            console.error(
                "Gagal mengambil conversation:",
                error
            );
        } finally {
            setLoadingConversations(false);
        }
    }

    async function openConversation(conversation) {
        setSelectedId(conversation.id);
        setSelectedConversation(conversation);
        setLoadingMessages(true);

        try {
            const data = await apiFetch(
                `/conversations/${conversation.id}/messages`
            );

            const list = Array.isArray(data)
                ? data
                : data.data || [];

            setMessages(list);

            if (
                !conversationId ||
                String(conversationId) !==
                    String(conversation.id)
            ) {
                navigate(`/chat/${conversation.id}`);
            }
        } catch (error) {
            console.error(
                "Gagal mengambil messages:",
                error
            );

            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    }

    async function sendMessage(event) {
        event.preventDefault();

        const content = message.trim();

        if (!content || !selectedId || sending) {
            return;
        }

        setSending(true);

        try {
            const data = await apiFetch(
                `/conversations/${selectedId}/messages`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        content
                    })
                }
            );

            const newMessage =
                data.data || data.message || data;

            setMessages((current) => [
                ...current,
                newMessage
            ]);

            setMessage("");

            await loadConversations();
        } catch (error) {
            console.error(
                "Gagal mengirim pesan:",
                error
            );

            alert(
                error.message ||
                    "Gagal mengirim pesan."
            );
        } finally {
            setSending(false);
        }
    }

    function getCurrentUser() {
        try {
            return JSON.parse(
                localStorage.getItem("user") || "null"
            );
        } catch {
            return null;
        }
    }

    function getOtherUser(conversation) {
        const currentUser = getCurrentUser();

        return (
            conversation.participants?.find(
                (participant) =>
                    Number(participant.id) !==
                    Number(currentUser?.id)
            ) || null
        );
    }

    function getUserName(conversation) {
        const user = getOtherUser(conversation);

        return user?.name || "Pengguna";
    }

    function getMessageText(item) {
        return item.content || "";
    }

    function isMyMessage(item) {
        const currentUser = getCurrentUser();

        return (
            Number(item.senderId) ===
            Number(currentUser?.id)
        );
    }

    function formatTime(date) {
        if (!date) {
            return "";
        }

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) {
            return "";
        }

        return parsed.toLocaleTimeString(
            "id-ID",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }

    return (
        <>
            <Navbar />

            <main className="container chat-page">
                <div className="page-head">
                    <span className="section-kicker">
                        Komunikasi
                    </span>

                    <h1>Chat</h1>

                    <p>
                        Komunikasi dengan client atau
                        freelancer.
                    </p>
                </div>

                <div className="chat-layout">

                    {/* DAFTAR CONVERSATION */}
                    <aside className="conversation-panel">
                        <div className="conversation-head">
                            <h2>Percakapan</h2>
                        </div>

                        <div id="conversationList">
                            {loadingConversations ? (
                                <div className="empty">
                                    Memuat conversation...
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="empty">
                                    Belum ada percakapan.
                                </div>
                            ) : (
                                conversations.map(
                                    (conversation) => (
                                        <button
                                            key={
                                                conversation.id
                                            }
                                            type="button"
                                            className={`conversation-item ${
                                                selectedId ===
                                                conversation.id
                                                    ? "active"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                openConversation(
                                                    conversation
                                                )
                                            }
                                        >
                                            <strong>
                                                {getUserName(
                                                    conversation
                                                )}
                                            </strong>

                                            <small>
                                                {conversation
                                                    .lastMessage
                                                    ?.content ||
                                                    "Belum ada pesan"}
                                            </small>
                                        </button>
                                    )
                                )
                            )}
                        </div>
                    </aside>

                    {/* CHAT PANEL */}
                    <section className="chat-panel">

                        <div
                            id="chatHeader"
                            className="chat-header"
                        >
                            <strong>
                                {selectedConversation
                                    ? getUserName(
                                          selectedConversation
                                      )
                                    : "Pilih percakapan"}
                            </strong>
                        </div>

                        <div
                            id="messageList"
                            className="message-list"
                        >
                            {!selectedId ? (
                                <div className="empty">
                                    Pilih conversation untuk
                                    melihat pesan.
                                </div>
                            ) : loadingMessages ? (
                                <div className="empty">
                                    Memuat pesan...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="empty">
                                    Belum ada pesan. Kirim
                                    pesan pertama.
                                </div>
                            ) : (
                                messages.map(
                                    (item, index) => {
                                        const mine =
                                            isMyMessage(item);

                                        return (
                                            <div
                                                key={
                                                    item.id ||
                                                    index
                                                }
                                                className={`message-row ${
                                                    mine
                                                        ? "message-row-me"
                                                        : "message-row-other"
                                                }`}
                                            >
                                                <div
                                                    className={`message ${
                                                        mine
                                                            ? "message-me"
                                                            : "message-other"
                                                    }`}
                                                >
                                                    <span className="message-sender">
                                                        {mine
                                                            ? "You"
                                                            : item
                                                                  .sender
                                                                  ?.name ||
                                                              "Pengguna"}
                                                    </span>

                                                    <p>
                                                        {getMessageText(
                                                            item
                                                        )}
                                                    </p>

                                                    <small>
                                                        {formatTime(
                                                            item.createdAt
                                                        )}
                                                    </small>
                                                </div>
                                            </div>
                                        );
                                    }
                                )
                            )}
                        </div>

                        <form
                            id="messageForm"
                            className="message-form"
                            onSubmit={sendMessage}
                        >
                            <input
                                type="text"
                                id="messageInput"
                                value={message}
                                onChange={(event) =>
                                    setMessage(
                                        event.target.value
                                    )
                                }
                                placeholder="Tulis pesan..."
                                autoComplete="off"
                                disabled={!selectedId}
                            />

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={
                                    !selectedId ||
                                    sending
                                }
                            >
                                {sending
                                    ? "Mengirim..."
                                    : "Kirim"}
                            </button>
                        </form>

                    </section>
                </div>
            </main>
        </>
    );
}

export default Chat;