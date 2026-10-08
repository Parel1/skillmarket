import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        setMessage("");
        setLoading(true);

        try {
            const data = await apiFetch("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            console.log("LOGIN RESPONSE:", data);

            localStorage.setItem("token", data.token);

            if (data.user) {
                localStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );
            }

            if (remember) {
                localStorage.setItem(
                    "rememberLogin",
                    "true"
                );
            } else {
                localStorage.removeItem("rememberLogin");
            }

            setMessage("Login berhasil!");

            setTimeout(() => {
                navigate("/");
            }, 500);
        } catch (error) {
            setMessage(
                error.message ||
                    "Tidak dapat terhubung ke server"
            );
        } finally {
            setLoading(false);
        }
    }

    function togglePassword() {
        setShowPassword((current) => !current);
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
                        Selamat datang kembali
                    </span>

                    <h1>Masuk ke akunmu.</h1>

                    <p className="muted">
                        Lanjutkan perjalananmu di
                        SkillMarket.
                    </p>

                    <form
                        id="loginForm"
                        onSubmit={handleSubmit}
                    >
                        <label>
                            Email

                            <input
                                id="email"
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
                            Password

                            <div className="password">
                                <input
                                    id="loginPass"
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
                                    placeholder="••••••••"
                                    required
                                />

                                <button
                                    type="button"
                                    onClick={
                                        togglePassword
                                    }
                                >
                                    {showPassword
                                        ? "Sembunyikan"
                                        : "Lihat"}
                                </button>
                            </div>
                        </label>

                        <div className="form-row">
                            <label className="check">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(event) =>
                                        setRemember(
                                            event.target
                                                .checked
                                        )
                                    }
                                />

                                Ingat saya
                            </label>

                            <a href="#">
                                Lupa password?
                            </a>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading
                                ? "Memproses..."
                                : "Masuk"}
                        </button>

                        <p id="loginMessage">
                            {message}
                        </p>
                    </form>

                    <div className="divider">
                        <span>atau</span>
                    </div>

                    <button
                        className="social-btn"
                        type="button"
                    >
                        Lanjut dengan Google
                    </button>

                    <p className="auth-bottom">
                        Belum punya akun?{" "}
                        <Link to="/register">
                            Daftar sekarang
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}

export default Login;