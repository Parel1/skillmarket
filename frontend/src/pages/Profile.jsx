import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiFetch } from "../services/api";

function Profile() {
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        loadProfile();
    }, [navigate]);

    async function loadProfile() {
        try {
            const data = await apiFetch("/profile");

            const user = data.user || data.data || data;

            setProfile(user);
            setName(user.name || "");
            setBio(user.bio || "");
        } catch (error) {
            console.error(
                "Gagal mengambil profile:",
                error
            );

            setError(
                error.message ||
                    "Gagal mengambil data profile."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!name.trim()) {
            setError("Nama tidak boleh kosong.");
            return;
        }

        setSaving(true);
        setMessage("");
        setError("");

        try {
            const data = await apiFetch("/profile", {
                method: "PUT",
                body: JSON.stringify({
                    name: name.trim(),
                    bio: bio.trim()
                })
            });

            const updatedUser =
                data.user ||
                data.data ||
                data;

            setProfile(updatedUser);

            setName(updatedUser.name || "");
            setBio(updatedUser.bio || "");

            // Update data user di localStorage
            const savedUser =
                localStorage.getItem("user");

            let localUser = {};

            try {
                localUser = savedUser
                    ? JSON.parse(savedUser)
                    : {};
            } catch {
                localUser = {};
            }

            localStorage.setItem(
                "user",
                JSON.stringify({
                    ...localUser,
                    ...updatedUser
                })
            );

            setMessage(
                "Profile berhasil diperbarui."
            );
        } catch (error) {
            console.error(
                "Gagal update profile:",
                error
            );

            setError(
                error.message ||
                    "Gagal memperbarui profile."
            );
        } finally {
            setSaving(false);
        }
    }

    function getInitials() {
        if (!name.trim()) {
            return "U";
        }

        return name
            .trim()
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
                            Memuat profile...
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
                            Akun
                        </span>

                        <h1>Profile</h1>

                        <p>
                            Kelola informasi akun
                            SkillMarket kamu.
                        </p>
                    </div>

                    <div className="auth-card">

                        {/* PROFILE HEADER */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                                marginBottom: "28px"
                            }}
                        >
                            {profile?.profileImage ? (
                                <img
                                    src={
                                        profile.profileImage
                                    }
                                    alt={name}
                                    className="avatar avatar-lg"
                                />
                            ) : (
                                <span className="avatar avatar-purple avatar-lg">
                                    {getInitials()}
                                </span>
                            )}

                            <div>
                                <h2
                                    style={{
                                        margin: 0
                                    }}
                                >
                                    {name ||
                                        "Pengguna"}
                                </h2>

                                <p
                                    className="muted"
                                    style={{
                                        margin: "4px 0 0"
                                    }}
                                >
                                    {profile?.role ===
                                    "FREELANCER"
                                        ? "Freelancer"
                                        : profile?.role ===
                                            "ADMIN"
                                          ? "Admin"
                                          : "Client"}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>

                            {/* EMAIL */}
                            <label>
                                Email

                                <input
                                    type="email"
                                    value={
                                        profile?.email ||
                                        ""
                                    }
                                    disabled
                                />
                            </label>

                            {/* ROLE */}
                            <label>
                                Role

                                <input
                                    type="text"
                                    value={
                                        profile?.role ===
                                        "FREELANCER"
                                            ? "Freelancer"
                                            : profile?.role ===
                                                "ADMIN"
                                              ? "Admin"
                                              : "Client"
                                    }
                                    disabled
                                />
                            </label>

                            {/* NAME */}
                            <label>
                                Nama

                                <input
                                    type="text"
                                    value={name}
                                    onChange={(event) =>
                                        setName(
                                            event.target
                                                .value
                                        )
                                    }
                                    placeholder="Nama kamu"
                                    required
                                />
                            </label>

                            {/* BIO */}
                            <label>
                                Bio

                                <textarea
                                    value={bio}
                                    onChange={(event) =>
                                        setBio(
                                            event.target
                                                .value
                                        )
                                    }
                                    placeholder="Ceritakan sedikit tentang kamu..."
                                    rows="5"
                                />
                            </label>

                            {error && (
                                <p
                                    style={{
                                        color: "#b42318"
                                    }}
                                >
                                    {error}
                                </p>
                            )}

                            {message && (
                                <p className="muted">
                                    {message}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary btn-full"
                                disabled={saving}
                            >
                                {saving
                                    ? "Menyimpan..."
                                    : "Simpan Perubahan"}
                            </button>
                        </form>
                    </div>
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

export default Profile;