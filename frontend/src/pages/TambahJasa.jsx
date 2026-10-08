import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiFetch } from "../services/api";

function TambahJasa() {
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [price, setPrice] = useState("");

    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");

        if (!token) {
            navigate("/login");
            return;
        }

        let user = null;

        try {
            user = savedUser
                ? JSON.parse(savedUser)
                : null;
        } catch {
            user = null;
        }

        if (user?.role !== "FREELANCER") {
            navigate("/");
            return;
        }

        loadCategories();
    }, [navigate]);

    async function loadCategories() {
        try {
            const result = await apiFetch("/categories");

            setCategories(
                Array.isArray(result)
                    ? result
                    : result.data || []
            );
        } catch (error) {
            console.error(
                "Gagal mengambil kategori:",
                error
            );

            setMessage(
                error.message ||
                "Gagal mengambil kategori."
            );
        } finally {
            setLoadingCategories(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setMessage("");

        if (!title.trim()) {
            setMessage("Judul jasa wajib diisi.");
            return;
        }

        if (!description.trim()) {
            setMessage("Deskripsi jasa wajib diisi.");
            return;
        }

        if (!categoryId) {
            setMessage("Pilih kategori jasa.");
            return;
        }

        if (!price || Number(price) <= 0) {
            setMessage("Harga harus lebih dari 0.");
            return;
        }

        setLoading(true);

        try {
            await apiFetch("/services", {
                method: "POST",
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    categoryId: Number(categoryId),
                    price: Number(price),
                }),
            });

            navigate("/jasa");
        } catch (error) {
            console.error(
                "Gagal membuat jasa:",
                error
            );

            setMessage(
                error.message ||
                "Gagal menambahkan jasa."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Navbar />

            <main className="container">
                <section className="section">
                    <span className="section-kicker">
                        Freelancer
                    </span>

                    <h1>Tambah Jasa</h1>

                    <p className="muted">
                        Tawarkan skill kamu dan mulai
                        mendapatkan order.
                    </p>

                    <div className="auth-card">
                        <form onSubmit={handleSubmit}>
                            <label>
                                Judul jasa

                                <input
                                    type="text"
                                    value={title}
                                    onChange={(event) =>
                                        setTitle(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Contoh: Desain Logo Profesional"
                                    required
                                />
                            </label>

                            <label>
                                Deskripsi

                                <textarea
                                    value={description}
                                    onChange={(event) =>
                                        setDescription(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Jelaskan jasa yang kamu tawarkan..."
                                    rows="6"
                                    required
                                />
                            </label>

                            <label>
                                Kategori

                                <select
                                    value={categoryId}
                                    onChange={(event) =>
                                        setCategoryId(
                                            event.target.value
                                        )
                                    }
                                    required
                                    disabled={
                                        loadingCategories
                                    }
                                >
                                    <option value="">
                                        {loadingCategories
                                            ? "Memuat kategori..."
                                            : "Pilih kategori"}
                                    </option>

                                    {categories.map(
                                        (category) => (
                                            <option
                                                key={category.id}
                                                value={
                                                    category.id
                                                }
                                            >
                                                {category.name}
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>

                            <label>
                                Harga

                                <input
                                    type="number"
                                    min="1"
                                    value={price}
                                    onChange={(event) =>
                                        setPrice(
                                            event.target.value
                                        )
                                    }
                                    placeholder="100000"
                                    required
                                />
                            </label>

                            {message && (
                                <p className="muted">
                                    {message}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary btn-full"
                                disabled={loading}
                            >
                                {loading
                                    ? "Menambahkan..."
                                    : "Tambah Jasa"}
                            </button>

                            <button
                                type="button"
                                className="btn btn-ghost btn-full"
                                onClick={() =>
                                    navigate("/jasa")
                                }
                            >
                                Batal
                            </button>
                        </form>
                    </div>
                </section>
            </main>
        </>
    );
}

export default TambahJasa;