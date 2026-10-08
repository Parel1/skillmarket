import express from "express";
import cors from "cors";
import "dotenv/config"; 
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { db } from "./src/prisma/db.js";

const app = express();

app.use(cors());
app.use(express.json());

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        message: "Terlalu banyak percobaan login. Coba lagi nanti."
    },
    standardHeaders: true,
    legacyHeaders: false
});

// =========================
// HOME
// =========================

app.get("/", (req, res) => {
    res.json({
        message: "SkillMarket API is running!"
    });
});


// =========================
// GET ALL SERVICES
// =========================

app.get("/api/services", async (req, res) => {
    try {
        const {
            search,
            category,
            minPrice,
            maxPrice,
            sort,
            page = 1,
            limit = 10
        } = req.query;

        // Ambil services dari Prisma
        let services = await db.service.findMany({
            include: {
                category: true,
                freelancer: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true
                    }
                }
            }
        });

        // Search berdasarkan judul, deskripsi, atau kategori
        if (search) {
            const keyword = search.toLowerCase();

            services = services.filter(service =>
                service.title.toLowerCase().includes(keyword) ||
                (service.description &&
                    service.description.toLowerCase().includes(keyword)) ||
                service.category.name.toLowerCase().includes(keyword)
            );
        }

        // Filter kategori
        if (category) {
            services = services.filter(service =>
                service.category.name.toLowerCase() === category.toLowerCase()
            );
        }

        // Filter harga minimum
        if (minPrice) {
            services = services.filter(service =>
                service.price >= parseInt(minPrice)
            );
        }

        // Filter harga maksimum
        if (maxPrice) {
            services = services.filter(service =>
                service.price <= parseInt(maxPrice)
            );
        }

        // Sorting
        if (sort === "price_asc") {
            services.sort((a, b) => a.price - b.price);
        }

        if (sort === "price_desc") {
            services.sort((a, b) => b.price - a.price);
        }

        if (sort === "rating_desc") {
            services.sort((a, b) => b.rating - a.rating);
        }

        // Pagination
        const currentPage = Math.max(parseInt(page) || 1, 1);
        const itemsPerPage = Math.max(parseInt(limit) || 10, 1);

        const total = services.length;
        const totalPages = Math.ceil(total / itemsPerPage);

        const start = (currentPage - 1) * itemsPerPage;

        const paginatedServices = services.slice(
            start,
            start + itemsPerPage
        );

        res.json({
            data: paginatedServices,
            pagination: {
                page: currentPage,
                limit: itemsPerPage,
                total,
                totalPages
            }
        });

    } catch (error) {
        console.error("GET /api/services error:", error);

        res.status(500).json({
            message: "Gagal mengambil services",
            error: error.message
        });
    }
});

// =========================
// GET SERVICE BY ID
// =========================

app.get("/api/services/:id", async (req, res) => {
    try {
        const serviceId = parseInt(req.params.id, 10);

        if (isNaN(serviceId)) {
            return res.status(400).json({
                message: "Service ID tidak valid"
            });
        }

        const service = await db.service.findUnique({
            where: {
                id: serviceId
            },
            include: {
                category: true,
                freelancer: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                        bio: true
                    }
                }
            }
        });

        if (!service) {
            return res.status(404).json({
                message: "Jasa tidak ditemukan"
            });
        }

        res.json({
            data: service
        });

    } catch (error) {
        console.error(
            "GET /api/services/:id error:",
            error
        );

        res.status(500).json({
            message: "Gagal mengambil detail jasa",
            error: error.message
        });
    }
});

// =========================
// CREATE SERVICE
// =========================

app.post(
    "/api/services",
    authenticateToken,
    authorizeRole("freelancer"),
    async (req, res) => {
        try {
            const {
                title,
                description,
                categoryId,
                price
            } = req.body;

            // Validasi input
            if (!title || !description || !categoryId || price === undefined) {
                return res.status(400).json({
                    message: "Title, description, categoryId, dan price wajib diisi"
                });
            }

            const freelancerId = req.user.userId;

            // Pastikan category ada
            const category = await db.category.findUnique({
                where: {
                    id: parseInt(categoryId)
                }
            });

            if (!category) {
                return res.status(404).json({
                    message: "Kategori tidak ditemukan"
                });
            }

            // Buat service
            const service = await db.service.create({
                data: {
                    title,
                    description,
                    price: parseInt(price),
                    rating: 0,
                    freelancerId,
                    categoryId: parseInt(categoryId)
                },
                include: {
                    category: true,
                    freelancer: {
                        select: {
                            id: true,
                            name: true,
                            profileImage: true
                        }
                    }
                }
            });

            res.status(201).json({
                message: "Jasa berhasil ditambahkan",
                service
            });

        } catch (error) {
            console.error("CREATE SERVICE ERROR:", error);

            res.status(500).json({
                message: "Gagal menambahkan jasa",
                error: error.message
            });
        }
    }
);


app.put(
    "/api/services/:id",
    authenticateToken,
    authorizeRole("freelancer"),
    async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);

            if (isNaN(id)) {
                return res.status(400).json({
                    message: "ID jasa tidak valid"
                });
            }

            const {
                title,
                description,
                categoryId,
                price
            } = req.body;

            if (!title || !description || !categoryId || price === undefined) {
                return res.status(400).json({
                    message: "Title, description, categoryId, dan price wajib diisi"
                });
            }

            const existingService = await db.service.findUnique({
                where: {
                    id
                }
            });

            if (!existingService) {
                return res.status(404).json({
                    message: "Jasa tidak ditemukan"
                });
            }

            // Pastikan hanya freelancer pemilik jasa yang bisa mengedit
            if (existingService.freelancerId !== req.user.userId) {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses untuk mengedit jasa ini"
                });
            }

            const category = await db.category.findUnique({
                where: {
                    id: parseInt(categoryId, 10)
                }
            });

            if (!category) {
                return res.status(404).json({
                    message: "Kategori tidak ditemukan"
                });
            }

            const updatedService = await db.service.update({
                where: {
                    id
                },
                data: {
                    title,
                    description,
                    categoryId: parseInt(categoryId, 10),
                    price: parseInt(price, 10)
                },
                include: {
                    category: true,
                    freelancer: {
                        select: {
                            id: true,
                            name: true,
                            profileImage: true,
                            bio: true
                        }
                    }
                }
            });

            res.json({
                message: "Jasa berhasil diperbarui",
                service: updatedService
            });

        } catch (error) {
            console.error("UPDATE SERVICE ERROR:", error);

            res.status(500).json({
                message: "Gagal memperbarui jasa",
                error: error.message
            });
        }
    }
);

// =========================
// DELETE SERVICE
// =========================

app.delete(
    "/api/services/:id",
    authenticateToken,
    authorizeRole("freelancer"),
    async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);

            if (isNaN(id)) {
                return res.status(400).json({
                    message: "ID jasa tidak valid"
                });
            }

            const existingService = await db.service.findUnique({
                where: {
                    id
                }
            });

            if (!existingService) {
                return res.status(404).json({
                    message: "Jasa tidak ditemukan"
                });
            }

            // Pastikan freelancer hanya bisa menghapus jasa miliknya
            if (existingService.freelancerId !== req.user.userId) {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses untuk menghapus jasa ini"
                });
            }

            const deletedService = await db.service.delete({
                where: {
                    id
                }
            });

            res.json({
                message: "Jasa berhasil dihapus",
                service: deletedService
            });

        } catch (error) {
            console.error("DELETE SERVICE ERROR:", error);

            res.status(500).json({
                message: "Gagal menghapus jasa",
                error: error.message
            });
        }
    }
);

/// =========================
// FAVORITES
// =========================

// GET daftar favorite milik client
app.get(
    "/api/favorites",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const favorites = await db.favorite.findMany({
                where: {
                    userId: req.user.userId
                },
                include: {
                    service: {
                        include: {
                            category: true,
                            freelancer: {
                                select: {
                                    id: true,
                                    name: true,
                                    profileImage: true,
                                    bio: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                }
            });

            res.json(favorites);

        } catch (error) {
            console.error("GET FAVORITES ERROR:", error);

            res.status(500).json({
                message: "Gagal mengambil favorite",
                error: error.message
            });
        }
    }
);


// POST tambah favorite
app.post(
    "/api/favorites",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const { serviceId } = req.body;

            const parsedServiceId = parseInt(serviceId, 10);

            if (isNaN(parsedServiceId)) {
                return res.status(400).json({
                    message: "Service ID wajib diisi dan harus berupa angka"
                });
            }

            // Cek apakah service ada
            const service = await db.service.findUnique({
                where: {
                    id: parsedServiceId
                }
            });

            if (!service) {
                return res.status(404).json({
                    message: "Jasa tidak ditemukan"
                });
            }

            // Cek apakah sudah ada di favorite
            const existingFavorite = await db.favorite.findUnique({
                where: {
                    userId_serviceId: {
                        userId: req.user.userId,
                        serviceId: parsedServiceId
                    }
                }
            });

            if (existingFavorite) {
                return res.status(409).json({
                    message: "Jasa sudah ada di favorite"
                });
            }

            const favorite = await db.favorite.create({
                data: {
                    userId: req.user.userId,
                    serviceId: parsedServiceId
                },
                include: {
                    service: {
                        include: {
                            category: true,
                            freelancer: {
                                select: {
                                    id: true,
                                    name: true,
                                    profileImage: true,
                                    bio: true
                                }
                            }
                        }
                    }
                }
            });

            res.status(201).json({
                message: "Jasa berhasil ditambahkan ke favorite",
                favorite
            });

        } catch (error) {
            console.error("CREATE FAVORITE ERROR:", error);

            res.status(500).json({
                message: "Gagal menambahkan favorite",
                error: error.message
            });
        }
    }
);


// DELETE favorite
app.delete(
    "/api/favorites/:serviceId",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const serviceId = parseInt(req.params.serviceId, 10);

            if (isNaN(serviceId)) {
                return res.status(400).json({
                    message: "Service ID tidak valid"
                });
            }

            const favorite = await db.favorite.findUnique({
                where: {
                    userId_serviceId: {
                        userId: req.user.userId,
                        serviceId
                    }
                }
            });

            if (!favorite) {
                return res.status(404).json({
                    message: "Favorite tidak ditemukan"
                });
            }

            await db.favorite.delete({
                where: {
                    id: favorite.id
                }
            });

            res.json({
                message: "Jasa berhasil dihapus dari favorite"
            });

        } catch (error) {
            console.error("DELETE FAVORITE ERROR:", error);

            res.status(500).json({
                message: "Gagal menghapus favorite",
                error: error.message
            });
        }
    }
);

// =========================
// ORDERS
// =========================

// GET ALL ORDERS
app.get(
    "/api/orders",
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user.userId;
            const role = req.user.role?.toUpperCase();

            let where = {};

            if (role === "CLIENT") {
                where = {
                    clientId: userId
                };
            } else if (role === "FREELANCER") {
                where = {
                    service: {
                        freelancerId: userId
                    }
                };
            } else {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses"
                });
            }

            const orders = await db.order.findMany({
                where,
                include: {
                    service: {
                        include: {
                            category: true,
                            freelancer: {
                                select: {
                                    id: true,
                                    name: true,
                                    profileImage: true,
                                    bio: true
                                }
                            }
                        }
                    },
                    review: {
                        select: {
                            id: true,
                            rating: true,
                            comment: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                }
            });

            res.json(orders);

        } catch (error) {
            console.error("GET ORDERS ERROR:", error);

            res.status(500).json({
                message: "Gagal mengambil order",
                error: error.message
            });
        }
    }
);


// GET ORDERS MILIK FREELANCER
app.get(
    "/api/freelancer/orders",
    authenticateToken,
    authorizeRole("freelancer"),
    async (req, res) => {
        try {
            const orders = await db.order.findMany({
                where: {
                    service: {
                        freelancerId: req.user.userId
                    }
                },
                include: {
                    service: {
                        include: {
                            category: true
                        }
                    },
                    client: {
                        select: {
                            id: true,
                            name: true,
                            profileImage: true,
                            bio: true
                        }
                    },
                    review: {
                        select: {
                            id: true,
                            rating: true,
                            comment: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                }
            });

            res.json(orders);

        } catch (error) {
            console.error(
                "GET FREELANCER ORDERS ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal mengambil order freelancer",
                error: error.message
            });
        }
    }
);



 // UPDATE STATUS ORDER
app.put(
    "/api/freelancer/orders/:id/status",
    authenticateToken,
    authorizeRole("FREELANCER"),
    async (req, res) => {
        try {
            const orderId = Number(req.params.id);
            const userId = Number(req.user.userId);
            const normalizedStatus = req.body.status?.toUpperCase();

            if (!Number.isInteger(orderId) || orderId <= 0) {
                return res.status(400).json({
                    message: "ID order tidak valid"
                });
            }

            // Freelancer hanya boleh menerima atau menolak order,
            // lalu memulai pekerjaan. Penyelesaian dilakukan client.
            const allowedStatus = [
                "IN_PROGRESS",
                "CANCELLED"
            ];

            if (!allowedStatus.includes(normalizedStatus)) {
                return res.status(400).json({
                    message:
                        "Status tidak diizinkan. Freelancer hanya dapat menerima atau membatalkan order sesuai aturan."
                });
            }

            const order = await db.order.findUnique({
                where: { id: orderId },
                include: { service: true }
            });

            if (!order) {
                return res.status(404).json({
                    message: "Order tidak ditemukan"
                });
            }

            if (order.service.freelancerId !== userId) {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses ke order ini"
                });
            }

            // Validasi transisi status
            const validTransition =
                (order.status === "PENDING" &&
                    ["IN_PROGRESS", "CANCELLED"].includes(normalizedStatus)) ||
                (order.status === "IN_PROGRESS" &&
                    normalizedStatus === "CANCELLED");

            if (!validTransition) {
                return res.status(400).json({
                    message:
                        `Status tidak dapat diubah dari ${order.status} menjadi ${normalizedStatus}`
                });
            }

            const updatedOrder = await db.order.update({
                where: { id: orderId },
                data: { status: normalizedStatus },
                include: { service: true }
            });

            // Notifikasi ke client jika status berubah
            try {
                await db.notification.create({
                    data: {
                        userId: order.clientId,
                        title: "Status Pesanan Diperbarui",
                        message:
                            `Pesanan "${order.service.title}" berubah menjadi ${normalizedStatus.replaceAll("_", " ").toLowerCase()}.`,
                        type: "ORDER_STATUS"
                    }
                });
            } catch (notificationError) {
                console.error(
                    "ORDER STATUS NOTIFICATION ERROR:",
                    notificationError
                );
            }

            return res.json({
                message: "Status order berhasil diubah",
                order: updatedOrder
            });
        } catch (error) {
            console.error("UPDATE ORDER STATUS ERROR:", error);

            return res.status(500).json({
                message: "Gagal mengubah status order"
            });
        }
    }
);


// CREATE ORDER
app.post(
    "/api/orders",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const serviceId =
                parseInt(
                    req.body.serviceId,
                    10
                );

            if (isNaN(serviceId)) {
                return res.status(400).json({
                    message:
                        "Service ID wajib diisi"
                });
            }

           
const service = await db.service.findUnique({
    where: {
        id: serviceId
    },
    include: {
        freelancer: {
            select: {
                id: true
            }
        }
    }
});

if (!service) {
    return res.status(404).json({
        message: "Jasa tidak ditemukan"
    });
}

            if (!service) {
                return res.status(404).json({
                    message:
                        "Jasa tidak ditemukan"
                });
            }

            const order =
                await db.order.create({
                    data: {
                        clientId:
                            req.user.userId,
                        serviceId:
                            service.id,
                        totalPrice:
                            service.price,
                        status: "PENDING"
                    },
                    include: {
                        service: {
                            include: {
                                category: true,
                                freelancer: {
                                    select: {
                                        id: true,
                                        name: true,
                                        profileImage: true,
                                        bio: true
                                    }
                                }
                            }
                        }
                    }
                });

                // Beri tahu freelancer tentang pesanan baru
try {
    await db.notification.create({
        data: {
            userId: service.freelancerId,
            title: "Pesanan Baru",
            message: `Ada pesanan baru untuk jasa "${service.title}".`,
            type: "NEW_ORDER"
        }
    });
} catch (notificationError) {
    console.error(
        "CREATE ORDER NOTIFICATION ERROR:",
        notificationError
    );
}

            res.status(201).json({
                message:
                    "Order berhasil dibuat",
                order
            });

        } catch (error) {
            console.error(
                "CREATE ORDER ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal membuat order",
                error: error.message
            });
        }
    }
);


// =========================
// DELIVERY / SERAH TERIMA
// =========================

app.post(
    "/api/orders/:orderId/delivery",
    authenticateToken,
    authorizeRole("freelancer"),
    async (req, res) => {
        try {
            const orderId = parseInt(req.params.orderId, 10);
            const { fileUrl, fileName, note } = req.body;

            if (isNaN(orderId)) {
                return res.status(400).json({
                    message: "ID order tidak valid"
                });
            }

            if (!fileUrl || !fileName) {
                return res.status(400).json({
                    message: "File URL dan nama file wajib diisi"
                });
            }

            const order = await db.order.findUnique({
                where: {
                    id: orderId
                },
                include: {
                    service: true,
                    delivery: true
                }
            });

            if (!order) {
                return res.status(404).json({
                    message: "Order tidak ditemukan"
                });
            }

            if (
                order.service.freelancerId !==
                req.user.userId
            ) {
                return res.status(403).json({
                    message:
                        "Anda bukan freelancer dari order ini"
                });
            }

            if (order.status !== "IN_PROGRESS") {
                return res.status(400).json({
                    message:
                        "Order harus berstatus IN_PROGRESS sebelum hasil pekerjaan dikirim"
                });
            }

            if (order.delivery) {
                return res.status(409).json({
                    message:
                        "Hasil pekerjaan untuk order ini sudah dikirim"
                });
            }

            const delivery = await db.delivery.create({
                data: {
                    orderId,
                    fileUrl,
                    fileName,
                    note: note || null
                }
            });

            const updatedOrder = await db.order.update({
                where: {
                    id: orderId
                },
                data: {
                    status: "DELIVERED"
                }
            });

            // Beri tahu client bahwa hasil pekerjaan sudah dikirim
try {
    await db.notification.create({
        data: {
            userId: order.clientId,
            title: "Hasil Pekerjaan Terkirim",
            message: `Freelancer telah mengirim hasil pekerjaan untuk pesanan "${order.service.title}".`,
            type: "DELIVERY_SENT"
        }
    });
} catch (notificationError) {
    console.error(
        "DELIVERY NOTIFICATION ERROR:",
        notificationError
    );
}

            res.status(201).json({
                message:
                    "Hasil pekerjaan berhasil dikirim",
                delivery,
                order: updatedOrder
            });

        } catch (error) {
            console.error(
                "CREATE DELIVERY ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal mengirim hasil pekerjaan",
                error: error.message
            });
        }
    }
);


// =========================
// GET DELIVERY
// =========================

app.get(
    "/api/orders/:orderId/delivery",
    authenticateToken,
    async (req, res) => {
        try {
            const orderId = parseInt(
                req.params.orderId,
                10
            );

            if (isNaN(orderId)) {
                return res.status(400).json({
                    message: "ID order tidak valid"
                });
            }

            const order = await db.order.findUnique({
                where: {
                    id: orderId
                },
                include: {
                    service: true
                }
            });

            if (!order) {
                return res.status(404).json({
                    message: "Order tidak ditemukan"
                });
            }

            const role = req.user.role?.toUpperCase();

            if (role === "CLIENT") {

                if (
                    order.clientId !==
                    req.user.userId
                ) {
                    return res.status(403).json({
                        message:
                            "Anda tidak memiliki akses ke order ini"
                    });
                }

            } else if (role === "FREELANCER") {

                if (
                    order.service.freelancerId !==
                    req.user.userId
                ) {
                    return res.status(403).json({
                        message:
                            "Anda tidak memiliki akses ke order ini"
                    });
                }

            } else {
                return res.status(403).json({
                    message: "Akses ditolak"
                });
            }

            const delivery =
                await db.delivery.findUnique({
                    where: {
                        orderId
                    }
                });

            if (!delivery) {
                return res.status(404).json({
                    message:
                        "Hasil pekerjaan belum dikirim"
                });
            }

            res.json(delivery);

        } catch (error) {
            console.error(
                "GET DELIVERY ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal mengambil hasil pekerjaan",
                error: error.message
            });
        }
    }
);


// =========================
// COMPLETE ORDER
// =========================


app.put(
    "/api/orders/:orderId/complete",
    authenticateToken,
    async (req, res) => {
        try {
            const orderId = Number(req.params.orderId);
            const userId = Number(req.user.userId);

            if (!Number.isInteger(orderId) || orderId <= 0) {
                return res.status(400).json({
                    message: "ID order tidak valid"
                });
            }

            const order = await db.order.findUnique({
                where: { id: orderId },
                include: {
                    delivery: true
                }
            });

            if (!order) {
                return res.status(404).json({
                    message: "Order tidak ditemukan"
                });
            }

            if (order.clientId !== userId) {
                return res.status(403).json({
                    message: "Hanya client pemilik order yang dapat mengonfirmasi"
                });
            }

            if (order.status !== "DELIVERED") {
                return res.status(400).json({
                    message: "Order harus berstatus DELIVERED sebelum dikonfirmasi"
                });
            }

            if (!order.delivery) {
                return res.status(400).json({
                    message: "Hasil pekerjaan belum dikirim"
                });
            }

            const updatedOrder = await db.order.update({
                where: { id: orderId },
                data: { status: "COMPLETED" }
            });

            return res.json({
                message: "Pekerjaan berhasil dikonfirmasi selesai",
                data: updatedOrder
            });
        } catch (error) {
            console.error("COMPLETE ORDER ERROR:", error);
            return res.status(500).json({
                message: "Gagal mengonfirmasi penyelesaian order"
            });
        }
    }
);

// =========================
// REVIEW & RATING
// =========================

// CREATE REVIEW
app.post(
    "/api/reviews",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const {
                orderId,
                rating,
                comment
            } = req.body;

            const parsedOrderId = parseInt(orderId, 10);
            const parsedRating = parseInt(rating, 10);

            if (isNaN(parsedOrderId) || isNaN(parsedRating)) {
                return res.status(400).json({
                    message:
                        "Order ID dan rating wajib diisi dan harus berupa angka"
                });
            }

            if (
                parsedRating < 1 ||
                parsedRating > 5
            ) {
                return res.status(400).json({
                    message:
                        "Rating harus antara 1 sampai 5"
                });
            }

            // Cari order milik client yang sedang login
            const order = await db.order.findUnique({
                where: {
                    id: parsedOrderId
                },
                include: {
                    review: true
                }
            });

            if (!order) {
                return res.status(404).json({
                    message:
                        "Order tidak ditemukan"
                });
            }

            // Pastikan order milik client
            if (
                order.clientId !==
                req.user.userId
            ) {
                return res.status(403).json({
                    message:
                        "Anda tidak memiliki akses ke order ini"
                });
            }

            // Order harus sudah selesai
            if (
                order.status !==
                "COMPLETED"
            ) {
                return res.status(400).json({
                    message:
                        "Order belum selesai, belum bisa memberikan review"
                });
            }

            // Cek apakah sudah pernah direview
            if (order.review) {
                return res.status(409).json({
                    message:
                        "Order ini sudah diberikan review"
                });
            }

            // Buat review
            const review = await db.review.create({
                data: {
                    rating: parsedRating,
                    comment: comment || null,
                    userId: req.user.userId,
                    serviceId: order.serviceId,
                    orderId: order.id
                }
            });

            // Ambil semua review service
            const reviews =
                await db.review.findMany({
                    where: {
                        serviceId:
                            order.serviceId
                    },
                    select: {
                        rating: true
                    }
                });

            // Hitung rata-rata rating
            const totalRating =
                reviews.reduce(
                    (total, item) =>
                        total + item.rating,
                    0
                );

            const averageRating =
                reviews.length > 0
                    ? totalRating /
                      reviews.length
                    : 0;

            // Update rating service
            await db.service.update({
                where: {
                    id: order.serviceId
                },
                data: {
                    rating: averageRating
                }
            });

            res.status(201).json({
                message:
                    "Review berhasil dibuat",
                review,
                serviceRating:
                    averageRating
            });

        } catch (error) {
            console.error(
                "CREATE REVIEW ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal membuat review",
                error: error.message
            });
        }
    }
);


// GET REVIEWS SERVICE
app.get(
    "/api/services/:id/reviews",
    async (req, res) => {
        try {
            const serviceId =
                parseInt(
                    req.params.id,
                    10
                );

            if (isNaN(serviceId)) {
                return res.status(400).json({
                    message:
                        "Service ID tidak valid"
                });
            }

            const reviews =
                await db.review.findMany({
                    where: {
                        serviceId
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                profileImage: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: "desc"
                    }
                });

            res.json(reviews);

        } catch (error) {
            console.error(
                "GET REVIEWS ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal mengambil review",
                error: error.message
            });
        }
    }
);

app.post(
    "/api/favorites/:serviceId",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const serviceId = parseInt(req.params.serviceId);

            // Cek service
            const service = await db.orm.public.Service
                .where({ id: serviceId })
                .first();

            if (!service) {
                return res.status(404).json({
                    message: "Service tidak ditemukan"
                });
            }

            // Cek apakah sudah di-favorite
            const existingFavorite = await db.orm.public.Favorite
                .where({
                    clientId: req.user.userId,
                    serviceId
                })
                .first();

            if (existingFavorite) {
                return res.status(409).json({
                    message: "Service sudah ada di favorite"
                });
            }

            const favorite = await db.orm.public.Favorite.create({
                clientId: req.user.userId,
                serviceId
            });

            res.status(201).json({
                message: "Service berhasil ditambahkan ke favorite",
                favorite
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal menambahkan favorite",
                error: error.message
            });
        }
    }
);

// =========================
// CHAT / MESSAGING
// =========================

// CREATE CONVERSATION
app.post(
    "/api/conversations",
    authenticateToken,
    async (req, res) => {
        try {
            const clientId = req.user.userId;
            const freelancerId = parseInt(
                req.body.freelancerId,
                10
            );

            if (isNaN(freelancerId)) {
                return res.status(400).json({
                    message:
                        "Freelancer ID wajib diisi dan harus berupa angka"
                });
            }

            // Pastikan freelancer ada
            const freelancer = await db.user.findFirst({
                where: {
                    id: freelancerId,
                    role: "FREELANCER"
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    profileImage: true
                }
            });

            if (!freelancer) {
                return res.status(404).json({
                    message:
                        "Freelancer tidak ditemukan"
                });
            }

            // Cari conversation yang sudah ada
            const existingConversation =
                await db.conversation.findFirst({
                    where: {
                        AND: [
                            {
                                participants: {
                                    some: {
                                        userId: clientId
                                    }
                                }
                            },
                            {
                                participants: {
                                    some: {
                                        userId: freelancerId
                                    }
                                }
                            }
                        ]
                    },
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        role: true,
                                        profileImage: true
                                    }
                                }
                            }
                        }
                    }
                });

            if (existingConversation) {
                return res.json({
                    message:
                        "Conversation sudah ada",
                    conversation:
                        existingConversation
                });
            }

            // Buat conversation baru
            const conversation =
                await db.conversation.create({
                    data: {
                        participants: {
                            create: [
                                {
                                    userId: clientId
                                },
                                {
                                    userId: freelancerId
                                }
                            ]
                        }
                    },
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        role: true,
                                        profileImage: true
                                    }
                                }
                            }
                        }
                    }
                });

            res.status(201).json({
                message:
                    "Conversation berhasil dibuat",
                conversation
            });

        } catch (error) {
            console.error(
                "CREATE CONVERSATION ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal membuat conversation",
                error: error.message
            });
        }
    }
);


// GET SEMUA CONVERSATION USER
app.get(
    "/api/conversations",
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user.userId;

            const participations =
                await db.conversationParticipant.findMany({
                    where: {
                        userId
                    },
                    include: {
                        conversation: {
                            include: {
                                participants: {
                                    include: {
                                        user: {
                                            select: {
                                                id: true,
                                                name: true,
                                                email: true,
                                                role: true,
                                                profileImage: true
                                            }
                                        }
                                    }
                                },
                                messages: {
                                    orderBy: {
                                        createdAt:
                                            "desc"
                                    },
                                    take: 1
                                }
                            }
                        }
                    }
                });

            const conversations =
                participations
                    .map(item => ({
                        id:
                            item.conversation.id,
                        createdAt:
                            item.conversation
                                .createdAt,
                        updatedAt:
                            item.conversation
                                .updatedAt,
                        participants:
                            item.conversation
                                .participants
                                .map(
                                    participant =>
                                        participant.user
                                ),
                        lastMessage:
                            item.conversation
                                .messages[0] ||
                            null
                    }))
                    .sort(
                        (a, b) =>
                            new Date(
                                b.updatedAt
                            ) -
                            new Date(
                                a.updatedAt
                            )
                    );

            res.json(conversations);

        } catch (error) {
            console.error(
                "GET CONVERSATIONS ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal mengambil conversation",
                error: error.message
            });
        }
    }
);


// GET DETAIL CONVERSATION
app.get(
    "/api/conversations/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const conversationId =
                parseInt(
                    req.params.id,
                    10
                );

            if (isNaN(conversationId)) {
                return res.status(400).json({
                    message:
                        "Conversation ID tidak valid"
                });
            }

            // Pastikan user participant
            const participant =
                await db.conversationParticipant.findUnique({
                    where: {
                        userId_conversationId: {
                            userId:
                                req.user.userId,
                            conversationId
                        }
                    }
                });

            if (!participant) {
                return res.status(403).json({
                    message:
                        "Anda tidak memiliki akses ke conversation ini"
                });
            }

            const conversation =
                await db.conversation.findUnique({
                    where: {
                        id: conversationId
                    },
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        role: true,
                                        profileImage: true
                                    }
                                }
                            }
                        }
                    }
                });

            if (!conversation) {
                return res.status(404).json({
                    message:
                        "Conversation tidak ditemukan"
                });
            }

            res.json(conversation);

        } catch (error) {
            console.error(
                "GET CONVERSATION ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal mengambil conversation",
                error: error.message
            });
        }
    }
);


// SEND MESSAGE
app.post(
    "/api/conversations/:id/messages",
    authenticateToken,
    async (req, res) => {
        try {
            const conversationId =
                parseInt(
                    req.params.id,
                    10
                );

            const content =
                req.body.content?.trim();

            if (isNaN(conversationId)) {
                return res.status(400).json({
                    message:
                        "Conversation ID tidak valid"
                });
            }

            if (!content) {
                return res.status(400).json({
                    message:
                        "Pesan tidak boleh kosong"
                });
            }

            // Pastikan user participant
            const participant =
                await db.conversationParticipant.findUnique({
                    where: {
                        userId_conversationId: {
                            userId:
                                req.user.userId,
                            conversationId
                        }
                    }
                });

            if (!participant) {
                return res.status(403).json({
                    message:
                        "Anda tidak memiliki akses ke conversation ini"
                });
            }

            const message =
                await db.message.create({
                    data: {
                        conversationId,
                        senderId:
                            req.user.userId,
                        content
                    },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                                profileImage: true
                            }
                        }
                    }
                });

            // Update waktu conversation
            await db.conversation.update({
                where: {
                    id: conversationId
                },
                data: {
                    updatedAt: new Date()
                }
            });

            res.status(201).json({
                message:
                    "Pesan berhasil dikirim",
                data: message
            });

        } catch (error) {
            console.error(
                "SEND MESSAGE ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal mengirim pesan",
                error: error.message
            });
        }
    }
);


// GET MESSAGES
app.get(
    "/api/conversations/:id/messages",
    authenticateToken,
    async (req, res) => {
        try {
            const conversationId =
                parseInt(
                    req.params.id,
                    10
                );

            if (isNaN(conversationId)) {
                return res.status(400).json({
                    message:
                        "Conversation ID tidak valid"
                });
            }

            // Pastikan user participant
            const participant =
                await db.conversationParticipant.findUnique({
                    where: {
                        userId_conversationId: {
                            userId:
                                req.user.userId,
                            conversationId
                        }
                    }
                });

            if (!participant) {
                return res.status(403).json({
                    message:
                        "Anda tidak memiliki akses ke conversation ini"
                });
            }

            const messages =
                await db.message.findMany({
                    where: {
                        conversationId
                    },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                                profileImage: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: "asc"
                    }
                });

            res.json(messages);

        } catch (error) {
            console.error(
                "GET MESSAGES ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal mengambil pesan",
                error: error.message
            });
        }
    }
);

// =========================
// JWT MIDDLEWARE
// =========================

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Token tidak ditemukan"
        });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET,
        (error, user) => {
            if (error) {
                return res.status(403).json({
                    message: "Token tidak valid atau sudah expired"
                });
            }

            req.user = user;

            next();
        }
    );
}

function authorizeRole(role) {
    return (req, res, next) => {
        const userRole = req.user.role?.toUpperCase();
        const requiredRole = role?.toUpperCase();

        if (userRole !== requiredRole) {
            return res.status(403).json({
                message: "Anda tidak memiliki akses"
            });
        }

        next();
    };
}

// =========================
// NOTIFICATIONS
// =========================

// GET semua notifikasi milik user
app.get(
    "/api/notifications",
    authenticateToken,
    async (req, res) => {
        try {
            const notifications = await db.notification.findMany({
                where: {
                    userId: req.user.userId
                },
                orderBy: {
                    createdAt: "desc"
                },
                take: 50
            });

            res.json({
                data: notifications
            });
        } catch (error) {
            console.error("GET NOTIFICATIONS ERROR:", error);

            res.status(500).json({
                message: "Gagal mengambil notifikasi"
            });
        }
    }
);

// GET jumlah notifikasi belum dibaca
app.get(
    "/api/notifications/unread-count",
    authenticateToken,
    async (req, res) => {
        try {
            const count = await db.notification.count({
                where: {
                    userId: req.user.userId,
                    isRead: false
                }
            });

            res.json({ count });
        } catch (error) {
            console.error("UNREAD COUNT ERROR:", error);

            res.status(500).json({
                message: "Gagal menghitung notifikasi"
            });
        }
    }
);

// TANDAI SATU NOTIFIKASI SUDAH DIBACA
app.put(
    "/api/notifications/:id/read",
    authenticateToken,
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: "ID notifikasi tidak valid"
                });
            }

            const notification = await db.notification.findFirst({
                where: {
                    id,
                    userId: req.user.userId
                }
            });

            if (!notification) {
                return res.status(404).json({
                    message: "Notifikasi tidak ditemukan"
                });
            }

            const updated = await db.notification.update({
                where: { id },
                data: { isRead: true }
            });

            res.json({
                message: "Notifikasi ditandai sudah dibaca",
                data: updated
            });
        } catch (error) {
            console.error("READ NOTIFICATION ERROR:", error);

            res.status(500).json({
                message: "Gagal memperbarui notifikasi"
            });
        }
    }
);

// TANDAI SEMUA NOTIFIKASI SUDAH DIBACA
app.put(
    "/api/notifications/read-all",
    authenticateToken,
    async (req, res) => {
        try {
            const result = await db.notification.updateMany({
                where: {
                    userId: req.user.userId,
                    isRead: false
                },
                data: {
                    isRead: true
                }
            });

            res.json({
                message: "Semua notifikasi ditandai sudah dibaca",
                updatedCount: result.count
            });
        } catch (error) {
            console.error("READ ALL NOTIFICATIONS ERROR:", error);

            res.status(500).json({
                message: "Gagal memperbarui notifikasi"
            });
        }
    }
);

// =========================
// PROFILE
// =========================

app.get(
    "/api/profile",
    authenticateToken,
    async (req, res) => {
        try {
            const user = await db.user.findUnique({
                where: {
                    id: req.user.userId
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    profileImage: true,
                    bio: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            if (!user) {
                return res.status(404).json({
                    message: "User tidak ditemukan"
                });
            }

            res.json(user);

        } catch (error) {
            console.error(
                "GET PROFILE ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal mengambil profile",
                error: error.message
            });
        }
    }
);

// UPDATE PROFILE
app.put(
    "/api/profile",
    authenticateToken,
    async (req, res) => {
        try {
            const {
                name,
                bio,
                profileImage
            } = req.body;

            if (!name) {
                return res.status(400).json({
                    message: "Nama wajib diisi"
                });
            }

            const updatedUser =
                await db.user.update({
                    where: {
                        id: req.user.userId
                    },
                    data: {
                        name,
                        bio: bio || null,
                        profileImage:
                            profileImage || null
                    },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        profileImage: true,
                        bio: true,
                        createdAt: true,
                        updatedAt: true
                    }
                });

            res.json({
                message:
                    "Profile berhasil diperbarui",
                user: updatedUser
            });

        } catch (error) {
            console.error(
                "UPDATE PROFILE ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal memperbarui profile",
                error: error.message
            });
        }
    }
);

// =========================
// GET CATEGORIES
// =========================

app.get("/api/categories", async (req, res) => {
    try {
        const categories = await db.category.findMany({
            orderBy: {
                name: "asc"
            }
        });

        res.json({
            data: categories
        });
    } catch (error) {
        console.error(
            "GET /api/categories error:",
            error
        );

        res.status(500).json({
            message: "Gagal mengambil kategori",
            error: error.message
        });
    }
});

// =========================
// ADMIN - USER MANAGEMENT
// =========================

app.get(
    "/api/admin/users",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const users = await db.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    profileImage: true,
                    bio: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy: {
                    createdAt: "desc"
                }
            });

            res.json(users);

        } catch (error) {
            console.error(
                "GET ADMIN USERS ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal mengambil data user",
                error: error.message
            });
        }
    }
);

app.put(
    "/api/admin/users/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const userId = parseInt(req.params.id, 10);
            const { name, email, role, bio, profileImage } = req.body;

            if (isNaN(userId)) {
                return res.status(400).json({
                    message: "User ID tidak valid"
                });
            }

            const existingUser = await db.user.findUnique({
                where: { id: userId }
            });

            if (!existingUser) {
                return res.status(404).json({
                    message: "User tidak ditemukan"
                });
            }

            const normalizedRole = role?.toUpperCase();

            if (
                normalizedRole &&
                !["CLIENT", "FREELANCER", "ADMIN"].includes(normalizedRole)
            ) {
                return res.status(400).json({
                    message: "Role tidak valid"
                });
            }

            const updatedUser = await db.user.update({
                where: { id: userId },
                data: {
                    name: name ?? existingUser.name,
                    email: email ?? existingUser.email,
                    role: normalizedRole ?? existingUser.role,
                    bio: bio ?? existingUser.bio,
                    profileImage: profileImage ?? existingUser.profileImage
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    profileImage: true,
                    bio: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            res.json({
                message: "User berhasil diperbarui",
                user: updatedUser
            });

        } catch (error) {
            console.error(
                "UPDATE ADMIN USER ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal memperbarui user",
                error: error.message
            });
        }
    }
);

app.delete(
    "/api/admin/users/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const userId = parseInt(req.params.id, 10);

            if (isNaN(userId)) {
                return res.status(400).json({
                    message: "User ID tidak valid"
                });
            }

            if (userId === req.user.userId) {
                return res.status(400).json({
                    message: "Admin tidak dapat menghapus akun sendiri"
                });
            }

            const existingUser = await db.user.findUnique({
                where: { id: userId }
            });

            if (!existingUser) {
                return res.status(404).json({
                    message: "User tidak ditemukan"
                });
            }

            await db.user.delete({
                where: { id: userId }
            });

            res.json({
                message: "User berhasil dihapus"
            });

        } catch (error) {
            console.error(
                "DELETE ADMIN USER ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal menghapus user",
                error: error.message
            });
        }
    }
);

// =========================
// ADMIN - SERVICE MANAGEMENT
// =========================

app.get(
    "/api/admin/services",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const services = await db.service.findMany({
                include: {
                    category: true,
                    freelancer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profileImage: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                }
            });

            res.json(services);

        } catch (error) {
            console.error(
                "GET ADMIN SERVICES ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal mengambil data jasa",
                error: error.message
            });
        }
    }
);

// DELETE SERVICE BY ADMIN
app.delete(
    "/api/admin/services/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const serviceId = parseInt(req.params.id, 10);

            if (isNaN(serviceId)) {
                return res.status(400).json({
                    message: "Service ID tidak valid"
                });
            }

            const service = await db.service.findUnique({
                where: {
                    id: serviceId
                }
            });

            if (!service) {
                return res.status(404).json({
                    message: "Jasa tidak ditemukan"
                });
            }

            await db.service.delete({
                where: {
                    id: serviceId
                }
            });

            res.json({
                message: "Jasa berhasil dihapus oleh admin"
            });

        } catch (error) {
            console.error(
                "DELETE ADMIN SERVICE ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal menghapus jasa",
                error: error.message
            });
        }
    }
);

// =========================
// ADMIN - CATEGORY MANAGEMENT
// =========================

app.get(
    "/api/admin/categories",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const categories = await db.category.findMany({
                include: {
                    _count: {
                        select: {
                            services: true
                        }
                    }
                },
                orderBy: {
                    name: "asc"
                }
            });

            res.json(categories);

        } catch (error) {
            console.error(
                "GET ADMIN CATEGORIES ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal mengambil data kategori",
                error: error.message
            });
        }
    }
);

// CREATE CATEGORY
app.post(
    "/api/admin/categories",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const name = req.body.name?.trim();

            if (!name) {
                return res.status(400).json({
                    message: "Nama kategori wajib diisi"
                });
            }

            const existingCategory = await db.category.findUnique({
                where: {
                    name
                }
            });

            if (existingCategory) {
                return res.status(409).json({
                    message: "Kategori sudah ada"
                });
            }

            const category = await db.category.create({
                data: {
                    name
                }
            });

            res.status(201).json({
                message: "Kategori berhasil dibuat",
                category
            });

        } catch (error) {
            console.error(
                "CREATE ADMIN CATEGORY ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal membuat kategori",
                error: error.message
            });
        }
    }
);

// UPDATE CATEGORY
app.put(
    "/api/admin/categories/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const categoryId = parseInt(req.params.id, 10);
            const name = req.body.name?.trim();

            if (isNaN(categoryId)) {
                return res.status(400).json({
                    message: "Category ID tidak valid"
                });
            }

            if (!name) {
                return res.status(400).json({
                    message: "Nama kategori wajib diisi"
                });
            }

            const existingCategory = await db.category.findUnique({
                where: {
                    id: categoryId
                }
            });

            if (!existingCategory) {
                return res.status(404).json({
                    message: "Kategori tidak ditemukan"
                });
            }

            const duplicateCategory = await db.category.findUnique({
                where: {
                    name
                }
            });

            if (
                duplicateCategory &&
                duplicateCategory.id !== categoryId
            ) {
                return res.status(409).json({
                    message: "Nama kategori sudah digunakan"
                });
            }

            const updatedCategory = await db.category.update({
                where: {
                    id: categoryId
                },
                data: {
                    name
                }
            });

            res.json({
                message: "Kategori berhasil diperbarui",
                category: updatedCategory
            });

        } catch (error) {
            console.error(
                "UPDATE ADMIN CATEGORY ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal memperbarui kategori",
                error: error.message
            });
        }
    }
);

// DELETE CATEGORY
app.delete(
    "/api/admin/categories/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const categoryId = parseInt(req.params.id, 10);

            if (isNaN(categoryId)) {
                return res.status(400).json({
                    message: "Category ID tidak valid"
                });
            }

            const category = await db.category.findUnique({
                where: {
                    id: categoryId
                },
                include: {
                    _count: {
                        select: {
                            services: true
                        }
                    }
                }
            });

            if (!category) {
                return res.status(404).json({
                    message: "Kategori tidak ditemukan"
                });
            }

            if (category._count.services > 0) {
                return res.status(409).json({
                    message: "Kategori tidak dapat dihapus karena masih digunakan oleh jasa"
                });
            }

            await db.category.delete({
                where: {
                    id: categoryId
                }
            });

            res.json({
                message: "Kategori berhasil dihapus"
            });

        } catch (error) {
            console.error(
                "DELETE ADMIN CATEGORY ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal menghapus kategori",
                error: error.message
            });
        }
    }
);

// =========================
// ADMIN - REVIEW MANAGEMENT
// =========================

app.get(
    "/api/admin/reviews",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const reviews = await db.review.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profileImage: true
                        }
                    },
                    service: {
                        select: {
                            id: true,
                            title: true,
                            freelancer: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    },
                    order: {
                        select: {
                            id: true,
                            status: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                }
            });

            res.json(reviews);

        } catch (error) {
            console.error(
                "GET ADMIN REVIEWS ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal mengambil data review",
                error: error.message
            });
        }
    }
);

// DELETE REVIEW BY ADMIN
app.delete(
    "/api/admin/reviews/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const reviewId = parseInt(req.params.id, 10);

            if (isNaN(reviewId)) {
                return res.status(400).json({
                    message: "Review ID tidak valid"
                });
            }

            const review = await db.review.findUnique({
                where: {
                    id: reviewId
                }
            });

            if (!review) {
                return res.status(404).json({
                    message: "Review tidak ditemukan"
                });
            }

            const serviceId = review.serviceId;

            await db.review.delete({
                where: {
                    id: reviewId
                }
            });

            const remainingReviews = await db.review.findMany({
                where: {
                    serviceId
                },
                select: {
                    rating: true
                }
            });

            const totalRating = remainingReviews.reduce(
                (total, item) => total + item.rating,
                0
            );

            const averageRating =
                remainingReviews.length > 0
                    ? totalRating / remainingReviews.length
                    : 0;

            await db.service.update({
                where: {
                    id: serviceId
                },
                data: {
                    rating: averageRating
                }
            });

            res.json({
                message: "Review berhasil dihapus",
                serviceRating: averageRating
            });

        } catch (error) {
            console.error(
                "DELETE ADMIN REVIEW ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal menghapus review",
                error: error.message
            });
        }
    }
);

// =========================
// ADMIN - DASHBOARD
// =========================

app.get(
    "/api/admin/dashboard",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const [
                totalUsers,
                totalClients,
                totalFreelancers,
                totalAdmins,
                totalServices,
                totalOrders,
                totalReviews,
                totalCategories,
                pendingOrders,
                completedOrders,
                cancelledOrders
            ] = await Promise.all([
                db.user.count(),

                db.user.count({
                    where: {
                        role: "CLIENT"
                    }
                }),

                db.user.count({
                    where: {
                        role: "FREELANCER"
                    }
                }),

                db.user.count({
                    where: {
                        role: "ADMIN"
                    }
                }),

                db.service.count(),

                db.order.count(),

                db.review.count(),

                db.category.count(),

                db.order.count({
                    where: {
                        status: "PENDING"
                    }
                }),

                db.order.count({
                    where: {
                        status: "COMPLETED"
                    }
                }),

                db.order.count({
                    where: {
                        status: "CANCELLED"
                    }
                })
            ]);

            res.json({
                users: {
                    total: totalUsers,
                    clients: totalClients,
                    freelancers: totalFreelancers,
                    admins: totalAdmins
                },

                services: {
                    total: totalServices
                },

                orders: {
                    total: totalOrders,
                    pending: pendingOrders,
                    completed: completedOrders,
                    cancelled: cancelledOrders
                },

                reviews: {
                    total: totalReviews
                },

                categories: {
                    total: totalCategories
                }
            });

        } catch (error) {
            console.error(
                "GET ADMIN DASHBOARD ERROR:",
                error
            );

            res.status(500).json({
                message: "Gagal mengambil statistik dashboard",
                error: error.message
            });
        }
    }
);

// =========================
// REGISTER
// =========================

app.post("/api/auth/register", async (req, res) => {
    try {
        const {
            email,
            name,
            password,
            role
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email dan password wajib diisi"
            });
        }

        // Cek apakah email sudah terdaftar
        const existingUser = await db.user.findUnique({
            where: {
                email
            }
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email sudah terdaftar"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Normalisasi role
        const userRole =
            role?.toUpperCase() === "FREELANCER"
                ? "FREELANCER"
                : "CLIENT";

        const user = await db.user.create({
            data: {
                email,
                name: name || "",
                password: hashedPassword,
                role: userRole
            }
        });

        res.status(201).json({
            message: "Register berhasil",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        res.status(500).json({
            message: "Gagal melakukan register",
            error: error.message
        });
    }
});
// =========================
// LOGIN
// =========================

app.post(
    "/api/auth/login",
    loginLimiter,
    async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email dan password wajib diisi"
            });
        }

        // Cari user berdasarkan email
        const user = await db.user.findUnique({
            where: {
                email
            }
        });

        if (!user) {
            return res.status(401).json({
                message: "Email atau password salah"
            });
        }

        // Cek password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Email atau password salah"
            });
        }

        // Buat JWT
        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.json({
            message: "Login berhasil",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            message: "Gagal melakukan login",
            error: error.message
        });
    }
});
// =========================
// GET DELIVERY
// =========================

app.get(
    "/api/orders/:orderId/delivery",
    authenticateToken,
    async (req, res) => {
        try {
            const orderId = parseInt(req.params.orderId);

            const order = await db.orm.public.Order
                .where({
                    id: orderId
                })
                .first();

            if (!order) {
                return res.status(404).json({
                    message: "Order tidak ditemukan"
                });
            }

            // Hanya client pemilik order atau freelancer
            // dari service tersebut yang boleh melihat delivery
            if (req.user.role === "client") {

                if (order.clientId !== req.user.userId) {
                    return res.status(403).json({
                        message: "Anda tidak memiliki akses ke order ini"
                    });
                }

            } else if (req.user.role === "freelancer") {

                const service =
                    await db.orm.public.Service
                        .where({
                            id: order.serviceId
                        })
                        .first();

                if (
                    !service ||
                    service.freelancerId !== req.user.userId
                ) {
                    return res.status(403).json({
                        message: "Anda tidak memiliki akses ke order ini"
                    });
                }

            } else {

                return res.status(403).json({
                    message: "Akses ditolak"
                });

            }

            const delivery =
                await db.orm.public.Delivery
                    .where({
                        orderId
                    })
                    .first();

            if (!delivery) {
                return res.status(404).json({
                    message: "Hasil pekerjaan belum dikirim"
                });
            }

            res.json(delivery);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengambil hasil pekerjaan",
                error: error.message
            });
        }
    }
);

// =========================
// COMPLETE ORDER
// =========================

app.put(
    "/api/orders/:orderId/complete",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const orderId = parseInt(req.params.orderId);

            const order = await db.orm.public.Order
                .where({
                    id: orderId,
                    clientId: req.user.userId
                })
                .first();

            if (!order) {
                return res.status(404).json({
                    message: "Order tidak ditemukan"
                });
            }

            if (order.status !== "delivered") {
                return res.status(400).json({
                    message:
                        "Order belum memiliki hasil pekerjaan"
                });
            }

            const delivery =
                await db.orm.public.Delivery
                    .where({
                        orderId
                    })
                    .first();

            if (!delivery) {
                return res.status(400).json({
                    message:
                        "Hasil pekerjaan belum dikirim"
                });
            }

            const updatedOrder =
                await db.orm.public.Order
                    .where({
                        id: orderId
                    })
                    .update({
                        status: "completed"
                    });

            res.json({
                message:
                    "Hasil pekerjaan berhasil diterima",
                order: updatedOrder
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message:
                    "Gagal menyelesaikan order",
                error: error.message
            });
        }
    }
);

// =========================
// PORTFOLIO
// =========================

// GET PORTFOLIO MILIK FREELANCER
app.get(
    "/api/portfolio",
    authenticateToken,
    authorizeRole("freelancer"),
    async (req, res) => {
        try {
            const portfolios =
                await db.portfolio.findMany({
                    where: {
                        freelancerId:
                            req.user.userId
                    },
                    orderBy: {
                        createdAt: "desc"
                    }
                });

            res.json(portfolios);

        } catch (error) {
            console.error(
                "GET PORTFOLIO ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal mengambil portfolio",
                error: error.message
            });
        }
    }
);


// CREATE PORTFOLIO
app.post(
    "/api/portfolio",
    authenticateToken,
    authorizeRole("freelancer"),
    async (req, res) => {
        try {
            const {
                title,
                description,
                image,
                link
            } = req.body;

            if (!title) {
                return res.status(400).json({
                    message:
                        "Judul portfolio wajib diisi"
                });
            }

            const portfolio =
                await db.portfolio.create({
                    data: {
                        title,
                        description:
                            description || null,
                        image:
                            image || null,
                        link:
                            link || null,
                        freelancerId:
                            req.user.userId
                    }
                });

            res.status(201).json({
                message:
                    "Portfolio berhasil ditambahkan",
                portfolio
            });

        } catch (error) {
            console.error(
                "CREATE PORTFOLIO ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal menambahkan portfolio",
                error: error.message
            });
        }
    }
);


// UPDATE PORTFOLIO
app.put(
    "/api/portfolio/:id",
    authenticateToken,
    authorizeRole("freelancer"),
    async (req, res) => {
        try {
            const portfolioId =
                parseInt(
                    req.params.id,
                    10
                );

            if (isNaN(portfolioId)) {
                return res.status(400).json({
                    message:
                        "ID portfolio tidak valid"
                });
            }

            const {
                title,
                description,
                image,
                link
            } = req.body;

            if (!title) {
                return res.status(400).json({
                    message:
                        "Judul portfolio wajib diisi"
                });
            }

            const existingPortfolio =
                await db.portfolio.findUnique({
                    where: {
                        id: portfolioId
                    }
                });

            if (!existingPortfolio) {
                return res.status(404).json({
                    message:
                        "Portfolio tidak ditemukan"
                });
            }

            if (
                existingPortfolio.freelancerId !==
                req.user.userId
            ) {
                return res.status(403).json({
                    message:
                        "Anda tidak memiliki akses ke portfolio ini"
                });
            }

            const updatedPortfolio =
                await db.portfolio.update({
                    where: {
                        id: portfolioId
                    },
                    data: {
                        title,
                        description:
                            description || null,
                        image:
                            image || null,
                        link:
                            link || null
                    }
                });

            res.json({
                message:
                    "Portfolio berhasil diperbarui",
                portfolio:
                    updatedPortfolio
            });

        } catch (error) {
            console.error(
                "UPDATE PORTFOLIO ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal memperbarui portfolio",
                error: error.message
            });
        }
    }
);


// DELETE PORTFOLIO
app.delete(
    "/api/portfolio/:id",
    authenticateToken,
    authorizeRole("freelancer"),
    async (req, res) => {
        try {
            const portfolioId =
                parseInt(
                    req.params.id,
                    10
                );

            if (isNaN(portfolioId)) {
                return res.status(400).json({
                    message:
                        "ID portfolio tidak valid"
                });
            }

            const existingPortfolio =
                await db.portfolio.findUnique({
                    where: {
                        id: portfolioId
                    }
                });

            if (!existingPortfolio) {
                return res.status(404).json({
                    message:
                        "Portfolio tidak ditemukan"
                });
            }

            if (
                existingPortfolio.freelancerId !==
                req.user.userId
            ) {
                return res.status(403).json({
                    message:
                        "Anda tidak memiliki akses ke portfolio ini"
                });
            }

            await db.portfolio.delete({
                where: {
                    id: portfolioId
                }
            });

            res.json({
                message:
                    "Portfolio berhasil dihapus"
            });

        } catch (error) {
            console.error(
                "DELETE PORTFOLIO ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal menghapus portfolio",
                error: error.message
            });
        }
    }
);


// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 3000;

app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);

    res.status(500).json({
        message: "Terjadi kesalahan pada server"
    });
});


/* =========================
   PAYMENTS
========================= */

// Buat transaksi pembayaran untuk order
app.post(
    "/api/payments",
    authenticateToken,
    async (req, res) => {
        try {
            const orderId = Number(req.body.orderId);
            const userId = Number(req.user.userId);

            if (!Number.isInteger(orderId) || orderId <= 0) {
                return res.status(400).json({
                    message: "ID order tidak valid"
                });
            }

            const order = await db.order.findUnique({
                where: { id: orderId },
                include: { service: true }
            });

            if (!order) {
                return res.status(404).json({
                    message: "Order tidak ditemukan"
                });
            }

            if (order.clientId !== userId) {
                return res.status(403).json({
                    message: "Kamu bukan pemilik order ini"
                });
            }

            if (order.status !== "PENDING") {
                return res.status(400).json({
                    message: "Order tidak lagi menunggu pembayaran"
                });
            }

            if (order.paymentStatus === "PAID") {
                return res.status(400).json({
                    message: "Order ini sudah dibayar"
                });
            }

            const payment = await db.order.update({
                where: { id: orderId },
                data: {
                    paymentStatus: "PENDING"
                },
                select: {
                    id: true,
                    totalPrice: true,
                    paymentStatus: true,
                    paymentReference: true
                }
            });

            return res.status(201).json({
                message:
                    "Transaksi pembayaran disiapkan. Pembayaran belum terverifikasi.",
                data: payment
            });
        } catch (error) {
            console.error("CREATE PAYMENT ERROR:", error);

            return res.status(500).json({
                message: "Gagal menyiapkan transaksi pembayaran"
            });
        }
    }
);

// Cek status pembayaran milik client
app.get(
    "/api/payments/:orderId",
    authenticateToken,
    async (req, res) => {
        try {
            const orderId = Number(req.params.orderId);
            const userId = Number(req.user.userId);

            if (!Number.isInteger(orderId) || orderId <= 0) {
                return res.status(400).json({
                    message: "ID order tidak valid"
                });
            }

            const order = await db.order.findUnique({
                where: { id: orderId },
                select: {
                    id: true,
                    clientId: true,
                    totalPrice: true,
                    paymentStatus: true,
                    paymentReference: true
                }
            });

            if (!order) {
                return res.status(404).json({
                    message: "Order tidak ditemukan"
                });
            }

            if (order.clientId !== userId) {
                return res.status(403).json({
                    message: "Kamu tidak memiliki akses ke pembayaran ini"
                });
            }

            return res.json({
                data: {
                    id: order.id,
                    totalPrice: order.totalPrice,
                    paymentStatus: order.paymentStatus,
                    paymentReference: order.paymentReference
                }
            });
        } catch (error) {
            console.error("GET PAYMENT ERROR:", error);

            return res.status(500).json({
                message: "Gagal mengambil status pembayaran"
            });
        }
    }
);

app.listen(PORT, () => {
    console.log(`SkillMarket API berjalan di port ${PORT}`);
});