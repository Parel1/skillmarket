import { Link, useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell";

function Navbar() {
    const navigate = useNavigate();

    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    let user = null;

    try {
        user = savedUser ? JSON.parse(savedUser) : null;
    } catch {
        user = null;
    }

    const role = user?.role?.toUpperCase();
    const isFreelancer = role === "FREELANCER";
    const isAdmin = role === "ADMIN";

    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("rememberLogin");

        navigate("/login");
    }

    return (
        <header className="navbar">
            <Link className="brand" to="/">
                <span className="brand-mark">S</span>
                <span>
                    Skill<span>Market</span>
                </span>
            </Link>

            <nav className="nav-links">
                <Link className="active" to="/">
                    Beranda
                </Link>

                <Link to="/jasa">
                    Cari Jasa
                </Link>

                <a href="/#kategori">Kategori</a>
                <a href="/#cara-kerja">Cara Kerja</a>
            </nav>

            <div className="nav-actions">
                {token && user ? (
                    <>
                        {isAdmin && (
                            <Link className="btn btn-ghost" to="/admin">
                                Dashboard Admin
                            </Link>
                        )}

                        {isFreelancer && (
                            <>
                                <Link className="btn btn-ghost" to="/tambah-jasa">
                                    + Tambah Jasa
                                </Link>

                                <Link className="btn btn-ghost" to="/dashboard-freelancer">
                                    Dashboard
                                </Link>

                                <Link className="btn btn-ghost" to="/freelancer-orders">
                                    Order Masuk
                                </Link>
                            </>
                        )}

                        <Link className="btn btn-ghost" to="/pesanan">
                            Pesanan
                        </Link>

                        <Link className="btn btn-ghost" to="/favorit">
                            Favorit
                        </Link>

                        <Link className="btn btn-ghost" to="/chat">
                            Chat
                        </Link>

                        <Link className="btn btn-ghost" to="/profile">
                            {user.name || "Profil"}
                        </Link>

                        <button
                            className="btn btn-primary"
                            type="button"
                            onClick={handleLogout}
                        >
                            Keluar
                        </button>
                    </>
                ) : (
                    <>
                        <Link className="btn btn-ghost" to="/login">
                            Masuk
                        </Link>

                        <Link className="btn btn-primary" to="/register">
                            Daftar
                        </Link>
                    </>
                )}
                <NotificationBell />
            </div>
        </header>
    );
}

export default Navbar;