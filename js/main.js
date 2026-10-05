const API_URL = "http://localhost:3000";
// =========================
// SERVICES DATA
// =========================

let services = [];


// =========================
// LOAD SERVICES FROM BACKEND
// =========================

async function loadServices() {
    try {
        const response = await fetch(`${API_URL}/api/services`);

        if (!response.ok) {
            throw new Error("Gagal mengambil data jasa");
        }

        const result = await response.json();

        console.log("Data dari backend:", result);

        services = result.data.map((service) => {
            const freelancer =
                service.freelancer ||
                service.user ||
                {};

            const sellerName =
                freelancer.name ||
                freelancer.username ||
                "Freelancer";

            return {
                ...service,

                seller: sellerName,

                initials: sellerName
                    .split(" ")
                    .map((word) => word.charAt(0))
                    .join("")
                    .substring(0, 2)
                    .toUpperCase(),

                color: "blue",

                orders: service.orders?.length || 0,

                cover:
                    service.category === "Programming"
                        ? "cover-purple"
                        : service.category === "Video"
                        ? "cover-orange"
                        : service.category === "Desain"
                        ? "cover-blue"
                        : "cover-green"
            };
        });

        return services;

    } catch (error) {
        console.error(
            "Error mengambil jasa:",
            error
        );

        services = [];

        return [];
    }
}


// =========================
// TOAST
// =========================

function showToast(message) {
    const t = document.getElementById("toast");

    if (!t) return;

    t.textContent = message;
    t.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        t.classList.remove("show");
    }, 2600);
}


// =========================
// SEARCH HERO
// =========================

function searchFromHero() {
    const searchInput =
        document.getElementById("heroSearch");

    if (!searchInput) return;

    const q = searchInput.value.trim();

    window.location.href =
        "jasa.html" +
        (q
            ? "?q=" + encodeURIComponent(q)
            : "");
}


// =========================
// PASSWORD
// =========================

function togglePassword(id) {
    const el = document.getElementById(id);

    if (!el) return;

    el.type =
        el.type === "password"
            ? "text"
            : "password";
}


// =========================
// LOGIN
// =========================

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            const email =
                document.getElementById("email").value;

            const password =
                document.getElementById("loginPass").value;

            const message =
                document.getElementById(
                    "loginMessage"
                );

            console.log(
                "Mencoba login:",
                email
            );

            try {
                const response = await fetch(
                    "http://localhost:3000/api/auth/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email,
                            password
                        })
                    }
                );

                const data =
                    await response.json();

                console.log(
                    "Response login:",
                    data
                );

                if (!response.ok) {
                    message.textContent =
                        data.message;

                    return;
                }

                localStorage.setItem(
                    "token",
                    data.token
                );

                localStorage.setItem(
                    "user",
                    JSON.stringify(
                        data.user
                    )
                );

                message.textContent =
                    "Login berhasil!";

                setTimeout(() => {
                    window.location.href =
                        "index.html";
                }, 500);

            } catch (error) {
                console.error(
                    "Login error:",
                    error
                );

                message.textContent =
                    "Tidak dapat terhubung ke server";
            }
        }
    );
}


// =========================
// LOGOUT
// =========================

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href =
        "login.html";
}


// =========================
// CHECK LOGIN
// =========================

function checkLogin() {
    const token =
        localStorage.getItem("token");

    if (!token) {
        window.location.href =
            "login.html";
    }
}


// =========================
// ORDER
// =========================

async function placeOrder() {
    const token = localStorage.getItem("token");

    if (!token) {
        showToast("Silakan login terlebih dahulu.");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1000);

        return;
    }

    const params = new URLSearchParams(
        window.location.search
    );

    const serviceId = params.get("id");

    if (!serviceId) {
        showToast("ID jasa tidak ditemukan.");
        return;
    }

    try {
        // Ambil detail jasa untuk mendapatkan harga
        const response = await fetch(
    `${API_URL}/api/services/${serviceId}`
);

        const service = await response.json();

        if (!response.ok) {
            showToast(
                service.message ||
                "Jasa tidak ditemukan."
            );

            return;
        }

        // Kirim order ke backend
        const orderResponse = await fetch(
    `${API_URL}/api/orders`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify({
                    serviceId: Number(serviceId),
                    totalPrice: Number(service.price)
                })
            }
        );

        const data =
            await orderResponse.json();

        console.log(
            "Response order:",
            data
        );

        if (!orderResponse.ok) {
            showToast(
                data.message ||
                "Gagal membuat order."
            );

            return;
        }

        showToast(
            "Order berhasil dibuat!"
        );

        console.log(
            "Order berhasil:",
            data.order
        );

    } catch (error) {
        console.error(
            "Order error:",
            error
        );

        showToast(
            "Tidak dapat terhubung ke server."
        );
    }
}


// =========================
// RENDER SERVICES
// =========================

function renderServices(list) {
    const box =
        document.getElementById(
            "serviceResults"
        );

    if (!box) return;

    const resultCount =
        document.getElementById(
            "resultCount"
        );

    if (resultCount) {
        resultCount.textContent =
            `${list.length} jasa ditemukan`;
    }

    if (!list.length) {
        box.innerHTML = `
            <div class="empty">
                Tidak ada jasa yang cocok.
                Filter memang kadang punya jiwa sendiri.
            </div>
        `;

        return;
    }

    box.innerHTML = list
        .map((s) => {
            const category =
                s.category || "Lainnya";

            const title =
                s.title || "Jasa Tanpa Judul";

            const seller =
                s.seller || "Freelancer";

            const initials =
                s.initials || "FL";

            const rating =
                Number(s.rating || 0);

            const orders =
                Number(s.orders || 0);

            const price =
                Number(s.price || 0);

            return `
                <article class="service-card">

                    <div
                        class="service-cover ${s.cover || ""}"
                    >
                        <span>
                            ${category.toUpperCase()}
                            <br>
                            CREATIVE
                        </span>

                        <i>
                            ${
                                category === "Programming"
                                    ? "⌘"
                                    : category === "Video"
                                    ? "◒"
                                    : "✦"
                            }
                        </i>
                    </div>

                    <div class="service-body">

                        <div class="service-cat">
                            ${category.toUpperCase()}
                        </div>

                        <h3>
                            ${title}
                        </h3>

                        <div class="seller">

                            <span
                                class="avatar avatar-${s.color || "blue"}"
                            >
                                ${initials}
                            </span>

                            <span>
                                <b>
                                    ${seller}
                                </b>

                                <small>
                                    ★ ${rating}
                                    · ${orders} order
                                </small>
                            </span>

                        </div>

                        <div class="service-foot">

                            <span>
                                Mulai dari

                                <b>
                                    Rp${price.toLocaleString(
                                        "id-ID"
                                    )}
                                </b>
                            </span>

                            <a
                                href="detail.html?id=${s.id}"
                            >
                                Lihat →
                            </a>

                        </div>

                    </div>

                </article>
            `;
        })
        .join("");
}

// =========================
// FAVORITE
// =========================

async function toggleFavorite() {
    const token = localStorage.getItem("token");

    if (!token) {
        showToast("Silakan login terlebih dahulu.");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1000);

        return;
    }

    const params = new URLSearchParams(
        window.location.search
    );

    const serviceId = params.get("id");

    if (!serviceId) {
        showToast("ID jasa tidak ditemukan.");
        return;
    }

    const button =
        document.getElementById("favoriteButton");

    try {
        // Cek apakah service sudah menjadi favorite
        const response = await fetch(
            "http://localhost:3000/api/favorites",
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        const favorites = await response.json();

        if (!response.ok) {
            showToast(
                favorites.message ||
                "Gagal mengecek favorite."
            );
            return;
        }

        const existingFavorite =
            favorites.find(
                favorite =>
                    favorite.serviceId ===
                    Number(serviceId)
            );

        // Kalau sudah favorite → hapus
        if (existingFavorite) {
            const deleteResponse =
                await fetch(
                    `http://localhost:3000/api/favorites/${serviceId}`,
                    {
                        method: "DELETE",
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

            const data =
                await deleteResponse.json();

            if (!deleteResponse.ok) {
                showToast(
                    data.message ||
                    "Gagal menghapus favorite."
                );
                return;
            }

            button.textContent =
                "♡ Simpan ke Favorit";

            showToast(
                "Jasa dihapus dari favorit."
            );

            return;
        }

        // Kalau belum favorite → tambah
        const addResponse =
            await fetch(
                `http://localhost:3000/api/favorites/${serviceId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await addResponse.json();

        if (!addResponse.ok) {
            showToast(
                data.message ||
                "Gagal menambahkan favorite."
            );
            return;
        }

        button.textContent =
            "♥ Tersimpan di Favorit";

        showToast(
            "Jasa berhasil ditambahkan ke favorit."
        );

    } catch (error) {
        console.error(
            "Favorite error:",
            error
        );

        showToast(
            "Tidak dapat terhubung ke server."
        );
    }
}

async function checkFavoriteStatus() {
    const token = localStorage.getItem("token");
    const button =
        document.getElementById("favoriteButton");

    if (!token || !button) return;

    const params = new URLSearchParams(
        window.location.search
    );

    const serviceId = params.get("id");

    if (!serviceId) return;

    try {
        const response = await fetch(
            "http://localhost:3000/api/favorites",
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        const favorites = await response.json();

        if (!response.ok) return;

        const isFavorite =
            favorites.some(
                favorite =>
                    favorite.serviceId ===
                    Number(serviceId)
            );

        if (isFavorite) {
            button.textContent =
                "♥ Tersimpan di Favorit";
        }

    } catch (error) {
        console.error(
            "Check favorite error:",
            error
        );
    }
}


// =========================
// QUERY
// =========================

function getQuery() {
    return (
        new URLSearchParams(
            window.location.search
        ).get("q") || ""
    );
}


// =========================
// FILTER SERVICES
// =========================

function filterServices() {
    const searchInput =
        document.getElementById(
            "searchInput"
        );

    const q = (
        searchInput?.value || ""
    ).toLowerCase();

    const cats = [
        ...document.querySelectorAll(
            ".filters input[type=checkbox]:checked"
        )
    ].map(
        (x) => x.value
    );

    const min = Number(
        document.getElementById(
            "minPrice"
        )?.value || 0
    );

    const max = Number(
        document.getElementById(
            "maxPrice"
        )?.value || Infinity
    );

    const rating = Number(
        document.getElementById(
            "ratingFilter"
        )?.value || 0
    );

    const list =
        services.filter((s) => {
            const searchableText =
                `${s.title || ""} ${
                    s.category || ""
                } ${
                    s.seller || ""
                }`.toLowerCase();

            return (
                (!q ||
                    searchableText.includes(q)) &&

                (!cats.length ||
                    cats.includes(
                        s.category
                    )) &&

                Number(s.price || 0) >= min &&

                Number(s.price || 0) <= max &&

                Number(s.rating || 0) >= rating
            );
        });

    renderServices(list);
}


// =========================
// SORT SERVICES
// =========================

function sortServices() {
    const select =
        document.getElementById(
            "sortSelect"
        );

    if (!select) return;

    const q = (
        document.getElementById(
            "searchInput"
        )?.value || ""
    ).toLowerCase();

    let list =
        services.filter((s) => {
            const searchableText =
                `${s.title || ""} ${
                    s.category || ""
                } ${
                    s.seller || ""
                }`.toLowerCase();

            return (
                !q ||
                searchableText.includes(q)
            );
        });

    if (select.value === "price") {
        list.sort(
            (a, b) =>
                Number(a.price || 0) -
                Number(b.price || 0)
        );
    }

    if (select.value === "rating") {
        list.sort(
            (a, b) =>
                Number(b.rating || 0) -
                Number(a.rating || 0)
        );
    }

    renderServices(list);
}


// =========================
// RESET FILTER
// =========================

function resetFilters() {
    document
        .querySelectorAll(
            ".filters input[type=checkbox]"
        )
        .forEach((x) => {
            x.checked = false;
        });

    const minPrice =
        document.getElementById(
            "minPrice"
        );

    const maxPrice =
        document.getElementById(
            "maxPrice"
        );

    const ratingFilter =
        document.getElementById(
            "ratingFilter"
        );

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    if (minPrice) {
        minPrice.value = "";
    }

    if (maxPrice) {
        maxPrice.value = "";
    }

    if (ratingFilter) {
        ratingFilter.value = "0";
    }

    if (searchInput) {
        searchInput.value = "";
    }

    renderServices(services);
}


// =========================
// NAVBAR LOGIN STATUS
// =========================

function updateNavbar() {
    const navActions =
        document.getElementById(
            "navActions"
        );

    if (!navActions) return;

    const token =
        localStorage.getItem("token");

    const userData =
        localStorage.getItem("user");

    if (!token || !userData) {
        return;
    }

    try {
        const user =
            JSON.parse(userData);

        navActions.innerHTML = `
    <a class="btn btn-ghost" href="pesanan.html">
        Pesanan
    </a>

     <a class="btn btn-ghost" href="chat.html">
        Chat
    </a>

    <a class="btn btn-ghost" href="profile.html">
        ${user.name || user.username}
    </a>

    <button class="btn btn-primary" onclick="logout()">
        Keluar
    </button>
`;
    } catch (error) {
        console.error(
            "Navbar error:",
            error
        );
    }
}


// =========================
// PROFILE
// =========================

async function loadProfile() {
    const token =
        localStorage.getItem("token");

    if (!token) {
        window.location.href =
            "login.html";

        return;
    }

    try {
        const response = await fetch(
            "http://localhost:3000/api/profile",
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        const data =
            await response.json();

        console.log(
            "Data profile:",
            data
        );

        if (!response.ok) {
            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "user"
            );

            window.location.href =
                "login.html";

            return;
        }

        const profileName =
            document.getElementById(
                "profileName"
            );

        const profileUsername =
            document.getElementById(
                "profileUsername"
            );

        const profileEmail =
            document.getElementById(
                "profileEmail"
            );

        const profileRole =
            document.getElementById(
                "profileRole"
            );

        const profileInitial =
            document.getElementById(
                "profileInitial"
            );

        if (profileName) {
            profileName.textContent =
                data.name ||
                data.username;
        }

        if (profileUsername) {
            profileUsername.textContent =
                "@" + data.username;
        }

        if (profileEmail) {
            profileEmail.textContent =
                data.email;
        }

        if (profileRole) {
            profileRole.textContent =
                data.role;
        }

        if (profileInitial) {
            profileInitial.textContent =
                (
                    data.name ||
                    data.username
                )
                    .charAt(0)
                    .toUpperCase();
        }

    } catch (error) {
        console.error(
            "Profile error:",
            error
        );

        const message =
            document.getElementById(
                "profileMessage"
            );

        if (message) {
            message.textContent =
                "Tidak dapat terhubung ke server.";
        }
    }
}


// =========================
// PAGE LOAD
// =========================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        // Navbar
        updateNavbar();


        // Services page
        if (
            document.getElementById(
                "serviceResults"
            )
        ) {
            const searchInput =
                document.getElementById(
                    "searchInput"
                );

            const q =
                getQuery();

            if (searchInput) {
                searchInput.value = q;
            }

            await loadServices();

            filterServices();
        }
    }
);

// =========================
// SERVICE DETAIL
// =========================

async function loadServiceDetail() {
async function startChat(freelancerId) {

    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
        window.location.href = "login.html";
        return;
    }

    const user = JSON.parse(userData);

    if (user.role !== "client") {
        alert("Hanya client yang dapat memulai chat dengan freelancer.");
        return;
    }

    try {

        const response = await fetch(
            "http://localhost:3000/api/conversations",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },

                body: JSON.stringify({
                    freelancerId: freelancerId
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Gagal membuat conversation."
            );
        }

        const conversationId =
            data.conversation.id;

        window.location.href =
            `chat.html?id=${conversationId}`;

    } catch (error) {

        console.error(
            "Start chat error:",
            error
        );

        alert(
            error.message ||
            "Gagal membuka chat."
        );
    }
}

window.startChat = startChat;
    const container =
        document.getElementById("detailContainer");

    if (!container) return;

    const params =
        new URLSearchParams(
            window.location.search
        );

    const serviceId =
        params.get("id");

    if (!serviceId) {
        container.innerHTML = `
            <div class="empty">
                ID jasa tidak ditemukan.
            </div>
        `;

        return;
    }

    try {

            const response = await fetch(
    `${API_URL}/api/services/${serviceId}`
);

        const service =
            await response.json();

        console.log(
            "Detail jasa:",
            service
        );

        if (!response.ok) {

            container.innerHTML = `
                <div class="empty">
                    ${
                        service.message ||
                        "Jasa tidak ditemukan."
                    }
                </div>
            `;

            return;
        }

        const freelancer =
            service.freelancer || {};

        const sellerName =
            freelancer.name ||
            freelancer.username ||
            "Freelancer";

        const rating =
            Number(service.rating || 0);

        const price =
            Number(service.price || 0);

        const category =
            service.category ||
            "Lainnya";


        // Update breadcrumb

        const breadcrumbCategory =
            document.getElementById(
                "breadcrumbCategory"
            );

        if (breadcrumbCategory) {
            breadcrumbCategory.textContent =
                category;
        }


        // Render detail

        container.innerHTML = `

            <div class="detail-grid">

                <section>

                    <div
                        class="detail-cover cover-purple"
                    >

                        <span>
                            ${category.toUpperCase()}
                            <br>
                            CREATIVE
                        </span>

                        <i>✦</i>

                    </div>


                    <div class="detail-content">

                        <span class="section-kicker">
                            ${category.toUpperCase()}
                        </span>


                        <h1>
                            ${service.title}
                        </h1>


                        <div class="detail-seller">

                            <span
                                class="avatar avatar-purple avatar-lg"
                            >
                                ${sellerName
                                    .charAt(0)
                                    .toUpperCase()}
                            </span>

                            <div>

                                <b>
                                    ${sellerName}
                                </b>

                                <p>
                                    Freelancer SkillMarket
                                </p>

                                <span class="rating">
                                    ★ ${rating}
                                </span>

                            </div>

                        </div>


                        <hr>


                        <h2>
                            Tentang jasa ini
                        </h2>


                        <p>
                            ${
                                service.description ||
                                "Belum ada deskripsi untuk jasa ini."
                            }
                        </p>


                        <h2>
                            Informasi Jasa
                        </h2>


                        <div class="feature-list">

                            <span>
                                ✓ Freelancer terverifikasi
                            </span>

                            <span>
                                ✓ Bisa dipesan melalui SkillMarket
                            </span>

                            <span>
                                ✓ Pembayaran aman
                            </span>

                        </div>

                    </div>

                </section>


                <aside class="order-box">

                    <div class="order-tabs">

                        <button class="selected">
                            Paket Jasa
                        </button>

                    </div>


                    <h3>
                        ${service.title}
                    </h3>


                    <p class="muted">
                        ${service.description || "Jasa profesional dari freelancer SkillMarket."}
                    </p>


                    <div class="order-price">
                        Rp${price.toLocaleString("id-ID")}
                    </div>


                    <div class="order-info">

                        <span>
                            ★ Rating ${rating}
                        </span>

                        <span>
                            ✓ Freelancer
                        </span>

                    </div>


                    <button
                        class="btn btn-primary btn-full"
                        onclick="placeOrder()"
                    >
                        Pesan Sekarang
                    </button>

                    <button
    class="btn btn-outline btn-full"
    onclick="startChat(${service.freelancerId})"
>
    💬 Chat Freelancer
</button>


                    <button
    class="btn btn-outline btn-full"
    id="favoriteButton"
    onclick="toggleFavorite()"
>
    ♡ Simpan ke Favorit
</button>


                    <div class="safe-note">
                        ⌁ Pembayaran aman sampai pekerjaan selesai.
                    </div>

                </aside>

            </div>

        `;
        checkFavoriteStatus();

    } catch (error) {

        console.error(
            "Service detail error:",
            error
        );

        container.innerHTML = `
            <div class="empty">
                Tidak dapat terhubung ke server.
            </div>
        `;
    }
}


// =========================
// OPEN REVIEW
// =========================

function openReviewForm(
    orderId,
    serviceName
) {

    const modal =
        document.getElementById(
            "reviewModal"
        );

    const orderInput =
        document.getElementById(
            "reviewOrderId"
        );

    const serviceNameElement =
        document.getElementById(
            "reviewServiceName"
        );

    const comment =
        document.getElementById(
            "reviewComment"
        );

    const ratingText =
        document.getElementById(
            "ratingText"
        );

    if (!modal) {

        console.error(
            "reviewModal tidak ditemukan."
        );

        return;
    }

    selectedRating = 0;

    if (orderInput) {
        orderInput.value = orderId;
    }

    if (serviceNameElement) {
        serviceNameElement.textContent =
            serviceName || "Jasa";
    }

    if (comment) {
        comment.value = "";
    }

    if (ratingText) {
        ratingText.textContent =
            "Pilih rating";
    }

    updateRatingButtons();

    modal.classList.add("active");
}


// =========================
// CLOSE REVIEW
// =========================

function closeReviewForm() {

    const modal =
        document.getElementById(
            "reviewModal"
        );

    if (!modal) return;

    modal.classList.remove("active");
}


// =========================
// SET RATING
// =========================

function setRating(rating) {

    selectedRating =
        Number(rating);

    const ratingText =
        document.getElementById(
            "ratingText"
        );

    const labels = {

        1: "Sangat buruk",

        2: "Kurang baik",

        3: "Cukup",

        4: "Bagus",

        5: "Sangat bagus"

    };

    if (ratingText) {

        ratingText.textContent =
            labels[selectedRating] ||
            "Pilih rating";

    }

    updateRatingButtons();
}


// =========================
// UPDATE RATING BUTTONS
// =========================

function updateRatingButtons() {

    const buttons =
        document.querySelectorAll(
            ".rating-input button"
        );

    buttons.forEach((button) => {

        const rating =
            Number(
                button.dataset.rating
            );

        button.classList.toggle(
            "selected",
            rating <= selectedRating
        );

    });
}

// ======================================================
// EXPORT FUNCTION KE HTML
// ======================================================

window.loadMyOrders =
    loadMyOrders;

window.openReviewForm =
    openReviewForm;

window.closeReviewForm =
    closeReviewForm;

window.setRating =
    setRating;

window.submitReview =
    submitReview;

// ======================================================
// LOAD MY ORDERS
// ======================================================

async function loadMyOrders() {
    const container =
        document.getElementById("ordersContainer");

    if (!container) return;

    const token =
        localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(
    `${API_URL}/api/orders`,
            {
                method: "GET",
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        const orders = await response.json();

        console.log("Data orders:", orders);

        if (!response.ok) {
            container.innerHTML = `
                <div class="empty">
                    ${
                        orders.message ||
                        "Gagal mengambil pesanan."
                    }
                </div>
            `;

            return;
        }

        if (
            !Array.isArray(orders) ||
            orders.length === 0
        ) {
            container.innerHTML = `
                <div class="empty">
                    Belum ada pesanan.
                </div>
            `;

            return;
        }

        // Ambil delivery untuk order yang sudah delivered
const ordersWithDelivery = await Promise.all(
    orders.map(async (order) => {

        if (order.status !== "delivered") {
            return {
                ...order,
                delivery: null
            };
        }

        try {

            const deliveryResponse =
                await fetch(
                    `http://localhost:3000/api/orders/${order.id}/delivery`,
                    {
                        method: "GET",

                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

            if (!deliveryResponse.ok) {
                return {
                    ...order,
                    delivery: null
                };
            }

            const delivery =
                await deliveryResponse.json();

            return {
                ...order,
                delivery
            };

        } catch (error) {

            console.error(
                `Delivery order #${order.id}:`,
                error
            );

            return {
                ...order,
                delivery: null
            };
        }
    })
);


container.innerHTML =
    ordersWithDelivery
        .map((order) => {

            const service =
                order.service || {};

            const freelancer =
                order.freelancer || {};

            const review =
                order.review || null;

            const delivery =
                order.delivery || null;

            const serviceTitle =
                service.title ||
                "Jasa tidak tersedia";

            const freelancerName =
                freelancer.name ||
                freelancer.username ||
                "Freelancer";

            const category =
                service.category ||
                "Lainnya";

            const price =
                Number(
                    order.totalPrice || 0
                );

            const status =
                order.status ||
                "pending";


           const statusMap = {

    pending: {
        text: "Menunggu",
        className:
            "status-pending"
    },

    delivered: {
        text: "Hasil siap",
        className:
            "status-delivered"
    },

    completed: {
        text: "Selesai",
        className:
            "status-completed"
    },

    cancelled: {
        text: "Dibatalkan",
        className:
            "status-cancelled"
    }

};

const currentStatus =
    statusMap[status] ||
    statusMap.pending;


            // =========================
            // DELIVERY SECTION
            // =========================

            let deliverySection = "";


            if (
                status === "delivered" &&
                delivery
            ) {

                deliverySection = `
                    <div class="delivery-box">

                        <h4>
                            📦 Hasil Pekerjaan
                        </h4>

                        <p>
                            <strong>
                                ${delivery.fileName}
                            </strong>
                        </p>

                        ${
                            delivery.note
                                ? `
                                    <p>
                                        ${delivery.note}
                                    </p>
                                `
                                : ""
                        }

                        <div class="order-actions">

                            <a
                                href="${delivery.fileUrl}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="btn btn-outline"
                            >
                                Download Hasil
                            </a>

                            <button
                                type="button"
                                class="btn btn-primary"
                                onclick="completeOrder(${order.id})"
                            >
                                ✓ Terima Hasil
                            </button>

                        </div>

                    </div>
                `;

            }


            // =========================
            // REVIEW
            // =========================

            let reviewButton = "";


            if (
                status === "completed" &&
                !review
            ) {

                reviewButton = `
                    <button
                        type="button"
                        class="btn btn-primary review-button"
                        data-order-id="${order.id}"
                        data-service-name="${encodeURIComponent(
                            serviceTitle
                        )}"
                    >
                        Beri Review
                    </button>
                `;

            }


            if (review) {

                reviewButton = `
                    <span class="reviewed-badge">
                        ★ ${review.rating}
                        · Sudah Direview
                    </span>
                `;

            }


            return `
                <article class="order-card">

                    <div class="order-card-main">

                        <div>

                            <span class="section-kicker">
                                ORDER #${order.id}
                            </span>

                            <h3>
                                ${serviceTitle}
                            </h3>

                            <p>
                                ${category}
                                ·
                                ${freelancerName}
                            </p>

                        </div>


                        <div class="order-card-side">

                            <strong>
                                Rp${price.toLocaleString(
                                    "id-ID"
                                )}
                            </strong>

                            <span
                                class="
                                    order-status
                                    ${currentStatus.className}
                                "
                            >
                                ${currentStatus.text}
                            </span>

                        </div>

                    </div>


                    ${deliverySection}


                    <div class="order-card-footer">

                        <span>
                            ${formatOrderDate(
                                order.createdAt
                            )}
                        </span>

                        <div class="order-actions">

                            <button
                                type="button"
                                class="btn btn-outline"
                                onclick="
                                    window.location.href=
                                    'detail.html?id=${order.serviceId}'
                                "
                            >
                                Lihat Jasa
                            </button>

                            ${reviewButton}

                        </div>

                    </div>

                </article>
            `;
        })
        .join("");

        container
            .querySelectorAll(".review-button")
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const orderId =
                            Number(
                                button.dataset
                                    .orderId
                            );

                        const serviceName =
                            decodeURIComponent(
                                button.dataset
                                    .serviceName
                            );

                        openReviewForm(
                            orderId,
                            serviceName
                        );
                    }
                );
            });

    } catch (error) {

        console.error(
            "Load orders error:",
            error
        );

        container.innerHTML = `
            <div class="empty">
                Tidak dapat terhubung ke server.
            </div>
        `;
    }
}

// =========================
// COMPLETE ORDER
// =========================

async function completeOrder(orderId) {

    const token =
        localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {

        const response =
            await fetch(
                `http://localhost:3000/api/orders/${orderId}/complete`,
                {
                    method: "PUT",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        console.log(
            "Complete order:",
            data
        );

        if (!response.ok) {

            showToast(
                data.message ||
                "Gagal menerima hasil."
            );

            return;
        }

        showToast(
            "Hasil pekerjaan berhasil diterima!"
        );

        // Refresh daftar order
        await loadMyOrders();

    } catch (error) {

        console.error(
            "Complete order error:",
            error
        );

        showToast(
            "Tidak dapat terhubung ke server."
        );
    }
}


// ======================================================
// REVIEW & RATING
// ======================================================

let selectedRating = 0;


function openReviewForm(
    orderId,
    serviceName
) {
    const modal =
        document.getElementById(
            "reviewModal"
        );

    const orderInput =
        document.getElementById(
            "reviewOrderId"
        );

    const serviceNameElement =
        document.getElementById(
            "reviewServiceName"
        );

    const comment =
        document.getElementById(
            "reviewComment"
        );

    const ratingText =
        document.getElementById(
            "ratingText"
        );

    if (!modal) {
        console.error(
            "reviewModal tidak ditemukan."
        );

        return;
    }

    selectedRating = 0;

    if (orderInput) {
        orderInput.value = orderId;
    }

    if (serviceNameElement) {
        serviceNameElement.textContent =
            serviceName;
    }

    if (comment) {
        comment.value = "";
    }

    if (ratingText) {
        ratingText.textContent =
            "Pilih rating";
    }

    updateRatingButtons();

    modal.classList.add("active");
}


function closeReviewForm() {
    const modal =
        document.getElementById(
            "reviewModal"
        );

    if (!modal) return;

    modal.classList.remove("active");
}


function setRating(rating) {
    selectedRating =
        Number(rating);

    const ratingText =
        document.getElementById(
            "ratingText"
        );

    const labels = {
        1: "Sangat buruk",
        2: "Kurang baik",
        3: "Cukup",
        4: "Bagus",
        5: "Sangat bagus"
    };

    if (ratingText) {
        ratingText.textContent =
            labels[selectedRating];
    }

    updateRatingButtons();
}


function updateRatingButtons() {
    const buttons =
        document.querySelectorAll(
            ".rating-input button"
        );

    buttons.forEach((button) => {

        const rating =
            Number(
                button.dataset.rating
            );

        button.classList.toggle(
            "selected",
            rating <= selectedRating
        );
    });
}


async function submitReview() {

    const token =
        localStorage.getItem("token");

    if (!token) {
        showToast(
            "Silakan login terlebih dahulu."
        );

        return;
    }

    const orderInput =
        document.getElementById(
            "reviewOrderId"
        );

    const commentInput =
        document.getElementById(
            "reviewComment"
        );

    const orderId =
        Number(
            orderInput
                ? orderInput.value
                : 0
        );

    const comment =
        commentInput
            ? commentInput.value.trim()
            : "";

    if (!orderId) {
        showToast(
            "Order tidak ditemukan."
        );

        return;
    }

    if (
        selectedRating < 1 ||
        selectedRating > 5
    ) {
        showToast(
            "Pilih rating terlebih dahulu."
        );

        return;
    }

    try {

        const response =
            await fetch(
                "http://localhost:3000/api/reviews",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        orderId,
                        rating:
                            selectedRating,
                        comment:
                            comment || null
                    })
                }
            );

        const data =
            await response.json();

        console.log(
            "Response review:",
            data
        );

        if (!response.ok) {
            showToast(
                data.message ||
                "Gagal mengirim review."
            );

            return;
        }

        showToast(
            "Review berhasil dikirim!"
        );

        closeReviewForm();

        selectedRating = 0;

        await loadMyOrders();

    } catch (error) {

        console.error(
            "Submit review error:",
            error
        );

        showToast(
            "Tidak dapat terhubung ke server."
        );
    }
}


window.loadMyOrders =
    loadMyOrders;

window.openReviewForm =
    openReviewForm;

window.closeReviewForm =
    closeReviewForm;

window.setRating =
    setRating;

window.submitReview =
    submitReview;

// =========================
// FORMAT ORDER DATE
// =========================
function formatOrderDate(date) {
    if (!date) return "-";

    const d = new Date(date);

    if (isNaN(d.getTime())) {
        return "-";
    }

    return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

// =========================
// UPDATE ORDER STATUS
// =========================

async function updateOrderStatus(
    orderId,
    status
) {

    const token =
        localStorage.getItem("token");


    if (!token) {

        window.location.href =
            "login.html";

        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/api/freelancer/orders/${orderId}/status`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`
                },

                body: JSON.stringify({
                    status
                })
            }
        );


        const data =
            await response.json();


        console.log(
            "Update order:",
            data
        );


        if (!response.ok) {

            showToast(
                data.message ||
                "Gagal mengubah status."
            );

            return;
        }


        showToast(
            "Status order berhasil diubah."
        );


        // Reload daftar order

        loadFreelancerOrders();

        // ======================================================
// FORM KIRIM HASIL
// ======================================================

function openDeliveryForm(orderId) {

    const container =
        document.getElementById(
            "freelancerOrdersContainer"
        );

    if (!container) return;

    const existingForm =
        document.getElementById(
            `delivery-form-${orderId}`
        );

    if (existingForm) return;

    const form = document.createElement("div");

    form.id =
        `delivery-form-${orderId}`;

    form.className =
        "delivery-form";

    form.innerHTML = `

        <div class="delivery-form-inner">

            <h3>
                Kirim Hasil Order #${orderId}
            </h3>

            <div class="form-group">

                <label>
                    URL File Hasil
                </label>

                <input
                    type="url"
                    id="fileUrl-${orderId}"
                    placeholder="https://example.com/hasil.pdf"
                    required
                >

            </div>

            <div class="form-group">

                <label>
                    Nama File
                </label>

                <input
                    type="text"
                    id="fileName-${orderId}"
                    placeholder="hasil-pekerjaan.pdf"
                    required
                >

            </div>

            <div class="form-group">

                <label>
                    Catatan
                </label>

                <textarea
                    id="deliveryNote-${orderId}"
                    placeholder="Catatan untuk client..."
                    rows="4"
                ></textarea>

            </div>

            <div class="delivery-form-actions">

                <button
                    type="button"
                    class="btn btn-primary"
                    onclick="submitDelivery(${orderId})"
                >
                    Kirim Hasil
                </button>

                <button
                    type="button"
                    class="btn btn-outline"
                    onclick="closeDeliveryForm(${orderId})"
                >
                    Batal
                </button>

            </div>

            <p
                id="deliveryMessage-${orderId}"
                class="form-message"
            ></p>

        </div>

    `;

    container.prepend(form);
}


// ======================================================
// SUBMIT DELIVERY
// ======================================================

async function submitDelivery(orderId) {

    const token =
        localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const fileUrl =
        document.getElementById(
            `fileUrl-${orderId}`
        ).value.trim();

    const fileName =
        document.getElementById(
            `fileName-${orderId}`
        ).value.trim();

    const note =
        document.getElementById(
            `deliveryNote-${orderId}`
        ).value.trim();

    const message =
        document.getElementById(
            `deliveryMessage-${orderId}`
        );

    if (!fileUrl || !fileName) {

        message.textContent =
            "URL file dan nama file wajib diisi.";

        return;
    }

    try {

        const response =
            await fetch(
                `http://localhost:3000/api/orders/${orderId}/delivery`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        fileUrl,
                        fileName,
                        note
                    })
                }
            );

        const data =
            await response.json();

        console.log(
            "Response delivery:",
            data
        );

        if (!response.ok) {

            message.textContent =
                data.message ||
                "Gagal mengirim hasil.";

            return;
        }

        message.textContent =
            "Hasil berhasil dikirim.";

        setTimeout(() => {
            loadFreelancerOrders();
        }, 500);

    } catch (error) {

        console.error(
            "Submit delivery error:",
            error
        );

        message.textContent =
            "Tidak dapat terhubung ke server.";
    }
}


// ======================================================
// TUTUP FORM DELIVERY
// ======================================================

function closeDeliveryForm(orderId) {

    const form =
        document.getElementById(
            `delivery-form-${orderId}`
        );

    if (form) {
        form.remove();
    }
}


    } catch (error) {

        console.error(
            "Update order error:",
            error
        );


        showToast(
            "Tidak dapat terhubung ke server."
        );
    }
}

window.loadMyOrders = loadMyOrders;
window.openReviewForm = openReviewForm;
window.closeReviewForm = closeReviewForm;
window.setRating = setRating;
window.submitReview = submitReview;



// ======================================================
// LOAD FREELANCER ORDERS
// ======================================================

async function loadFreelancerOrders() {

    const container =
        document.getElementById(
            "freelancerOrdersContainer"
        );

    if (!container) return;

    const token =
        localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    

    try {

        const response = await fetch(
    `${API_URL}/api/freelancer/orders`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        const orders =
            await response.json();

        console.log(
            "Order freelancer:",
            orders
        );

        if (!response.ok) {

            container.innerHTML = `
                <div class="empty">
                    ${
                        orders.message ||
                        "Gagal mengambil order."
                    }
                </div>
            `;

            return;
        }

        if (
            !Array.isArray(orders) ||
            orders.length === 0
        ) {

            container.innerHTML = `
                <div class="empty">
                    Belum ada order masuk.
                </div>
            `;

            return;
        }

        container.innerHTML =
            orders
                .map((order) => {

                    let statusText =
                        "Menunggu";

                    if (
                        order.status ===
                        "delivered"
                    ) {
                        statusText =
                            "Hasil Dikirim";
                    }

                    if (
                        order.status ===
                        "completed"
                    ) {
                        statusText =
                            "Selesai";
                    }

                    if (
                        order.status ===
                        "cancelled"
                    ) {
                        statusText =
                            "Dibatalkan";
                    }

                    return `

                        <article
                            class="order-card"
                        >

                            <div
                                class="order-card-main"
                            >

                                <div>

                                    <span
                                        class="section-kicker"
                                    >
                                        ORDER #${order.id}
                                    </span>

                                    <h3>
                                        Jasa #${order.serviceId}
                                    </h3>

                                    <p>
                                        Client ID:
                                        ${order.clientId}
                                    </p>

                                    <p>
                                        Dibuat:
                                        ${formatOrderDate(
                                            order.createdAt
                                        )}
                                    </p>

                                </div>

                                <div
                                    class="order-card-side"
                                >

                                    <strong>
                                        Rp${Number(
                                            order.totalPrice
                                        ).toLocaleString(
                                            "id-ID"
                                        )}
                                    </strong>

                                    <span
                                        class="order-status status-${order.status}"
                                    >
                                        ${statusText}
                                    </span>

                                </div>

                            </div>

                            <div
                                class="order-card-footer"
                            >

                                <span>
                                    Status:
                                    <b>
                                        ${statusText}
                                    </b>
                                </span>

                                <div
                                    class="order-actions"
                                >

                                    ${
                                        order.status ===
                                        "pending"
                                            ? `
                                                <button
                                                    class="btn btn-primary"
                                                    onclick="openDeliveryForm(${order.id})"
                                                >
                                                    Kirim Hasil
                                                </button>

                                                <button
                                                    class="btn btn-outline"
                                                    onclick="updateOrderStatus(
                                                        ${order.id},
                                                        'cancelled'
                                                    )"
                                                >
                                                    Batalkan
                                                </button>
                                            `
                                            : ""
                                    }

                                    ${
                                        order.status ===
                                        "delivered"
                                            ? `
                                                <span>
                                                    Hasil sudah dikirim
                                                </span>
                                            `
                                            : ""
                                    }

                                    ${
                                        order.status ===
                                        "completed"
                                            ? `
                                                <span>
                                                    Order selesai
                                                </span>
                                            `
                                            : ""
                                    }

                                </div>

                            </div>

                        </article>

                    `;
                })
                .join("");

    } catch (error) {

        console.error(
            "Freelancer orders error:",
            error
        );

        container.innerHTML = `
            <div class="empty">
                Tidak dapat terhubung ke server.
            </div>
        `;
    }
}

window.openDeliveryForm = openDeliveryForm;
window.submitDelivery = submitDelivery;
window.closeDeliveryForm = closeDeliveryForm;
window.updateOrderStatus = updateOrderStatus;

function openDeliveryForm(orderId) {
    const fileUrl = prompt("Masukkan URL hasil pekerjaan:");

    if (!fileUrl) {
        return;
    }

    const fileName = prompt("Masukkan nama file:");

    if (!fileName) {
        return;
    }

    const note = prompt("Catatan untuk client (opsional):") || "";

    submitDelivery(orderId, fileUrl, fileName, note);
}


async function submitDelivery(orderId, fileUrl, fileName, note) {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Silakan login terlebih dahulu.");
        return;
    }

    try {
        const response = await fetch(
            `http://localhost:3000/api/orders/${orderId}/delivery`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    fileUrl,
                    fileName,
                    note
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Gagal mengirim hasil pekerjaan.");
            return;
        }

        alert("Hasil pekerjaan berhasil dikirim!");

        loadFreelancerOrders();

    } catch (error) {
        console.error("Submit delivery error:", error);
        alert("Tidak dapat terhubung ke server.");
    }
}


function closeDeliveryForm(orderId) {
    const form = document.getElementById(`delivery-form-${orderId}`);

    if (form) {
        form.remove();
    }
}

let activeConversationId = null;


async function loadConversations() {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
        window.location.href = "login.html";
        return;
    }

    const user = JSON.parse(userData);

    try {
        const response = await fetch(
            "http://localhost:3000/api/conversations",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const conversations = await response.json();

        if (!response.ok) {
            throw new Error(
                conversations.message || "Gagal mengambil conversation"
            );
        }

        const container =
            document.getElementById("conversationList");

        if (!conversations.length) {
            container.innerHTML = `
                <div class="empty">
                    Belum ada percakapan.
                </div>
            `;
            return;
        }

        container.innerHTML = conversations.map(conversation => {

            const otherUserId =
                user.role === "client"
                    ? conversation.freelancerId
                    : conversation.clientId;

            return `
                <button
                    class="conversation-item"
                    onclick="openConversation(${conversation.id}, this)"
                >
                    <strong>
                        Conversation #${conversation.id}
                    </strong>

                    <span>
                        ${user.role === "client"
                            ? `Freelancer ID: ${otherUserId}`
                            : `Client ID: ${otherUserId}`
                        }
                    </span>
                </button>
            `;

        }).join("");

    } catch (error) {
        console.error("Load conversations error:", error);

        document.getElementById("conversationList").innerHTML = `
            <div class="empty">
                Gagal memuat conversation.
            </div>
        `;
    }
}


async function openConversation(
    conversationId,
    element = null
) {

    activeConversationId = conversationId;

    document.querySelectorAll(".conversation-item")
        .forEach(item => {
            item.classList.remove("active");
        });

    if (element) {
        element.classList.add("active");
    }

    await loadMessages(conversationId);
}


async function loadMessages(conversationId) {

    const token = localStorage.getItem("token");
    const user = JSON.parse(
        localStorage.getItem("user")
    );

    try {

        const response = await fetch(
            `http://localhost:3000/api/conversations/${conversationId}/messages`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const messages = await response.json();

        if (!response.ok) {
            throw new Error(
                messages.message || "Gagal mengambil pesan"
            );
        }

        document.getElementById("chatHeader").innerHTML = `
            <strong>
                Conversation #${conversationId}
            </strong>
        `;

        const container =
            document.getElementById("messageList");

        if (!messages.length) {

            container.innerHTML = `
                <div class="empty">
                    Belum ada pesan.
                </div>
            `;

            return;
        }

        container.innerHTML = messages.map(message => {

            const mine =
                message.senderId === user.id;

            return `
                <div class="message ${mine ? "mine" : ""}">

                    <div class="message-bubble">

                        <div>
                            ${escapeHtml(message.content)}
                        </div>

                        <div class="message-meta">
                            ${mine ? "Anda" : `User #${message.senderId}`}
                        </div>

                    </div>

                </div>
            `;

        }).join("");

        container.scrollTop =
            container.scrollHeight;

    } catch (error) {

        console.error("Load messages error:", error);

        document.getElementById("messageList").innerHTML = `
            <div class="empty">
                Gagal memuat pesan.
            </div>
        `;
    }
}


document.addEventListener("DOMContentLoaded", () => {

    const messageForm =
        document.getElementById("messageForm");

    if (!messageForm) return;

    const params = new URLSearchParams(
    window.location.search
);

const conversationId =
    params.get("id");

await loadConversations();

if (conversationId) {
    await openConversation(
        parseInt(conversationId)
    );
}

    messageForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            if (!activeConversationId) {
                alert("Pilih conversation terlebih dahulu.");
                return;
            }

            const input =
                document.getElementById("messageInput");

            const content =
                input.value.trim();

            if (!content) return;

            const token =
                localStorage.getItem("token");

            try {

                const response = await fetch(
                    `http://localhost:3000/api/conversations/${activeConversationId}/messages`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        },

                        body: JSON.stringify({
                            content
                        })
                    }
                );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Gagal mengirim pesan"
                    );
                }

                input.value = "";

                await loadMessages(
                    activeConversationId
                );

            } catch (error) {

                console.error(
                    "Send message error:",
                    error
                );

                alert(
                    error.message ||
                    "Gagal mengirim pesan."
                );
            }
        }
    );

});


function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


window.loadConversations = loadConversations;
window.openConversation = openConversation;
window.loadMessages = loadMessages;