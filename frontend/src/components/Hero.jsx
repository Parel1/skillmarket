import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Hero() {
    const [search, setSearch] = useState("");
    const navigate = useNavigate();

    function handleSearch(event) {
        event.preventDefault();

        const q = search.trim();

        navigate(
            q
                ? `/jasa?q=${encodeURIComponent(q)}`
                : "/jasa"
        );
    }

    return (
        <section className="hero container">
            <div className="hero-copy">
                <div className="eyebrow">
                    <span className="dot"></span>
                    Marketplace jasa freelance mahasiswa
                </div>

                <h1>
                    Skill kamu punya nilai.
                    <br />
                    <em>Mulai dari sini.</em>
                </h1>

                <p>
                    Temukan mahasiswa berbakat untuk membantu
                    pekerjaanmu, atau ubah keahlianmu menjadi
                    peluang penghasilan.
                </p>

                <form
                    className="hero-search"
                    onSubmit={handleSearch}
                >
                    <span>⌕</span>

                    <input
                        id="heroSearch"
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Cari jasa, misalnya desain logo..."
                    />

                    <button type="submit">
                        Cari Jasa
                    </button>
                </form>

                <div className="popular">
                    <span>Populer:</span>

                    <Link to="/jasa?q=Desain">
                        Desain
                    </Link>

                    <Link to="/jasa?q=Video">
                        Video Editing
                    </Link>

                    <Link to="/jasa?q=Website">
                        Website
                    </Link>

                    <Link to="/jasa?q=Penulisan">
                        Penulisan
                    </Link>
                </div>
            </div>

            <div className="hero-art">
                <div className="floating-card fc-top">
                    <span className="avatar avatar-blue">
                        FA
                    </span>

                    <div>
                        <b>Logo Design</b>

                        <small>
                            oleh Farrel · ★ 4.9
                        </small>
                    </div>

                    <strong>
                        Rp75k
                    </strong>
                </div>

                <div className="hero-orb">
                    <span className="orb-letter">
                        S
                    </span>

                    <span className="orb-label">
                        SKILL
                        <br />
                        MARKET
                    </span>
                </div>

                <div className="floating-card fc-bottom">
                    <span className="mini-check">
                        ✓
                    </span>

                    <div>
                        <b>Order selesai!</b>

                        <small>
                            Website landing page
                        </small>
                    </div>

                    <span className="status">
                        Selesai
                    </span>
                </div>
            </div>
        </section>
    );
}

export default Hero;