import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiFetch } from "../services/api";

function FreelancerOrders() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        loadOrders();
    }, [navigate]);

    async function loadOrders() {
        setLoading(true);
        setMessage("");

        try {
            const data = await apiFetch(
                "/freelancer/orders"
            );

            setOrders(
                Array.isArray(data)
                    ? data
                    : data.data || []
            );
        } catch (error) {
            console.error(
                "Freelancer orders error:",
                error
            );

            setMessage(
                error.message ||
                    "Tidak dapat mengambil order."
            );
        } finally {
            setLoading(false);
        }
    }

    async function updateOrderStatus(
        orderId,
        status
    ) {
        try {
            await apiFetch(
                `/freelancer/orders/${orderId}/status`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        status
                    })
                }
            );

            setMessage(
                "Status order berhasil diubah."
            );

            await loadOrders();
        } catch (error) {
            console.error(
                "Update order error:",
                error
            );

            setMessage(
                error.message ||
                    "Gagal mengubah status."
            );
        }
    }

    function getStatus(status) {
        const statusMap = {
            PENDING: {
                text: "Menunggu",
                className: "status-pending"
            },

            IN_PROGRESS: {
                text: "Sedang dikerjakan",
                className: "status-processing"
            },

            COMPLETED: {
                text: "Selesai",
                className: "status-completed"
            },

            CANCELLED: {
                text: "Dibatalkan",
                className: "status-cancelled"
            }
        };

        return (
            statusMap[status] ||
            statusMap.PENDING
        );
    }

    function formatDate(date) {
        if (!date) {
            return "-";
        }

        const parsedDate = new Date(date);

        if (
            Number.isNaN(
                parsedDate.getTime()
            )
        ) {
            return "-";
        }

        return parsedDate.toLocaleDateString(
            "id-ID",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
    }

    return (
        <>
            <Navbar />

            <main className="container orders-page">
                <div className="page-head">
                    <span className="section-kicker">
                        Dashboard
                    </span>

                    <h1>Order Masuk</h1>

                    <p>
                        Kelola order dari client yang
                        menggunakan jasa kamu.
                    </p>
                </div>

                <div className="orders-list">
                    {loading ? (
                        <div className="empty">
                            Memuat order...
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="empty">
                            Belum ada order masuk.
                        </div>
                    ) : (
                        orders.map((order) => {
                            const status =
                                getStatus(
                                    order.status
                                );

                            return (
                                <article
                                    className="order-card"
                                    key={order.id}
                                >
                                    <div className="order-card-main">
                                        <div>
                                            <span className="section-kicker">
                                                ORDER #
                                                {order.id}
                                            </span>

                                            <h3>
                                                Jasa #
                                                {
                                                    order.serviceId
                                                }
                                            </h3>

                                            <p>
                                                Client ID:{" "}
                                                {
                                                    order.clientId
                                                }
                                            </p>

                                            <p>
                                                Dibuat:{" "}
                                                {formatDate(
                                                    order.createdAt
                                                )}
                                            </p>
                                        </div>

                                        <div className="order-card-side">
                                            <strong>
                                                Rp
                                                {Number(
                                                    order.totalPrice ||
                                                        0
                                                ).toLocaleString(
                                                    "id-ID"
                                                )}
                                            </strong>

                                            <span
                                                className={`order-status ${status.className}`}
                                            >
                                                {
                                                    status.text
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    <div className="order-card-footer">
                                        <span>
                                            Status:{" "}
                                            <b>
                                                {
                                                    status.text
                                                }
                                            </b>
                                        </span>

                                        <div className="order-actions">

                                            {/* PENDING */}
                                            {order.status ===
                                                "PENDING" && (
                                                <>
                                                    <button
                                                        className="btn btn-primary"
                                                        type="button"
                                                        onClick={() =>
                                                            updateOrderStatus(
                                                                order.id,
                                                                "IN_PROGRESS"
                                                            )
                                                        }
                                                    >
                                                        Mulai Kerjakan
                                                    </button>

                                                    <button
                                                        className="btn btn-outline"
                                                        type="button"
                                                        onClick={() =>
                                                            updateOrderStatus(
                                                                order.id,
                                                                "CANCELLED"
                                                            )
                                                        }
                                                    >
                                                        Batalkan
                                                    </button>
                                                </>
                                            )}

                                            {/* IN PROGRESS */}
                                            {order.status ===
                                                "IN_PROGRESS" && (
                                                <button
                                                    className="btn btn-primary"
                                                    type="button"
                                                    onClick={() =>
                                                        updateOrderStatus(
                                                            order.id,
                                                            "COMPLETED"
                                                        )
                                                    }
                                                >
                                                    Tandai Selesai
                                                </button>
                                            )}

                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}

                    {message && (
                        <p className="muted">
                            {message}
                        </p>
                    )}
                </div>
            </main>

            <footer className="footer">
                <div className="container footer-inner">
                    <span>
                        © 2026 SkillMarket
                    </span>

                    <div>
                        <a href="#">
                            Bantuan
                        </a>

                        <a href="#">
                            Ketentuan
                        </a>
                    </div>
                </div>
            </footer>
        </>
    );
}

export default FreelancerOrders;