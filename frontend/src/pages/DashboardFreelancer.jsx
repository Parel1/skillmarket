
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiFetch } from "../services/api";

function DashboardFreelancer() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");

        if (!token) {
            navigate("/login");
            return;
        }

        try {
            const user = JSON.parse(savedUser || "null");

            if (user?.role !== "FREELANCER") {
                navigate("/");
                return;
            }
        } catch {
            navigate("/login");
            return;
        }

        loadOrders();
    }, [navigate]);

    async function loadOrders() {
        setLoading(true);
        setMessage("");

        try {
            const result = await apiFetch("/freelancer/orders");

            const data = Array.isArray(result)
                ? result
                : result.data || [];

            setOrders(data);
        } catch (error) {
            console.error("Dashboard freelancer error:", error);
            setMessage(error.message || "Gagal memuat dashboard.");
        } finally {
            setLoading(false);
        }
    }

    const totalOrders = orders.length;

    const pendingOrders = orders.filter(
        (order) => order.status === "PENDING"
    ).length;

    const activeOrders = orders.filter(
        (order) => order.status === "IN_PROGRESS"
    ).length;

    const completedOrders = orders.filter(
        (order) => order.status === "COMPLETED"
    ).length;

    const completedValue = orders
        .filter((order) => order.status === "COMPLETED")
        .reduce(
            (total, order) => total + Number(order.totalPrice || 0),
            0
        );

    const recentOrders = [...orders]
        .sort(
            (a, b) =>
                new Date(b.createdAt || 0) -
                new Date(a.createdAt || 0)
        )
        .slice(0, 5);

    function formatRupiah(value) {
        return `Rp${Number(value || 0).toLocaleString("id-ID")}`;
    }

    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "-";

        return date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    function getStatus(status) {
        const statuses = {
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
        };

        return statuses[status] || statuses.PENDING;
    }

    return (
        <>
            <Navbar />

            <main className="container freelancer-dashboard">
                <section className="page-head">
                    <span className="section-kicker">
                        Dashboard Freelancer
                    </span>

                    <h1>Kelola pekerjaanmu.</h1>

                    <p>
                        Pantau order dan perkembangan jasamu di SkillMarket.
                    </p>

                    <div className="dashboard-actions">
                        <Link
                            to="/tambah-jasa"
                            className="btn btn-primary"
                        >
                            + Tambah Jasa
                        </Link>

                        <Link
                            to="/freelancer-orders"
                            className="btn btn-outline"
                        >
                            Kelola Order
                        </Link>
                    </div>
                </section>

                {message && (
                    <div className="dashboard-message">
                        {message}
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={loadOrders}
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="empty">Memuat dashboard...</div>
                ) : (
                    <>
                        <section className="dashboard-stats">
                            <article className="dashboard-stat">
                                <span>Total Order</span>
                                <strong>{totalOrders}</strong>
                                <small>Semua order masuk</small>
                            </article>

                            <article className="dashboard-stat">
                                <span>Menunggu</span>
                                <strong>{pendingOrders}</strong>
                                <small>Perlu ditindaklanjuti</small>
                            </article>

                            <article className="dashboard-stat">
                                <span>Sedang Dikerjakan</span>
                                <strong>{activeOrders}</strong>
                                <small>Order yang masih aktif</small>
                            </article>

                            <article className="dashboard-stat">
                                <span>Order Selesai</span>
                                <strong>{completedOrders}</strong>
                                <small>Pekerjaan telah selesai</small>
                            </article>
                        </section>

                        <section className="dashboard-revenue">
                            <div>
                                <span className="section-kicker">
                                    Total Nilai Order Selesai
                                </span>

                                <h2>{formatRupiah(completedValue)}</h2>

                                <p>
                                    Akumulasi nilai order berstatus selesai,
                                    sebelum potongan atau biaya platform.
                                </p>
                            </div>

                            <span className="dashboard-revenue-icon">
                                Rp
                            </span>
                        </section>

                        <section className="dashboard-recent">
                            <div className="dashboard-section-head">
                                <div>
                                    <span className="section-kicker">
                                        Aktivitas
                                    </span>
                                    <h2>Order Terbaru</h2>
                                </div>

                                <Link
                                    to="/freelancer-orders"
                                    className="dashboard-text-link"
                                >
                                    Lihat semua →
                                </Link>
                            </div>

                            {recentOrders.length === 0 ? (
                                <div className="empty dashboard-empty">
                                    <h3>Belum ada order</h3>
                                    <p>
                                        Order dari client akan muncul di sini
                                        setelah jasa kamu dipesan.
                                    </p>
                                    <Link
                                        to="/tambah-jasa"
                                        className="btn btn-primary"
                                    >
                                        Buat Jasa Pertama
                                    </Link>
                                </div>
                            ) : (
                                <div className="orders-list">
                                    {recentOrders.map((order) => {
                                        const status = getStatus(order.status);

                                        return (
                                            <article
                                                className="order-card"
                                                key={order.id}
                                            >
                                                <div className="order-card-main">
                                                    <div>
                                                        <span className="section-kicker">
                                                            ORDER #{order.id}
                                                        </span>

                                                        <h3>
                                                            {order.service?.title ||
                                                                `Jasa #${order.serviceId}`}
                                                        </h3>

                                                        <p>
                                                            Client:{" "}
                                                            {order.client?.name ||
                                                                `#${order.clientId}`}
                                                        </p>

                                                        <p>
                                                            {formatDate(order.createdAt)}
                                                        </p>
                                                    </div>

                                                    <div className="order-card-side">
                                                        <strong>
                                                            {formatRupiah(order.totalPrice)}
                                                        </strong>

                                                        <span
                                                            className={`order-status ${status.className}`}
                                                        >
                                                            {status.text}
                                                        </span>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>

            <footer className="footer">
                <div className="container footer-inner">
                    <span>© 2026 SkillMarket</span>
                    <div>
                        <Link to="/freelancer-orders">Order Masuk</Link>
                        <Link to="/profile">Profil</Link>
                    </div>
                </div>
            </footer>
        </>
    );
}

export default DashboardFreelancer;