import { useEffect, useState } from "react";
import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiFetch } from "../services/api";

function Detail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [ordering, setOrdering] = useState(false);

    useEffect(() => {
        async function loadService() {
            try {
                const result = await apiFetch(
                    `/services/${id}`
                );

                setService(
                    result.data || result
                );
            } catch (err) {
                console.error(
                    "Detail service error:",
                    err
                );

                setError(
                    err.message ||
                    "Gagal mengambil detail jasa."
                );
            } finally {
                setLoading(false);
            }
        }

        loadService();
    }, [id]);

    async function handleOrder() {
        const token =
            localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        setOrdering(true);

        try {
            await apiFetch("/orders", {
                method: "POST",
                body: JSON.stringify({
                    serviceId: service.id,
                }),
            });

            navigate("/pesanan");
        } catch (error) {
            console.error(
                "Gagal membuat order:",
                error
            );

            alert(
                error.message ||
                "Gagal membuat pesanan."
            );
        } finally {
            setOrdering(false);
        }
    }

    async function handleChat() {
        const token =
            localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        const freelancerId =
            service?.freelancer?.id;

        if (!freelancerId) {
            alert(
                "Data freelancer tidak ditemukan."
            );
            return;
        }

        try {
            const data = await apiFetch("/conversations", {
    method: "POST",
    body: JSON.stringify({
        freelancerId: freelancerId
    }),
});

            const conversation =
                data.data ||
                data.conversation ||
                data;

            if (!conversation?.id) {
                throw new Error(
                    "Conversation tidak ditemukan."
                );
            }

            navigate(
                `/chat/${conversation.id}`
            );
        } catch (error) {
            console.error(
                "Gagal membuat conversation:",
                error
            );

            alert(
                error.message ||
                "Gagal membuka chat."
            );
        }
    }

    if (loading) {
        return (
            <>
                <Navbar />

                <main className="container detail-page">
                    <div className="empty">
                        Memuat detail jasa...
                    </div>
                </main>
            </>
        );
    }

    if (error || !service) {
        return (
            <>
                <Navbar />

                <main className="container detail-page">
                    <div className="empty">
                        <h2>
                            Jasa tidak ditemukan
                        </h2>

                        <p>
                            {error ||
                                "Data jasa tidak tersedia."}
                        </p>

                        <Link
                            to="/jasa"
                            className="btn btn-primary"
                        >
                            ← Kembali ke Jasa
                        </Link>
                    </div>
                </main>
            </>
        );
    }

    const rating = Number(
        service.rating || 0
    );

    const price = Number(
        service.price || 0
    );

    const category =
        service.category?.name ||
        "Lainnya";

    const freelancer =
        service.freelancer || {};

    const freelancerName =
        freelancer.name ||
        "Freelancer";

    const initials = freelancerName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <>
            <Navbar />

            <main className="container detail-page">
                <div className="breadcrumb">
                    <Link to="/jasa">
                        Cari Jasa
                    </Link>

                    <span>›</span>

                    <span>
                        {category}
                    </span>

                    <span>›</span>

                    <span>
                        Detail
                    </span>
                </div>

                <div className="detail-grid">
                    <section>
                        <div className="detail-cover cover-purple">
                            <span>
                                {category.toUpperCase()}
                                <br />
                                SKILL MARKET
                            </span>

                            <i>✦</i>
                        </div>

                        <div className="detail-content">
                            <span className="section-kicker">
                                {category.toUpperCase()}
                            </span>

                            <h1>
                                {service.title}
                            </h1>

                            <div className="detail-seller">
                                {freelancer.profileImage ? (
                                    <img
                                        className="avatar avatar-lg"
                                        src={
                                            freelancer.profileImage
                                        }
                                        alt={
                                            freelancerName
                                        }
                                    />
                                ) : (
                                    <span className="avatar avatar-purple avatar-lg">
                                        {initials}
                                    </span>
                                )}

                                <div>
                                    <b>
                                        {freelancerName}
                                    </b>

                                    <p>
                                        Freelancer SkillMarket
                                    </p>

                                    <span className="rating">
                                        ★{" "}
                                        {rating.toFixed(1)}

                                        <small>
                                            {" "}
                                            rating
                                        </small>
                                    </span>
                                </div>
                            </div>

                            <hr />

                            <h2>
                                Tentang jasa ini
                            </h2>

                            <p>
                                {service.description ||
                                    "Belum ada deskripsi jasa."}
                            </p>

                            <div className="feature-list">
                                <span>
                                    ✓ Jasa sesuai kebutuhan
                                </span>

                                <span>
                                    ✓ Komunikasi langsung
                                </span>

                                <span>
                                    ✓ Bisa melakukan revisi
                                </span>

                                <span>
                                    ✓ Pembayaran melalui SkillMarket
                                </span>
                            </div>

                            <h2>
                                Portfolio
                            </h2>

                            <div className="portfolio">
                                <div className="portfolio-item p1">
                                    SKILL
                                </div>

                                <div className="portfolio-item p2">
                                    MARKET
                                </div>

                                <div className="portfolio-item p3">
                                    WORK
                                </div>
                            </div>
                        </div>
                    </section>

                    <aside className="order-box">
                        <div className="order-tabs">
                            <button
                                type="button"
                                className="selected"
                            >
                                Paket Jasa
                            </button>
                        </div>

                        <h3>
                            {service.title}
                        </h3>

                        <p className="muted">
                            Jasa freelance mahasiswa
                            sesuai kebutuhan kamu.
                        </p>

                        <div className="order-price">
                            Rp
                            {price.toLocaleString(
                                "id-ID"
                            )}
                        </div>

                        <div className="order-info">
                            <span>
                                Freelancer
                            </span>

                            <b>
                                {freelancerName}
                            </b>
                        </div>

                        <div className="order-info">
                            <span>
                                Rating
                            </span>

                            <b>
                                ★{" "}
                                {rating.toFixed(1)}
                            </b>
                        </div>

                        <button
                            className="btn btn-primary btn-full"
                            type="button"
                            onClick={
                                handleOrder
                            }
                            disabled={ordering}
                        >
                            {ordering
                                ? "Memproses..."
                                : "Pesan Jasa"}
                        </button>

                        <button
                            className="btn btn-outline btn-full"
                            type="button"
                            onClick={
                                handleChat
                            }
                        >
                            💬 Chat Freelancer
                        </button>

                        <button
                            className="btn btn-ghost btn-full"
                            type="button"
                        >
                            ♡ Tambah ke Favorit
                        </button>

                        <div className="safe-note">
                            <b>
                                ✓ Transaksi aman
                            </b>

                            <p>
                                Komunikasikan kebutuhan
                                kamu dengan freelancer
                                sebelum pekerjaan dimulai.
                            </p>
                        </div>
                    </aside>
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

export default Detail;