
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiFetch } from "../services/api";

const tabs = [
    { id: "overview", label: "Ringkasan" },
    { id: "users", label: "Pengguna" },
    { id: "services", label: "Jasa" },
    { id: "categories", label: "Kategori" },
    { id: "reviews", label: "Ulasan" },
];

function getList(result, key) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.[key])) return result[key];
    if (Array.isArray(result?.data?.[key])) return result.data[key];
    return [];
}

function DashboardAdmin() {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("overview");
    const [users, setUsers] = useState([]);
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [dashboard, setDashboard] = useState({});
    const [categoryName, setCategoryName] = useState("");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        let user = null;

        try {
            user = JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            user = null;
        }

        if (!token) {
            navigate("/login");
            return;
        }

        if (user?.role?.toUpperCase() !== "ADMIN") {
            navigate("/");
            return;
        }

        loadAll();
    }, [navigate]);

    async function loadAll() {
        setLoading(true);
        setMessage("");

        const endpoints = [
            ["/admin/dashboard", setDashboard, null],
            ["/admin/users", setUsers, "users"],
            ["/admin/services", setServices, "services"],
            ["/admin/categories", setCategories, "categories"],
            ["/admin/reviews", setReviews, "reviews"],
        ];

        const results = await Promise.allSettled(
            endpoints.map(([endpoint]) => apiFetch(endpoint))
        );

        let failures = 0;

        results.forEach((result, index) => {
            const [, setter, key] = endpoints[index];

            if (result.status === "fulfilled") {
                const value = result.value;

                if (key) {
                    setter(getList(value, key));
                } else {
                    setter(value?.data ?? value ?? {});
                }
            } else {
                failures += 1;
                console.error(
                    `Gagal memuat ${endpoints[index][0]}:`,
                    result.reason
                );
            }
        });

        if (failures > 0) {
            setMessage(
                `${failures} bagian gagal dimuat. Periksa akses admin dan endpoint backend.`
            );
        }

        setLoading(false);
    }

    async function runAction(action, successMessage) {
        if (busy) return;

        setBusy(true);
        setMessage("");

        try {
            await action();
            setMessage(successMessage);
            await loadAll();
        } catch (error) {
            console.error("Admin action error:", error);
            setMessage(error.message || "Aksi gagal dilakukan.");
        } finally {
            setBusy(false);
        }
    }

    async function deleteUser(user) {
        if (!window.confirm(
            `Hapus akun ${user.name || user.email || user.id}? Tindakan ini tidak bisa dibatalkan.`
        )) return;

        await runAction(
            () => apiFetch(`/admin/users/${user.id}`, { method: "DELETE" }),
            "Pengguna berhasil dihapus."
        );
    }

    async function updateUserRole(user) {
        const currentRole = String(user.role || "CLIENT").toUpperCase();
        const role = window.prompt(
            "Masukkan role: CLIENT, FREELANCER, atau ADMIN",
            currentRole
        );

        if (!role) return;

        const normalizedRole = role.trim().toUpperCase();

        if (!["CLIENT", "FREELANCER", "ADMIN"].includes(normalizedRole)) {
            setMessage("Role tidak valid.");
            return;
        }

        if (!window.confirm(
            `Ubah role ${user.name || user.email} menjadi ${normalizedRole}?`
        )) return;

        await runAction(
            () => apiFetch(`/admin/users/${user.id}`, {
                method: "PUT",
                body: JSON.stringify({ role: normalizedRole }),
            }),
            "Role pengguna berhasil diperbarui."
        );
    }

    async function deleteService(service) {
        if (!window.confirm(
            `Hapus jasa "${service.title || `#${service.id}`}"?`
        )) return;

        await runAction(
            () => apiFetch(`/admin/services/${service.id}`, {
                method: "DELETE",
            }),
            "Jasa berhasil dihapus."
        );
    }

    async function createCategory(event) {
        event.preventDefault();

        const name = categoryName.trim();
        if (!name) return;

        await runAction(
            () => apiFetch("/admin/categories", {
                method: "POST",
                body: JSON.stringify({ name }),
            }),
            "Kategori berhasil ditambahkan."
        );

        setCategoryName("");
    }

    async function editCategory(category) {
        const name = window.prompt(
            "Nama kategori baru:",
            category.name || ""
        );

        if (!name?.trim()) return;

        await runAction(
            () => apiFetch(`/admin/categories/${category.id}`, {
                method: "PUT",
                body: JSON.stringify({ name: name.trim() }),
            }),
            "Kategori berhasil diperbarui."
        );
    }

    async function deleteCategory(category) {
        if (!window.confirm(
            `Hapus kategori "${category.name}"? Jika masih digunakan jasa, backend mungkin menolak penghapusan.`
        )) return;

        await runAction(
            () => apiFetch(`/admin/categories/${category.id}`, {
                method: "DELETE",
            }),
            "Kategori berhasil dihapus."
        );
    }

    async function deleteReview(review) {
        if (!window.confirm(
            `Hapus ulasan #${review.id}?`
        )) return;

        await runAction(
            () => apiFetch(`/admin/reviews/${review.id}`, {
                method: "DELETE",
            }),
            "Ulasan berhasil dihapus."
        );
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

    function money(value) {
        return `Rp${Number(value || 0).toLocaleString("id-ID")}`;
    }

    const stats = [
        {
            label: "Total Pengguna",
            value: dashboard.totalUsers ?? dashboard.usersCount ?? users.length,
        },
        {
            label: "Total Freelancer",
            value: dashboard.totalFreelancers ?? dashboard.freelancersCount
                ?? users.filter((u) => String(u.role).toUpperCase() === "FREELANCER").length,
        },
        {
            label: "Total Jasa",
            value: dashboard.totalServices ?? dashboard.servicesCount ?? services.length,
        },
        {
            label: "Total Order",
            value: dashboard.totalOrders ?? dashboard.ordersCount ?? "—",
        },
    ];

    return (
        <>
            <Navbar />

            <main className="container admin-dashboard">
                <header className="admin-heading">
                    <div>
                        <span className="section-kicker">PANEL ADMIN</span>
                        <h1>Kelola SkillMarket.</h1>
                        <p>Pantau platform dan kelola konten marketplace.</p>
                    </div>

                    <button
                        className="btn btn-outline"
                        type="button"
                        onClick={loadAll}
                        disabled={loading || busy}
                    >
                        {loading ? "Memuat..." : "↻ Muat Ulang"}
                    </button>
                </header>

                <nav className="admin-tabs" aria-label="Menu admin">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            className={`admin-tab ${activeTab === tab.id ? "active" : ""}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {message && (
                    <div className="admin-message" role="status">
                        {message}
                    </div>
                )}

                {loading ? (
                    <div className="empty">Memuat data admin...</div>
                ) : (
                    <>
                        {activeTab === "overview" && (
                            <>
                                <section className="admin-stats">
                                    {stats.map((stat) => (
                                        <article className="admin-stat" key={stat.label}>
                                            <span>{stat.label}</span>
                                            <strong>{stat.value}</strong>
                                        </article>
                                    ))}
                                </section>

                                <section className="admin-overview-grid">
                                    <article className="admin-panel">
                                        <span className="section-kicker">MODERASI</span>
                                        <h2>Perlu diperiksa</h2>
                                        <p>{reviews.length} ulasan tercatat.</p>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => setActiveTab("reviews")}
                                            type="button"
                                        >
                                            Kelola Ulasan
                                        </button>
                                    </article>

                                    <article className="admin-panel">
                                        <span className="section-kicker">KATEGORI</span>
                                        <h2>{categories.length} kategori</h2>
                                        <p>Kelola pengelompokan jasa marketplace.</p>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => setActiveTab("categories")}
                                            type="button"
                                        >
                                            Kelola Kategori
                                        </button>
                                    </article>
                                </section>
                            </>
                        )}

                        {activeTab === "users" && (
                            <section className="admin-panel">
                                <div className="admin-panel-heading">
                                    <div>
                                        <span className="section-kicker">AKUN</span>
                                        <h2>Manajemen Pengguna</h2>
                                    </div>
                                    <span>{users.length} pengguna</span>
                                </div>

                                <div className="admin-table-wrap">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Pengguna</th>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user.id}>
                                                    <td>
                                                        <strong>{user.name || "-"}</strong>
                                                        <small>#{user.id}</small>
                                                    </td>
                                                    <td>{user.email || "-"}</td>
                                                    <td>{user.role || "-"}</td>
                                                    <td>
                                                        <div className="admin-row-actions">
                                                            <button
                                                                className="btn btn-outline"
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => updateUserRole(user)}
                                                            >
                                                                Ubah Role
                                                            </button>
                                                            <button
                                                                className="btn btn-danger"
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => deleteUser(user)}
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {users.length === 0 && <p className="admin-empty">Belum ada data pengguna.</p>}
                                </div>
                            </section>
                        )}

                        {activeTab === "services" && (
                            <section className="admin-panel">
                                <div className="admin-panel-heading">
                                    <div>
                                        <span className="section-kicker">MARKETPLACE</span>
                                        <h2>Manajemen Jasa</h2>
                                    </div>
                                    <span>{services.length} jasa</span>
                                </div>

                                <div className="admin-table-wrap">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Nama Jasa</th>
                                                <th>Freelancer</th>
                                                <th>Kategori</th>
                                                <th>Harga</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {services.map((service) => (
                                                <tr key={service.id}>
                                                    <td>
                                                        <strong>{service.title || `Jasa #${service.id}`}</strong>
                                                        <small>#{service.id}</small>
                                                    </td>
                                                    <td>{service.freelancer?.name || service.freelancer?.email || service.freelancerId || "-"}</td>
                                                    <td>{service.category?.name || "-"}</td>
                                                    <td>{money(service.price)}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-danger"
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => deleteService(service)}
                                                        >
                                                            Hapus
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {services.length === 0 && <p className="admin-empty">Belum ada jasa.</p>}
                                </div>
                            </section>
                        )}

                        {activeTab === "categories" && (
                            <section className="admin-panel">
                                <div className="admin-panel-heading">
                                    <div>
                                        <span className="section-kicker">KATEGORI JASA</span>
                                        <h2>Manajemen Kategori</h2>
                                    </div>
                                    <span>{categories.length} kategori</span>
                                </div>

                                <form className="admin-category-form" onSubmit={createCategory}>
                                    <input
                                        value={categoryName}
                                        onChange={(event) => setCategoryName(event.target.value)}
                                        placeholder="Nama kategori baru"
                                        aria-label="Nama kategori baru"
                                        required
                                    />
                                    <button className="btn btn-primary" type="submit" disabled={busy}>
                                        Tambah Kategori
                                    </button>
                                </form>

                                <div className="admin-category-list">
                                    {categories.map((category) => (
                                        <article className="admin-category-item" key={category.id}>
                                            <div>
                                                <strong>{category.name}</strong>
                                                <small>ID: {category.id}</small>
                                            </div>
                                            <div className="admin-row-actions">
                                                <button
                                                    className="btn btn-outline"
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => editCategory(category)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="btn btn-danger"
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => deleteCategory(category)}
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                    {categories.length === 0 && (
                                        <p className="admin-empty">Belum ada kategori.</p>
                                    )}
                                </div>
                            </section>
                        )}

                        {activeTab === "reviews" && (
                            <section className="admin-panel">
                                <div className="admin-panel-heading">
                                    <div>
                                        <span className="section-kicker">MODERASI</span>
                                        <h2>Manajemen Ulasan</h2>
                                    </div>
                                    <span>{reviews.length} ulasan</span>
                                </div>

                                <div className="admin-review-list">
                                    {reviews.map((review) => (
                                        <article className="admin-review-item" key={review.id}>
                                            <div className="admin-review-content">
                                                <strong>
                                                    {review.user?.name ||
                                                        review.client?.name ||
                                                        `Pengguna #${review.userId || review.clientId || "-"}`}
                                                </strong>
                                                <span className="admin-review-rating">
                                                    ★ {review.rating ?? "-"} / 5
                                                </span>
                                                <p>{review.comment || review.content || "Tidak ada komentar."}</p>
                                                <small>
                                                    {review.service?.title || `Jasa #${review.serviceId || "-"}`}
                                                    {" · "}
                                                    {formatDate(review.createdAt)}
                                                </small>
                                            </div>
                                            <button
                                                className="btn btn-danger"
                                                type="button"
                                                disabled={busy}
                                                onClick={() => deleteReview(review)}
                                            >
                                                Hapus Ulasan
                                            </button>
                                        </article>
                                    ))}
                                    {reviews.length === 0 && (
                                        <p className="admin-empty">Belum ada ulasan.</p>
                                    )}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>

            <footer className="footer">
                <div className="container footer-inner">
                    <span>© 2026 SkillMarket · Admin</span>
                    <Link to="/">Kembali ke Marketplace</Link>
                </div>
            </footer>
        </>
    );
}

export default DashboardAdmin;