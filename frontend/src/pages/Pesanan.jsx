import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiFetch } from "../services/api";

function Pesanan() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const [reviewOrderId, setReviewOrderId] = useState(null);
    const [reviewServiceName, setReviewServiceName] =
        useState("");
    const [selectedRating, setSelectedRating] = useState(0);
    const [reviewComment, setReviewComment] = useState("");
    const [showReview, setShowReview] = useState(false);
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

        try {
            const data = await apiFetch("/orders");

            setOrders(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Gagal mengambil pesanan:", error);
            setMessage(
                error.message ||
                    "Gagal mengambil pesanan."
            );
        } finally {
            setLoading(false);
        }
    }

    function openReviewForm(orderId, serviceName) {
        setReviewOrderId(orderId);
        setReviewServiceName(serviceName || "Jasa");
        setSelectedRating(0);
        setReviewComment("");
        setShowReview(true);
    }

    function closeReviewForm() {
        setShowReview(false);
        setSelectedRating(0);
        setReviewComment("");
    }

    function setRating(rating) {
        setSelectedRating(Number(rating));
    }

    async function submitReview() {
        if (!reviewOrderId) {
            setMessage("Order tidak ditemukan.");
            return;
        }

        if (
            selectedRating < 1 ||
            selectedRating > 5
        ) {
            setMessage(
                "Pilih rating terlebih dahulu."
            );
            return;
        }

        try {
            await apiFetch("/reviews", {
                method: "POST",
                body: JSON.stringify({
                    orderId: reviewOrderId,
                    rating: selectedRating,
                    comment:
                        reviewComment.trim() || null,
                }),
            });

            closeReviewForm();

            setMessage(
                "Review berhasil dikirim!"
            );

            await loadOrders();
        } catch (error) {
            console.error(
                "Submit review error:",
                error
            );

            setMessage(
                error.message ||
                    "Gagal mengirim review."
            );
        }
    }

    function getStatus(status) {
        const statusMap = {
            PENDING: {
                text: "Menunggu",
                className: "status-pending",
            },

            IN_PROGRESS: {
                text: "Sedang dikerjakan",
                className: "status-processing",
            },

            COMPLETED: {
                text: "Selesai",
                className: "status-completed",
            },

            CANCELLED: {
                text: "Dibatalkan",
                className: "status-cancelled",
            },

            pending: {
                text: "Menunggu",
                className: "status-pending",
            },

            processing: {
                text: "Sedang dikerjakan",
                className: "status-processing",
            },

            completed: {
                text: "Selesai",
                className: "status-completed",
            },

            cancelled: {
                text: "Dibatalkan",
                className: "status-cancelled",
            },
        };

        return (
            statusMap[status] ||
            statusMap.PENDING
        );
    }

    function getServiceTitle(order) {
        return (
            order.service?.title ||
            order.serviceTitle ||
            "Jasa tidak tersedia"
        );
    }

    function getFreelancerName(order) {
        return (
            order.freelancer?.name ||
            order.freelancer?.username ||
            "Freelancer"
        );
    }

    function getPrice(order) {
        return Number(
            order.totalPrice ||
                order.price ||
                0
        );
    }

    function formatDate(date) {
        if (!date) return "-";

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) {
            return "-";
        }

        return parsed.toLocaleDateString(
            "id-ID",
            {
                day: "numeric",
                month: "long",
                year: "numeric",
            }
        );
    }

    function hasReview(order) {
        return Boolean(
            order.review ||
                order.Review
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

                    <h1>Pesanan Saya</h1>

                    <p>
                        Pantau status pesanan jasa kamu.
                    </p>
                </div>

                <div className="orders-list">
                    {loading ? (
                        <div className="empty">
                            Memuat pesanan...
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="empty">
                            Belum ada pesanan.
                        </div>
                    ) : (
                        orders.map((order) => {
                            const serviceTitle =
                                getServiceTitle(order);

                            const freelancerName =
                                getFreelancerName(order);

                            const status =
                                getStatus(
                                    order.status
                                );

                            const reviewed =
                                hasReview(order);

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
                                                {
                                                    serviceTitle
                                                }
                                            </h3>

                                            <p>
                                                Freelancer:{" "}
                                                {
                                                    freelancerName
                                                }
                                            </p>

                                            <small>
                                                {formatDate(
                                                    order.createdAt
                                                )}
                                            </small>
                                        </div>

                                        <div className="order-card-side">
                                            <span
                                                className={`status ${status.className}`}
                                            >
                                                {
                                                    status.text
                                                }
                                            </span>

                                            <strong>
                                                Rp
                                                {getPrice(
                                                    order
                                                ).toLocaleString(
                                                    "id-ID"
                                                )}
                                            </strong>

                                            {order.status ===
                                                "COMPLETED" ||
                                            order.status ===
                                                "completed" ? (
                                                reviewed ? (
                                                    <span className="reviewed-badge">
                                                        ★{" "}
                                                        {
                                                            (
                                                                order.review ||
                                                                order.Review
                                                            )
                                                                ?.rating
                                                        }{" "}
                                                        ·
                                                        Sudah
                                                        Direview
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        onClick={() =>
                                                            openReviewForm(
                                                                order.id,
                                                                serviceTitle
                                                            )
                                                        }
                                                    >
                                                        Beri Review
                                                    </button>
                                                )
                                            ) : null}
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}

                    {message && (
                        <p
                            id="profileMessage"
                            className="muted"
                        >
                            {message}
                        </p>
                    )}
                </div>
            </main>

            {showReview && (
                <div
                    id="reviewModal"
                    className="review-modal active"
                >
                    <div className="review-box">
                        <button
                            type="button"
                            className="review-close"
                            onClick={
                                closeReviewForm
                            }
                        >
                            ×
                        </button>

                        <span className="section-kicker">
                            REVIEW
                        </span>

                        <h2>Beri Review</h2>

                        <p className="review-service-name">
                            {reviewServiceName}
                        </p>

                        <div className="rating-input">
                            {[1, 2, 3, 4, 5].map(
                                (rating) => (
                                    <button
                                        key={rating}
                                        type="button"
                                        className={
                                            rating <=
                                            selectedRating
                                                ? "selected"
                                                : ""
                                        }
                                        onClick={() =>
                                            setRating(
                                                rating
                                            )
                                        }
                                    >
                                        ★
                                    </button>
                                )
                            )}
                        </div>

                        <p className="rating-text">
                            {selectedRating === 0
                                ? "Pilih rating"
                                : [
                                      "",
                                      "Sangat buruk",
                                      "Kurang baik",
                                      "Cukup",
                                      "Bagus",
                                      "Sangat bagus",
                                  ][
                                      selectedRating
                                  ]}
                        </p>

                        <textarea
                            value={reviewComment}
                            onChange={(event) =>
                                setReviewComment(
                                    event.target.value
                                )
                            }
                            placeholder="Tulis pengalaman kamu dengan jasa ini..."
                            rows="5"
                        />

                        <button
                            type="button"
                            className="btn btn-primary btn-full"
                            onClick={submitReview}
                        >
                            Kirim Review
                        </button>
                    </div>
                </div>
            )}

            <div id="toast" className="toast"></div>

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

export default Pesanan;