import express from "express";
import cors from "cors";
import "dotenv/config"; 
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { db } from "./src/prisma/db.js";

const app = express();

app.use(cors());
app.use(express.json());

await db.connect();


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

        let services = await db.orm.public.Service.all();

        // Search berdasarkan judul, deskripsi, atau kategori
        if (search) {
            const keyword = search.toLowerCase();

            services = services.filter(service =>
                service.title.toLowerCase().includes(keyword) ||
                (service.description &&
                    service.description.toLowerCase().includes(keyword)) ||
                service.category.toLowerCase().includes(keyword)
            );
        }

        // Filter kategori
        if (category) {
            services = services.filter(service =>
                service.category.toLowerCase() === category.toLowerCase()
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
        const currentPage = Math.max(parseInt(page), 1);
        const itemsPerPage = Math.max(parseInt(limit), 1);

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
        console.error(error);

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
        const id = parseInt(req.params.id);

        const service = await db.orm.public.Service
            .where({ id })
            .first();

        if (!service) {
            return res.status(404).json({
                message: "Jasa tidak ditemukan"
            });
        }

        res.json(service);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Gagal mengambil data jasa"
        });
    }
});


// =========================
// CREATE SERVICE
// =========================

app.post(
    "/api/services",
    authenticateToken,
    authorizeRole("freelancer"), async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            price,
        } = req.body;

        const service = await db.orm.public.Service.create({
            title,
            description,
            category,
            price,
            rating: 0,
            freelancerId
        });

        res.status(201).json({
            message: "Jasa berhasil ditambahkan",
            service
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Gagal menambahkan jasa"
        });
    }
});


// =========================
// UPDATE SERVICE
// =========================

app.put(
    "/api/services/:id",
    authenticateToken,
    authorizeRole("freelancer"), async (req, res) => {
    try {
        console.log("PUT BODY:", req.body);
        console.log("PUT ID:", req.params.id);

        const id = parseInt(req.params.id);

        if (!req.body) {
            return res.status(400).json({
                message: "Request body kosong"
            });
        }

        const {
            title,
            description,
            category,
            price,
            rating
        } = req.body;

        const existingService = await db.orm.public.Service
            .where({ id })
            .first();

        if (!existingService) {
            return res.status(404).json({
                message: "Jasa tidak ditemukan"
            });
        }

        const updatedService = await db.orm.public.Service
            .where({ id })
            .update({
                title,
                description,
                category,
                price,
                rating
            });

        res.json({
            message: "Jasa berhasil diperbarui",
            service: updatedService
        });

    } catch (error) {
        console.error("ERROR PUT:", error);

        res.status(500).json({
            message: "Gagal memperbarui jasa",
            error: error.message
        });
    }
});


// =========================
// DELETE SERVICE
// =========================

app.delete("/api/services/:id", authenticateToken, authorizeRole("freelancer"), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const existingService = await db.orm.public.Service
            .where({ id })
            .first();

        if (!existingService) {
            return res.status(404).json({
                message: "Jasa tidak ditemukan"
            });
        }

        const deletedService = await db.orm.public.Service
    .where({ id })
    .delete();

        res.json({
            message: "Jasa berhasil dihapus",
            service: deletedService
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Gagal menghapus jasa"
        });
    }
});

// =========================
// FAVORITES
// =========================

// GET daftar favorite milik client
app.get(
    "/api/favorites",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const favorites = await db.orm.public.Favorite
                .where({
                    clientId: req.user.userId
                })
                .all();

            res.json(favorites);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengambil favorite"
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

            if (!serviceId) {
                return res.status(400).json({
                    message: "Service ID wajib diisi"
                });
            }

            const existingFavorite =
                await db.orm.public.Favorite
                    .where({
                        clientId: req.user.userId,
                        serviceId: parseInt(serviceId)
                    })
                    .first();

            if (existingFavorite) {
                return res.status(409).json({
                    message: "Jasa sudah ada di favorite"
                });
            }

            const favorite =
                await db.orm.public.Favorite.create({
                    clientId: req.user.userId,
                    serviceId: parseInt(serviceId)
                });

            res.status(201).json({
                message: "Jasa berhasil ditambahkan ke favorite",
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


// DELETE favorite
app.delete(
    "/api/favorites/:serviceId",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const serviceId = parseInt(req.params.serviceId);

            const favorite =
                await db.orm.public.Favorite
                    .where({
                        clientId: req.user.userId,
                        serviceId
                    })
                    .first();

            if (!favorite) {
                return res.status(404).json({
                    message: "Favorite tidak ditemukan"
                });
            }

            await db.orm.public.Favorite
                .where({
                    id: favorite.id
                })
                .delete();

            res.json({
                message: "Jasa berhasil dihapus dari favorite"
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal menghapus favorite",
                error: error.message
            });
        }
    }
);

app.get(
    "/api/orders",
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user.userId;
            const role = req.user.role;

            let orders = [];

            // =========================
            // CLIENT
            // =========================
            if (role === "client") {

                orders = await db.orm.public.Order
                    .where({
                        clientId: userId
                    })
                    .all();

            }

            // =========================
            // FREELANCER
            // =========================
            else if (role === "freelancer") {

                const services =
                    await db.orm.public.Service
                        .where({
                            freelancerId: userId
                        })
                        .all();

                const serviceIds =
                    services.map(service => service.id);

                if (serviceIds.length > 0) {

                    for (const serviceId of serviceIds) {

                        const serviceOrders =
                            await db.orm.public.Order
                                .where({
                                    serviceId
                                })
                                .all();

                        orders.push(
                            ...serviceOrders
                        );
                    }
                }
            }

            else {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses"
                });
            }

            // =========================
            // TAMBAHKAN DETAIL
            // =========================

            const ordersWithDetails = [];

            for (const order of orders) {

                const service =
                    await db.orm.public.Service
                        .where({
                            id: order.serviceId
                        })
                        .first();

                let freelancer = null;

                if (service) {

                    freelancer =
                        await db.orm.public.User
                            .where({
                                id: service.freelancerId
                            })
                            .first();
                }

                let review = null;

                try {

                    review =
                        await db.orm.public.Review
                            .where({
                                orderId: order.id
                            })
                            .first();

                } catch (reviewError) {

                    console.log(
                        "Review belum tersedia:",
                        reviewError.message
                    );
                }

                ordersWithDetails.push({

                    ...order,

                    service: service
                        ? {
                            id: service.id,
                            title: service.title,
                            description:
                                service.description,
                            category:
                                service.category,
                            price:
                                service.price,
                            rating:
                                service.rating
                        }
                        : null,

                    freelancer: freelancer
                        ? {
                            id: freelancer.id,
                            username:
                                freelancer.username,
                            name:
                                freelancer.name
                        }
                        : null,

                    review: review
                        ? {
                            id: review.id,
                            rating:
                                review.rating,
                            comment:
                                review.comment,
                            createdAt:
                                review.createdAt
                        }
                        : null
                });
            }

            res.json(ordersWithDetails);

        } catch (error) {

            console.error(
                "GET ORDERS ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Gagal mengambil order"
            });
        }
    }
);

app.get(
    "/api/freelancer/orders",
    authenticateToken,
    authorizeRole("freelancer"),
    async (req, res) => {
        try {
            const services = await db.orm.public.Service
                .where({
                    freelancerId: req.user.userId
                })
                .all();

            const orders = [];

            for (const service of services) {
                const serviceOrders = await db.orm.public.Order
                    .where({
                        serviceId: service.id
                    })
                    .all();

                orders.push(...serviceOrders);
            }

            res.json(orders);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengambil order freelancer"
            });
        }
    }
);

app.put(
    "/api/freelancer/orders/:id/status",
    authenticateToken,
    authorizeRole("freelancer"),
    async (req, res) => {
        try {
            const orderId = parseInt(req.params.id);
            const { status } = req.body;

            const allowedStatus = [
                "pending",
                "processing",
                "completed",
                "cancelled"
            ];

            if (!allowedStatus.includes(status)) {
                return res.status(400).json({
                    message: "Status order tidak valid"
                });
            }

            const order = await db.orm.public.Order
                .where({ id: orderId })
                .first();

            if (!order) {
                return res.status(404).json({
                    message: "Order tidak ditemukan"
                });
            }

            const service = await db.orm.public.Service
                .where({
                    id: order.serviceId,
                    freelancerId: req.user.userId
                })
                .first();

            if (!service) {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses ke order ini"
                });
            }

            const updatedOrder = await db.orm.public.Order
                .where({ id: orderId })
                .update({
                    status
                });

            res.json({
                message: "Status order berhasil diubah",
                order: updatedOrder
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengubah status order",
                error: error.message
            });
        }
    }
);

// ======================================================
// CREATE ORDER
// ======================================================

app.post(
    "/api/orders",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const { serviceId } = req.body;

            if (!serviceId) {
                return res.status(400).json({
                    message: "Service ID wajib diisi"
                });
            }

            const service =
                await db.orm.public.Service
                    .where({
                        id: parseInt(serviceId)
                    })
                    .first();

            if (!service) {
                return res.status(404).json({
                    message: "Jasa tidak ditemukan"
                });
            }

            const order =
                await db.orm.public.Order.create({
                    clientId: req.user.userId,
                    serviceId: service.id,
                    totalPrice: service.price,
                    status: "pending"
                });

            res.status(201).json({
                message: "Order berhasil dibuat",
                order
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal membuat order",
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
            const orderId = parseInt(req.params.orderId);
            const { fileUrl, fileName, note } = req.body;

            if (!fileUrl || !fileName) {
                return res.status(400).json({
                    message: "File URL dan nama file wajib diisi"
                });
            }

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

            const service = await db.orm.public.Service
                .where({
                    id: order.serviceId
                })
                .first();

            if (!service) {
                return res.status(404).json({
                    message: "Service tidak ditemukan"
                });
            }

            if (
                service.freelancerId !==
                req.user.userId
            ) {
                return res.status(403).json({
                    message: "Anda bukan freelancer dari order ini"
                });
            }

            if (order.status !== "pending") {
    return res.status(400).json({
        message: "Order tidak dapat dikirim pada status ini"
    });
}

            const existingDelivery =
                await db.orm.public.Delivery
                    .where({
                        orderId
                    })
                    .first();

            if (existingDelivery) {
                return res.status(409).json({
                    message:
                        "Hasil pekerjaan untuk order ini sudah dikirim"
                });
            }

            const delivery =
                await db.orm.public.Delivery.create({
                    orderId,
                    fileUrl,
                    fileName,
                    note: note || null
                });

            await db.orm.public.Order
                .where({
                    id: orderId
                })
                .update({
                    status: "delivered"
                });

            res.status(201).json({
                message:
                    "Hasil pekerjaan berhasil dikirim",
                delivery
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message:
                    "Gagal mengirim hasil pekerjaan",
                error: error.message
            });
        }
    }
);

app.post(
    "/api/reviews",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const { orderId, rating, comment } = req.body;

            if (!orderId || !rating) {
                return res.status(400).json({
                    message: "Order ID dan rating wajib diisi"
                });
            }

            if (rating < 1 || rating > 5) {
                return res.status(400).json({
                    message: "Rating harus antara 1 sampai 5"
                });
            }

            // Cari order milik client yang sedang login
            const order = await db.orm.public.Order
                .where({
                    id: parseInt(orderId),
                    clientId: req.user.userId
                })
                .first();

            if (!order) {
                return res.status(404).json({
                    message: "Order tidak ditemukan"
                });
            }

            // Order harus sudah selesai
            if (order.status !== "completed") {
                return res.status(400).json({
                    message: "Order belum selesai, belum bisa memberikan review"
                });
            }

            // Cek apakah order sudah pernah direview
            const existingReview = await db.orm.public.Review
                .where({
                    orderId: parseInt(orderId)
                })
                .first();

            if (existingReview) {
                return res.status(409).json({
                    message: "Order ini sudah diberikan review"
                });
            }

            // Buat review
            const review = await db.orm.public.Review.create({
                rating: parseInt(rating),
                comment: comment || null,
                clientId: req.user.userId,
                serviceId: order.serviceId,
                orderId: parseInt(orderId)
            });

            // Ambil semua review service
            const reviews = await db.orm.public.Review
                .where({
                    serviceId: order.serviceId
                })
                .all();

            // Hitung rata-rata rating
            const totalRating = reviews.reduce(
                (total, item) => total + item.rating,
                0
            );

            const averageRating = totalRating / reviews.length;

            // Update rating service
            await db.orm.public.Service
                .where({
                    id: order.serviceId
                })
                .update({
                    rating: averageRating
                });

            res.status(201).json({
                message: "Review berhasil dibuat",
                review,
                serviceRating: averageRating
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal membuat review",
                error: error.message
            });
        }
    }
);


app.get("/api/services/:id/reviews", async (req, res) => {
    try {
        const serviceId = parseInt(req.params.id);

        const reviews = await db.orm.public.Review
            .where({
                serviceId
            })
            .all();

        res.json(reviews);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Gagal mengambil review",
            error: error.message
        });
    }
});


app.get(
    "/api/favorites",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const favorites = await db.orm.public.Favorite
                .where({
                    clientId: req.user.userId
                })
                .all();

            res.json(favorites);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengambil favorite",
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

app.delete(
    "/api/favorites/:serviceId",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const serviceId = parseInt(req.params.serviceId);

            const favorite = await db.orm.public.Favorite
                .where({
                    clientId: req.user.userId,
                    serviceId
                })
                .first();

            if (!favorite) {
                return res.status(404).json({
                    message: "Favorite tidak ditemukan"
                });
            }

            await db.orm.public.Favorite
                .where({
                    id: favorite.id
                })
                .delete();

            res.json({
                message: "Favorite berhasil dihapus"
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal menghapus favorite",
                error: error.message
            });
        }
    }
);

app.post(
    "/api/conversations",
    authenticateToken,
    authorizeRole("client"),
    async (req, res) => {
        try {
            const { freelancerId } = req.body;

            if (!freelancerId) {
                return res.status(400).json({
                    message: "Freelancer ID wajib diisi"
                });
            }

            const freelancer = await db.orm.public.User
                .where({
                    id: parseInt(freelancerId),
                    role: "freelancer"
                })
                .first();

            if (!freelancer) {
                return res.status(404).json({
                    message: "Freelancer tidak ditemukan"
                });
            }

            const existingConversation =
                await db.orm.public.Conversation
                    .where({
                        clientId: req.user.userId,
                        freelancerId: parseInt(freelancerId)
                    })
                    .first();

            if (existingConversation) {
                return res.json({
                    message: "Conversation sudah ada",
                    conversation: existingConversation
                });
            }

            const conversation =
                await db.orm.public.Conversation.create({
                    clientId: req.user.userId,
                    freelancerId: parseInt(freelancerId)
                });

            res.status(201).json({
                message: "Conversation berhasil dibuat",
                conversation
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal membuat conversation",
                error: error.message
            });
        }
    }
);

app.get(
    "/api/conversations",
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user.userId;
            const role = req.user.role;

            let conversations;

            if (role === "client") {
                conversations =
                    await db.orm.public.Conversation
                        .where({
                            clientId: userId
                        })
                        .all();

            } else if (role === "freelancer") {
                conversations =
                    await db.orm.public.Conversation
                        .where({
                            freelancerId: userId
                        })
                        .all();

            } else {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses"
                });
            }

            res.json(conversations);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengambil conversation",
                error: error.message
            });
        }
    }
);

app.get(
    "/api/conversations/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const conversationId = parseInt(req.params.id);

            const conversation =
                await db.orm.public.Conversation
                    .where({
                        id: conversationId
                    })
                    .first();

            if (!conversation) {
                return res.status(404).json({
                    message: "Conversation tidak ditemukan"
                });
            }

            if (
                conversation.clientId !== req.user.userId &&
                conversation.freelancerId !== req.user.userId
            ) {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses"
                });
            }

            res.json(conversation);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengambil conversation",
                error: error.message
            });
        }
    }
);

app.post(
    "/api/conversations/:id/messages",
    authenticateToken,
    async (req, res) => {
        try {
            const conversationId = parseInt(req.params.id);
            const { content } = req.body;

            if (!content || !content.trim()) {
                return res.status(400).json({
                    message: "Pesan tidak boleh kosong"
                });
            }

            const conversation =
                await db.orm.public.Conversation
                    .where({
                        id: conversationId
                    })
                    .first();

            if (!conversation) {
                return res.status(404).json({
                    message: "Conversation tidak ditemukan"
                });
            }

            // Pastikan user adalah bagian dari conversation
            if (
                conversation.clientId !== req.user.userId &&
                conversation.freelancerId !== req.user.userId
            ) {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses ke conversation ini"
                });
            }

            const message =
                await db.orm.public.Message.create({
                    conversationId,
                    senderId: req.user.userId,
                    content: content.trim()
                });

            res.status(201).json({
                message: "Pesan berhasil dikirim",
                data: message
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengirim pesan",
                error: error.message
            });
        }
    }
);

app.get(
    "/api/conversations/:id/messages",
    authenticateToken,
    async (req, res) => {
        try {
            const conversationId = parseInt(req.params.id);

            const conversation =
                await db.orm.public.Conversation
                    .where({
                        id: conversationId
                    })
                    .first();

            if (!conversation) {
                return res.status(404).json({
                    message: "Conversation tidak ditemukan"
                });
            }

            // Pastikan user adalah bagian dari conversation
            if (
                conversation.clientId !== req.user.userId &&
                conversation.freelancerId !== req.user.userId
            ) {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses"
                });
            }

            const messages =
                await db.orm.public.Message
                    .where({
                        conversationId
                    })
                    .all();

            res.json(messages);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengambil pesan",
                error: error.message
            });
        }
    }
);

app.get("/api/services/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const service = await db.service.findUnique({
            where: {
                id: id
            },
            include: {
                freelancer: true
            }
        });

        if (!service) {
            return res.status(404).json({
                message: "Jasa tidak ditemukan"
            });
        }

        res.json(service);

    } catch (error) {
        console.error("Get service detail error:", error);

        res.status(500).json({
            message: "Gagal mengambil detail jasa"
        });
    }
});

app.post(
    "/api/conversations",
    authenticateToken,
    async (req, res) => {
        try {
            const { freelancerId } = req.body;

            if (!freelancerId) {
                return res.status(400).json({
                    message: "Freelancer ID wajib diisi"
                });
            }

            const freelancer =
                await db.orm.public.User
                    .where({
                        id: parseInt(freelancerId),
                        role: "freelancer"
                    })
                    .first();

            if (!freelancer) {
                return res.status(404).json({
                    message: "Freelancer tidak ditemukan"
                });
            }

            const clientId = req.user.userId;

            let conversation =
                await db.orm.public.Conversation
                    .where({
                        clientId,
                        freelancerId: parseInt(freelancerId)
                    })
                    .first();

            if (conversation) {
                return res.json({
                    message: "Conversation sudah ada",
                    conversation
                });
            }

            conversation =
                await db.orm.public.Conversation.create({
                    clientId,
                    freelancerId: parseInt(freelancerId)
                });

            res.status(201).json({
                message: "Conversation berhasil dibuat",
                conversation
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal membuat conversation",
                error: error.message
            });
        }
    }
);

app.get(
    "/api/conversations",
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user.userId;
            const role = req.user.role;

            let conversations;

            if (role === "client") {
                conversations =
                    await db.orm.public.Conversation
                        .where({
                            clientId: userId
                        })
                        .all();
            } else if (role === "freelancer") {
                conversations =
                    await db.orm.public.Conversation
                        .where({
                            freelancerId: userId
                        })
                        .all();
            } else {
                return res.status(403).json({
                    message: "Akses ditolak"
                });
            }

            res.json(conversations);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengambil conversation",
                error: error.message
            });
        }
    }
);

app.get(
    "/api/conversations/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const conversationId = parseInt(req.params.id);

            const conversation =
                await db.orm.public.Conversation
                    .where({
                        id: conversationId
                    })
                    .first();

            if (!conversation) {
                return res.status(404).json({
                    message: "Conversation tidak ditemukan"
                });
            }

            const userId = req.user.userId;

            if (
                conversation.clientId !== userId &&
                conversation.freelancerId !== userId
            ) {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses ke conversation ini"
                });
            }

            res.json(conversation);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengambil conversation",
                error: error.message
            });
        }
    }
);

app.post(
    "/api/conversations/:id/messages",
    authenticateToken,
    async (req, res) => {
        try {
            const conversationId = parseInt(req.params.id);
            const { content } = req.body;

            if (!content || !content.trim()) {
                return res.status(400).json({
                    message: "Pesan wajib diisi"
                });
            }

            const conversation =
                await db.orm.public.Conversation
                    .where({
                        id: conversationId
                    })
                    .first();

            if (!conversation) {
                return res.status(404).json({
                    message: "Conversation tidak ditemukan"
                });
            }

            const userId = req.user.userId;

            if (
                conversation.clientId !== userId &&
                conversation.freelancerId !== userId
            ) {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses ke conversation ini"
                });
            }

            const message =
                await db.orm.public.Message.create({
                    conversationId,
                    senderId: userId,
                    content: content.trim()
                });

            res.status(201).json({
                message: "Pesan berhasil dikirim",
                data: message
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengirim pesan",
                error: error.message
            });
        }
    }
);

app.get(
    "/api/conversations/:id/messages",
    authenticateToken,
    async (req, res) => {
        try {
            const conversationId = parseInt(req.params.id);

            const conversation =
                await db.orm.public.Conversation
                    .where({
                        id: conversationId
                    })
                    .first();

            if (!conversation) {
                return res.status(404).json({
                    message: "Conversation tidak ditemukan"
                });
            }

            const userId = req.user.userId;

            if (
                conversation.clientId !== userId &&
                conversation.freelancerId !== userId
            ) {
                return res.status(403).json({
                    message: "Anda tidak memiliki akses ke conversation ini"
                });
            }

            const messages =
                await db.orm.public.Message
                    .where({
                        conversationId
                    })
                    .all();

            res.json(messages);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Gagal mengambil pesan",
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

function authorizeRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Anda tidak memiliki akses"
            });
        }

        next();
    };
}

// =========================
// PROFILE
// =========================

app.get("/api/profile", authenticateToken, async (req, res) => {
    try {
        const user = await db.orm.public.User
            .where({ id: req.user.userId })
            .first();

        if (!user) {
            return res.status(404).json({
                message: "User tidak ditemukan"
            });
        }

        res.json({
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            role: user.role
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Gagal mengambil profile"
        });
    }
});

// =========================
// REGISTER
// =========================

app.post("/api/auth/register", async (req, res) => {
    try {
        const {
            email,
            username,
            name,
            password,
            role
        } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({
                message: "Email, username, dan password wajib diisi"
            });
        }

        const existingUser = await db.orm.public.User
            .where({ email })
            .first();

        if (existingUser) {
            return res.status(409).json({
                message: "Email sudah terdaftar"
            });
        }

        const existingUsername = await db.orm.public.User
            .where({ username })
            .first();

        if (existingUsername) {
            return res.status(409).json({
                message: "Username sudah digunakan"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await db.orm.public.User.create({
            email,
            username,
            name: name || null,
            role: role || "client",
            password: hashedPassword
        });

        res.status(201).json({
            message: "Register berhasil",
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Gagal melakukan register",
            error: error.message
        });
    }
});

// =========================
// LOGIN
// =========================

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email dan password wajib diisi"
            });
        }

        const user = await db.orm.public.User
            .where({ email })
            .first();

        if (!user) {
            return res.status(401).json({
                message: "Email atau password salah"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Email atau password salah"
            });
        }

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
                username: user.username,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);

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
// START SERVER
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`SkillMarket API berjalan di port ${PORT}`);
});