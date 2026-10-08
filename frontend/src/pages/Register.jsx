import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";

function Register() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("CLIENT");
    const [password, setPassword] = useState("");
    const [agree, setAgree] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        if (!agree) {
            setMessage(
                "Kamu harus menyetujui syarat dan ketentuan."
            );
            return;
        }

        setMessage("");
        setLoading(true);

        try {
            const data = await apiFetch("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    role,
                }),
            });

            if (data.token) {
                localStorage.setItem(
                    "token",
                    data.token
                );
            }

            if (data.user) {
                localStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );
            }

            setMessage(
                "Akun berhasil dibuat. Mengalihkan..."
            );

            setTimeout(() => {
                navigate(
                    data.token ? "/" : "/login"
                );
            }, 700);
        } catch (error) {
            setMessage(
                error.message ||
                    "Pendaftaran gagal."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <Link
                className="brand auth-brand"
                to="/"
            >
                <span className="brand-mark">S</span>

                <span>
                    Skill<span>Market</span>
                </span>
            </Link>

            <main className="auth-wrap">
                <div className="auth-card">
                    <span className="section-kicker">
                        Bergabung dengan SkillMarket
                    </span>

                    <h1>Buat akun baru.</h1>

                    <p className="muted">
                        Mulai cari jasa atau tawarkan
                        skill kamu.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <label>
                            Nama lengkap

                            <input
                                type="text"
                                value={name}
                                onChange={(event) =>
                                    setName(
                                        event.target.value
                                    )
                                }
                                placeholder="Nama kamu"
                                required
                            />
                        </label>

                        <label>
                            Email

                            <input
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(
                                        event.target.value
                                    )
                                }
                                placeholder="nama@email.com"
                                required
                            />
                        </label>

                        <label>
                            Saya ingin menjadi

                            <select
                                value={role}
                                onChange={(event) =>
                                    setRole(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="CLIENT">
                                    Client
                                </option>

                                <option value="FREELANCER">
                                    Freelancer
                                </option>
                            </select>
                        </label>

                        <label>
                            Password

                            <div className="password">
                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Minimal 6 karakter"
                                    minLength={6}
                                    required
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(
                                            (current) =>
                                                !current
                                        )
                                    }
                                >
                                    {showPassword
                                        ? "Sembunyikan"
                                        : "Lihat"}
                                </button>
                            </div>
                        </label>

                        <label className="check">
                            <input
                                type="checkbox"
                                checked={agree}
                                onChange={(event) =>
                                    setAgree(
                                        event.target
                                            .checked
                                    )
                                }
                            />

                            <span>
                                Saya menyetujui syarat dan
                                ketentuan SkillMarket.
                            </span>
                        </label>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading
                                ? "Membuat akun..."
                                : "Buat Akun"}
                        </button>

                        {message && (
                            <p id="registerMessage">
                                {message}
                            </p>
                        )}
                    </form>

                    <p className="auth-bottom">
                        Sudah punya akun?{" "}
                        <Link to="/login">
                            Masuk sekarang
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}

export default Register;