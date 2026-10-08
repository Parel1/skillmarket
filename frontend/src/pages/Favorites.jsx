import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiFetch } from "../services/api";

function Favorites() {
    const navigate = useNavigate();

    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        loadFavorites();
    }, [navigate]);

    async function loadFavorites() {
        try {
            const result = await apiFetch("/favorites");

            const data =
                Array.isArray(result)
                    ? result
                    : result.data || [];

            setFavorites(data);
        } catch (error) {
            console.error(
                "Gagal mengambil favorites:",
                error
            );

            setError(
                error.message ||
                    "Gagal mengambil jasa favorit."
            );
        } finally {
            setLoading(false);
        }
    }

    async function removeFavorite(serviceId) {
        try {
            await apiFetch(
                `/favorites/${serviceId}`,
                {
                    method: "DELETE"
                }
            );

            setFavorites((current) =>
                current.filter(
                    (item) => {
                        const service =
                            item.service ||
                            item;

                        return (
                            Number(service.id) !==
                            Number(serviceId)
                        );
                    }
                )
            );
        } catch (error) {
            console.error(
                "Gagal menghapus favorite:",
                error
            );

            alert(
                error.message ||
                    "Gagal menghapus favorit."
            );
        }
    }

    function getService(item) {
        return item.service || item;
    }

    function getInitials(name) {
        if (!name) {
            return "FR";
        }

        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }

    if (loading) {
        return (
            <>
                <Navbar />

                <main className="container">
                    <section className="section">
                        <div className="empty">
                            Memuat jasa favorit...
                        </div>
                    </section>
                </main>
            </>
        );
    }

    return (
        <>
            <Navbar />

            <main className="container">
                <section className="section">
                    <div className="page-head">
                        <span className="section-kicker">
                            Koleksi Kamu
                        </span>

                        <h1>Jasa Favorit</h1>

                        <p>
                            Simpan jasa yang ingin kamu
                            gunakan nanti.
                        </p>
                    </div>

                    {error && (
                        <p className="muted">
                            {error}
                        </p>
                    )}

                    {favorites.length === 0 ? (
                        <div className="empty">
                            <h3>
                                Belum ada jasa favorit
                            </h3>

                            <p>
                                Cari jasa yang menarik
                                lalu simpan ke favorit.
                            </p>

                            <Link
                                to="/jasa"
                                className="btn btn-primary"
                            >
                                Cari Jasa
                            </Link>
                        </div>
                    ) : (
                        <div className="service-grid">
                            {favorites.map((item) => {
                                const service =
                                    getService(item);

                                const freelancer =
                                    service.freelancer;

                                const name =
                                    freelancer?.name ||
                                    "Freelancer";

                                const rating =
                                    Number(
                                        service.rating ||
                                            0
                                    );

                                const price =
                                    Number(
                                        service.price ||
                                            0
                                    );

                                return (
                                    <article
                                        className="service-card"
                                        key={
                                            service.id
                                        }
                                    >
                                        <div className="service-cover cover-purple">
                                            <span>
                                                {service
                                                    .category
                                                    ?.name
                                                    ?.toUpperCase() ||
                                                    "SKILL"}
                                                <br />
                                                MARKET
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeFavorite(
                                                        service.id
                                                    )
                                                }
                                                style={{
                                                    position:
                                                        "absolute",
                                                    top: "14px",
                                                    right: "14px",
                                                    border:
                                                        "none",
                                                    background:
                                                        "#fff",
                                                    width: "34px",
                                                    height:
                                                        "34px",
                                                    borderRadius:
                                                        "50%",
                                                    cursor:
                                                        "pointer",
                                                    fontSize:
                                                        "17px"
                                                }}
                                                title="Hapus dari favorit"
                                            >
                                                ♥
                                            </button>

                                            <i>✦</i>
                                        </div>

                                        <div className="service-body">
                                            <div className="service-cat">
                                                {service
                                                    .category
                                                    ?.name
                                                    ?.toUpperCase() ||
                                                    "UMUM"}
                                            </div>

                                            <h3>
                                                {
                                                    service.title
                                                }
                                            </h3>

                                            <div className="seller">
                                                {freelancer?.profileImage ? (
                                                    <img
                                                        className="avatar"
                                                        src={
                                                            freelancer.profileImage
                                                        }
                                                        alt={
                                                            name
                                                        }
                                                    />
                                                ) : (
                                                    <span className="avatar avatar-purple">
                                                        {getInitials(
                                                            name
                                                        )}
                                                    </span>
                                                )}

                                                <span>
                                                    <b>
                                                        {
                                                            name
                                                        }
                                                    </b>

                                                    <small>
                                                        ★{" "}
                                                        {rating.toFixed(
                                                            1
                                                        )}{" "}
                                                        · 0
                                                        order
                                                    </small>
                                                </span>
                                            </div>

                                            <div className="service-foot">
                                                <span>
                                                    Mulai dari{" "}
                                                    <b>
                                                        Rp
                                                        {price.toLocaleString(
                                                            "id-ID"
                                                        )}
                                                    </b>
                                                </span>

                                                <Link
                                                    to={`/detail/${service.id}`}
                                                >
                                                    Lihat →
                                                </Link>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
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

export default Favorites;