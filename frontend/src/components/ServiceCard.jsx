import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";

function ServiceCard({ service }) {
    const navigate = useNavigate();

    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);

    const rating = Number(service.rating || 0);
    const price = Number(service.price || 0);
    const freelancerName = service.freelancer?.name || "Freelancer";

    const initials = freelancerName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    useEffect(() => {
        let active = true;

        async function checkFavorite() {
            if (!localStorage.getItem("token")) {
                setIsFavorite(false);
                return;
            }

            try {
                const result = await apiFetch("/favorites");
                const favorites = Array.isArray(result)
                    ? result
                    : result.data || [];

                const exists = favorites.some((item) => {
                    const favoriteService = item.service || item;
                    return Number(favoriteService.id) === Number(service.id);
                });

                if (active) setIsFavorite(exists);
            } catch (error) {
                console.error("Gagal memeriksa favorit:", error);
            }
        }

        checkFavorite();

        return () => {
            active = false;
        };
    }, [service.id]);

    async function toggleFavorite() {
        if (!localStorage.getItem("token")) {
            navigate("/login");
            return;
        }

        if (favoriteLoading) return;

        setFavoriteLoading(true);

        try {
            if (isFavorite) {
                await apiFetch(`/favorites/${service.id}`, {
                    method: "DELETE",
                });
                setIsFavorite(false);
            } else {
                await apiFetch("/favorites", {
                    method: "POST",
                    body: JSON.stringify({
                        serviceId: service.id,
                    }),
                });
                setIsFavorite(true);
            }
        } catch (error) {
            console.error("Gagal memperbarui favorit:", error);
            alert(error.message || "Gagal memperbarui favorit.");
        } finally {
            setFavoriteLoading(false);
        }
    }

    return (
        <article className="service-card">
            <div className="service-cover cover-purple">
                <span>
                    {service.category?.name?.toUpperCase() || "SKILL"}
                    <br />
                    MARKET
                </span>

                <button
                    type="button"
                    onClick={() => {
        console.log("TOMBOL FAVORIT DIKLIK");
        toggleFavorite();}}
                    disabled={favoriteLoading}
                    aria-label={
                        isFavorite
                            ? "Hapus dari favorit"
                            : "Tambahkan ke favorit"
                    }
                    title={
                        isFavorite
                            ? "Hapus dari favorit"
                            : "Tambahkan ke favorit"
                    }
                    style={{
                        position: "absolute",
                        top: "14px",
                        right: "14px",
                        zIndex: 2,
                        border: "none",
                        background: "#fff",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        cursor: favoriteLoading ? "wait" : "pointer",
                        fontSize: "20px",
                        color: isFavorite ? "#e5484d" : "#555",
                        opacity: favoriteLoading ? 0.6 : 1,
                    }}
                >
                    {isFavorite ? "♥" : "♡"}
                </button>

                <i>✦</i>
            </div>

            <div className="service-body">
                <div className="service-cat">
                    {service.category?.name?.toUpperCase() || "UMUM"}
                </div>

                <h3>{service.title}</h3>

                <div className="seller">
                    {service.freelancer?.profileImage ? (
                        <img
                            className="avatar"
                            src={service.freelancer.profileImage}
                            alt={freelancerName}
                        />
                    ) : (
                        <span className="avatar avatar-purple">
                            {initials}
                        </span>
                    )}

                    <span>
                        <b>{freelancerName}</b>
                        <small>★ {rating.toFixed(1)} · 0 order</small>
                    </span>
                </div>

                <div className="service-foot">
                    <span>
                        Mulai dari{" "}
                        <b>Rp{price.toLocaleString("id-ID")}</b>
                    </span>

                    <Link to={`/detail/${service.id}`}>
                        Lihat →
                    </Link>
                </div>
            </div>
        </article>
    );
}

export default ServiceCard;