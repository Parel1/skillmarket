import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ServiceCard from "../components/ServiceCard";
import { apiFetch } from "../services/api";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";

function Home() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadServices() {
            try {
                const result = await apiFetch("/services?limit=3");
                setServices(result.data || []);
            } catch (error) {
                console.error("Gagal mengambil service:", error);
            } finally {
                setLoading(false);
            }
        }

        loadServices();
    }, []);

    return (
        <>
            <Navbar />

            <main>
                <Hero />

                {/* CATEGORY */}
                <section
                    className="section container"
                    id="kategori"
                >
                    <div className="section-head">
                        <div>
                            <span className="section-kicker">
                                Jelajahi
                            </span>

                            <h2>
                                Temukan skill yang kamu butuhkan
                            </h2>
                        </div>

                        <Link
                            className="text-link"
                            to="/jasa"
                        >
                            Lihat semua →
                        </Link>
                    </div>

                    <div className="category-grid">
                        <Link
                            className="category-card"
                            to="/jasa?q=Desain"
                        >
                            <span className="cat-icon">✦</span>
                            <b>Desain</b>
                        </Link>

                        <Link
                            className="category-card"
                            to="/jasa?q=Programming"
                        >
                            <span className="cat-icon">⌘</span>
                            <b>Programming</b>
                        </Link>

                        <Link
                            className="category-card"
                            to="/jasa?q=Video"
                        >
                            <span className="cat-icon">▶</span>
                            <b>Video & Motion</b>
                        </Link>

                        <Link
                            className="category-card"
                            to="/jasa?q=Writing"
                        >
                            <span className="cat-icon">Aa</span>
                            <b>Writing</b>
                        </Link>

                        <Link
                            className="category-card"
                            to="/jasa?q=Marketing"
                        >
                            <span className="cat-icon">↗</span>
                            <b>Marketing</b>
                        </Link>

                        <Link
                            className="category-card"
                            to="/jasa?q=Education"
                        >
                            <span className="cat-icon">◇</span>
                            <b>Education</b>
                        </Link>
                    </div>
                </section>

                {/* FEATURED SERVICES */}
<section className="section featured-section">
    <div className="section-heading">
        <div>
            <span className="section-eyebrow">
                Pilihan untukmu
            </span>

            <h2>
                Jasa yang mungkin kamu suka.
            </h2>
        </div>

        <Link to="/jasa">
            Lihat semua →
        </Link>
    </div>

    {loading ? (
        <div className="service-loading">
            Memuat jasa...
        </div>
    ) : services.length > 0 ? (
        <div className="service-grid">
            {services.map((service) => (
                <Link
                    key={service.id}
                    to={`/detail/${service.id}`}
                    className="service-link"
                >
                    <ServiceCard service={service} />
                </Link>
            ))}
        </div>
    ) : (
        <div className="service-empty">
            Belum ada jasa yang tersedia.
        </div>
    )}
</section>

               {/* CARA KERJA */}
<section
    className="how container"
    id="cara-kerja"
>
    <div className="how-copy">
        <span className="section-kicker">
            Sederhana
        </span>

        <h2>
            Satu tempat untuk skill & peluang.
        </h2>

        <p>
            SkillMarket mempertemukan client dengan
            freelancer mahasiswa tanpa proses ribet.
            Cari, order, kerjakan, selesai.
        </p>

        <Link
            className="btn btn-dark"
            to="/register"
        >
            Mulai Sekarang →
        </Link>
    </div>

    <div className="steps">
        <div className="step">
            <span>01</span>

            <div>
                <b>Cari</b>

                <p>
                    Temukan jasa berdasarkan kebutuhan,
                    kategori, dan budget.
                </p>
            </div>
        </div>

        <div className="step">
            <span>02</span>

            <div>
                <b>Order & Chat</b>

                <p>
                    Diskusikan detail pekerjaan langsung
                    dengan freelancer.
                </p>
            </div>
        </div>

        <div className="step">
            <span>03</span>

            <div>
                <b>Selesai & Review</b>

                <p>
                    Terima hasil pekerjaan dan berikan
                    rating untuk freelancer.
                </p>
            </div>
        </div>
    </div>
</section>

                {/* CTA */}
<section className="cta container">
    <div>
        <span className="section-kicker">
            Punya skill?
        </span>

        <h2>
            Jadikan skill kamu sumber peluang.
        </h2>

        <p>
            Mulai tawarkan jasa dan bangun portfolio
            dari sekarang.
        </p>
    </div>

    <Link
        className="btn btn-primary"
        to="/register"
    >
        Daftar sebagai Freelancer →
    </Link>
</section>
            </main>
        </>
    );
}

export default Home;