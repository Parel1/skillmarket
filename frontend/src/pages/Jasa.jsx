import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ServiceCard from "../components/ServiceCard";
import { apiFetch } from "../services/api";

function Jasa() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState(
        searchParams.get("q") || ""
    );

    const [category, setCategory] = useState(
        searchParams.get("category") || ""
    );

    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [rating, setRating] = useState("0");
    const [sort, setSort] = useState("relevant");

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });

    async function loadServices(page = 1) {
        setLoading(true);

        try {
            const params = new URLSearchParams();

            if (search.trim()) {
                params.set("search", search.trim());
            }

            if (category) {
                params.set("category", category);
            }

            if (minPrice) {
                params.set("minPrice", minPrice);
            }

            if (maxPrice) {
                params.set("maxPrice", maxPrice);
            }

            if (rating && rating !== "0") {
                params.set("rating", rating);
            }

            if (sort !== "relevant") {
                params.set("sort", sort);
            }

            params.set("page", page);
            params.set("limit", 10);

            const result = await apiFetch(
                `/services?${params.toString()}`
            );

            setServices(result.data || []);

            setPagination(
                result.pagination || {
                    page,
                    limit: 10,
                    total: 0,
                    totalPages: 0,
                }
            );
        } catch (error) {
            console.error(
                "Gagal mengambil jasa:",
                error
            );

            setServices([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadServices(1);
    }, [category, sort]);

    function handleSearch(event) {
        event.preventDefault();

        const params = new URLSearchParams();

        if (search.trim()) {
            params.set("q", search.trim());
        }

        if (category) {
            params.set("category", category);
        }

        setSearchParams(params);

        loadServices(1);
    }

    function handleFilter() {
        loadServices(1);
    }

    function resetFilters() {
        setSearch("");
        setCategory("");
        setMinPrice("");
        setMaxPrice("");
        setRating("0");
        setSort("relevant");

        setSearchParams({});

        loadServices(1);
    }

    return (
        <>
            <Navbar />

            <main>
                {/* BROWSE HEADER */}
                <section className="browse-head">
                    <div className="container">
                        <span className="section-kicker">
                            Marketplace
                        </span>

                        <h1>
                            Cari jasa yang kamu butuhkan.
                        </h1>

                        <p>
                            Berbagai skill mahasiswa, satu tempat.
                        </p>

                        <form
                            className="browse-search"
                            onSubmit={handleSearch}
                        >
                            <span>⌕</span>

                            <input
                                id="searchInput"
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                                placeholder="Cari jasa..."
                            />
                        </form>
                    </div>
                </section>

                {/* BROWSE CONTENT */}
                <section className="container browse-layout">
                    {/* FILTER */}
                    <aside className="filters">
                        <div className="filter-title">
                            <b>Filter</b>

                            <button
                                type="button"
                                onClick={resetFilters}
                            >
                                Reset
                            </button>
                        </div>

                        {/* CATEGORY */}
                        <label>Kategori</label>

                        {[
                            "Desain",
                            "Programming",
                            "Video",
                            "Writing",
                        ].map((item) => (
                            <label
                                className="check"
                                key={item}
                            >
                                <input
                                    type="checkbox"
                                    value={item}
                                    checked={
                                        category === item
                                    }
                                    onChange={(event) => {
                                        const value =
                                            event.target.value;

                                        setCategory(
                                            category === value
                                                ? ""
                                                : value
                                        );
                                    }}
                                />

                                {item === "Video"
                                    ? "Video & Motion"
                                    : item}
                            </label>
                        ))}

                        {/* PRICE */}
                        <label>Harga</label>

                        <div className="price-row">
                            <input
                                id="minPrice"
                                type="number"
                                placeholder="Min"
                                value={minPrice}
                                onChange={(event) =>
                                    setMinPrice(
                                        event.target.value
                                    )
                                }
                            />

                            <span>—</span>

                            <input
                                id="maxPrice"
                                type="number"
                                placeholder="Max"
                                value={maxPrice}
                                onChange={(event) =>
                                    setMaxPrice(
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        {/* RATING */}
                        <label>
                            Rating minimum
                        </label>

                        <select
                            id="ratingFilter"
                            value={rating}
                            onChange={(event) =>
                                setRating(
                                    event.target.value
                                )
                            }
                        >
                            <option value="0">
                                Semua rating
                            </option>

                            <option value="4.5">
                                4.5+
                            </option>

                            <option value="4.8">
                                4.8+
                            </option>

                            <option value="5">
                                5.0
                            </option>
                        </select>

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleFilter}
                        >
                            Terapkan Filter
                        </button>
                    </aside>

                    {/* RESULTS */}
                    <div className="results">
                        <div className="results-head">
                            <b>
                                {pagination.total} jasa
                                ditemukan
                            </b>

                            <select
                                id="sortSelect"
                                value={sort}
                                onChange={(event) =>
                                    setSort(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="relevant">
                                    Paling relevan
                                </option>

                                <option value="price_asc">
                                    Harga terendah
                                </option>

                                <option value="price_desc">
                                    Harga tertinggi
                                </option>

                                <option value="rating_desc">
                                    Rating tertinggi
                                </option>
                            </select>
                        </div>

                        {loading ? (
                            <div className="empty">
                                Memuat jasa...
                            </div>
                        ) : services.length > 0 ? (
                            <div className="service-grid">
                                {services.map((service) => (
                                    <ServiceCard
                                        key={service.id}
                                        service={service}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="empty">
                                Tidak ada jasa yang ditemukan.
                            </div>
                        )}

                        {/* PAGINATION */}
                        {pagination.totalPages > 1 && (
                            <div className="pagination">
                                {Array.from(
                                    {
                                        length:
                                            pagination.totalPages,
                                    },
                                    (_, index) => index + 1
                                ).map((page) => (
                                    <button
                                        key={page}
                                        type="button"
                                        className={
                                            page ===
                                            pagination.page
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() =>
                                            loadServices(page)
                                        }
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </>
    );
}

export default Jasa;