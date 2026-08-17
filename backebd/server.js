require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "..")
    )
);


/* =====================================================
   TELEGRAM
===================================================== */

async function sendTelegramMessage(chatId, text) {

    if (!chatId) return;

    const token =
        process.env.TELEGRAM_BOT_TOKEN;

    if (!token) return;

    try {

        const response = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text
                })
            }
        );

        const data = await response.json();

        if (!data.ok) {
            console.error(
                "Telegram error:",
                data.description
            );
        }

    } catch (error) {

        console.error(
            "Telegram connection error:",
            error
        );
    }
}


/* =====================================================
   ADMIN
===================================================== */

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

const adminTokens = new Set();

function requireAdmin(req, res, next) {

    const auth =
        req.headers.authorization || "";

    if (!auth.startsWith("Bearer ")) {

        return res.status(401).json({
            success: false,
            message: "Admin login required."
        });
    }

    const token =
        auth.substring(7);

    if (!adminTokens.has(token)) {

        return res.status(401).json({
            success: false,
            message: "Invalid admin session."
        });
    }

    next();
}


/* =====================================================
   WITHDRAWAL TABLE
===================================================== */

db.exec(`
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    upi_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`);


/* =====================================================
   TEST
===================================================== */

app.get("/api/test", (req, res) => {

    res.json({
        success: true,
        message: "Wallet server is working."
    });

});


/* =====================================================
   ADMIN LOGIN
===================================================== */

app.post("/api/admin/login", (req, res) => {

    const {
        username,
        password
    } = req.body;

    if (
        username !== ADMIN_USERNAME ||
        password !== ADMIN_PASSWORD
    ) {

        return res.status(401).json({
            success: false,
            message:
                "Invalid admin username or password."
        });
    }

    const token =
        crypto.randomBytes(32).toString("hex");

    adminTokens.add(token);

    res.json({
        success: true,
        token
    });
});


/* =====================================================
   ADMIN LOGOUT
===================================================== */

app.post(
    "/api/admin/logout",
    requireAdmin,
    (req, res) => {

        const token =
            req.headers.authorization.substring(7);

        adminTokens.delete(token);

        res.json({
            success: true,
            message: "Admin logged out."
        });
    }
);


/* =====================================================
   REGISTER
===================================================== */

app.post("/api/register", async (req, res) => {

    const name =
        String(req.body.name || "").trim();

    const mobile =
        String(req.body.mobile || "").trim();

    const password =
        String(req.body.password || "");

    if (!name || !mobile || !password) {

        return res.status(400).json({
            success: false,
            message:
                "Name, mobile number and password are required."
        });
    }

    if (!/^[0-9]{10}$/.test(mobile)) {

        return res.status(400).json({
            success: false,
            message:
                "Enter a valid 10 digit mobile number."
        });
    }

    if (password.length < 4) {

        return res.status(400).json({
            success: false,
            message:
                "Password must be at least 4 characters."
        });
    }

    try {

        const passwordHash =
            await bcrypt.hash(password, 12);

        const result =
            db.prepare(`
                INSERT INTO users
                (name, mobile, password)
                VALUES (?, ?, ?)
            `).run(
                name,
                mobile,
                passwordHash
            );

        const user =
            db.prepare(`
                SELECT
                    id,
                    name,
                    mobile,
                    telegram_chat_id,
                    balance
                FROM users
                WHERE id = ?
            `).get(
                result.lastInsertRowid
            );

        res.json({
            success: true,
            user
        });

    } catch (error) {

        if (
            error.code ===
            "SQLITE_CONSTRAINT_UNIQUE"
        ) {

            return res.status(409).json({
                success: false,
                message:
                    "Mobile number already registered."
            });
        }

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server error."
        });
    }
});


/* =====================================================
   LOGIN
===================================================== */

app.post("/api/login", async (req, res) => {

    const mobile =
        String(req.body.mobile || "").trim();

    const password =
        String(req.body.password || "");

    if (!mobile || !password) {

        return res.status(400).json({
            success: false,
            message:
                "Mobile number and password are required."
        });
    }

    const user =
        db.prepare(`
            SELECT
                id,
                name,
                mobile,
                password,
                telegram_chat_id,
                balance
            FROM users
            WHERE mobile = ?
        `).get(mobile);

    if (!user) {

        return res.status(404).json({
            success: false,
            message:
                "Mobile number not registered."
        });
    }

    const correct =
        await bcrypt.compare(
            password,
            user.password
        );

    if (!correct) {

        return res.status(401).json({
            success: false,
            message: "Incorrect password."
        });
    }

    res.json({
        success: true,
        user: {
            id: user.id,
            name: user.name,
            mobile: user.mobile,
            telegram_chat_id:
                user.telegram_chat_id,
            balance:
                Number(user.balance) || 0
        }
    });
});

/* =====================================================
   FORGOT PASSWORD
===================================================== */

const passwordResetOtps = new Map();

app.post(
    "/api/forgot-password/request",
    async (req, res) => {

        const mobile =
            String(req.body.mobile || "").trim();

        if (!/^[0-9]{10}$/.test(mobile)) {
            return res.status(400).json({
                success: false,
                message:
                    "Enter a valid 10 digit mobile number."
            });
        }

        const user =
            db.prepare(`
                SELECT
                    id,
                    telegram_chat_id
                FROM users
                WHERE mobile = ?
            `).get(mobile);

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "Mobile number not registered."
            });
        }

        if (!user.telegram_chat_id) {
            return res.status(400).json({
                success: false,
                message:
                    "Telegram is not connected to this account."
            });
        }

        const otp =
            String(
                Math.floor(
                    100000 +
                    Math.random() * 900000
                )
            );

        passwordResetOtps.set(
            mobile,
            {
                otp,
                expires:
                    Date.now() + 5 * 60 * 1000
            }
        );

        await sendTelegramMessage(
            user.telegram_chat_id,
            `🔐 Password Reset OTP

Your OTP is: ${otp}

This OTP will expire in 5 minutes.`
        );

        res.json({
            success: true,
            message:
                "OTP sent to Telegram."
        });
    }
);


/* =====================================================
   RESET PASSWORD
===================================================== */

app.post(
    "/api/forgot-password/reset",
    async (req, res) => {

        const mobile =
            String(req.body.mobile || "").trim();

        const otp =
            String(req.body.otp || "").trim();

        const newPassword =
            String(req.body.newPassword || "");

        const reset =
            passwordResetOtps.get(mobile);

        if (!reset) {
            return res.status(400).json({
                success: false,
                message:
                    "OTP not found. Request a new OTP."
            });
        }

        if (Date.now() > reset.expires) {

            passwordResetOtps.delete(mobile);

            return res.status(400).json({
                success: false,
                message:
                    "OTP expired."
            });
        }

        if (reset.otp !== otp) {
            return res.status(400).json({
                success: false,
                message:
                    "Incorrect OTP."
            });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 4 characters."
            });
        }

        const user =
            db.prepare(`
                SELECT id
                FROM users
                WHERE mobile = ?
            `).get(mobile);

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "User not found."
            });
        }

        const hash =
            await bcrypt.hash(
                newPassword,
                12
            );

        db.prepare(`
            UPDATE users
            SET password = ?
            WHERE id = ?
        `).run(
            hash,
            user.id
        );

        passwordResetOtps.delete(mobile);

        res.json({
            success: true,
            message:
                "Password reset successfully."
        });
    }
);


/* =====================================================
   TELEGRAM
===================================================== */

app.post(
    "/api/user/telegram",
    async (req, res) => {

        const mobile =
            String(req.body.mobile || "").trim();

        const chatId =
            String(
                req.body.telegram_chat_id || ""
            ).trim();

        if (!/^[0-9]{10}$/.test(mobile)) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid mobile number."
            });
        }

        if (!chatId) {

            return res.status(400).json({
                success: false,
                message:
                    "Telegram Chat ID is required."
            });
        }

        const user =
            db.prepare(`
                SELECT id
                FROM users
                WHERE mobile = ?
            `).get(mobile);

        if (!user) {

            return res.status(404).json({
                success: false,
                message:
                    "User not found."
            });
        }

        db.prepare(`
            UPDATE users
            SET telegram_chat_id = ?
            WHERE id = ?
        `).run(
            chatId,
            user.id
        );

        await sendTelegramMessage(
            chatId,
            "✅ Telegram notifications connected successfully!"
        );

        res.json({
            success: true,
            message:
                "Telegram Chat ID saved successfully."
        });
    }
);


/* =====================================================
   BALANCE
===================================================== */

app.get(
    "/api/balance/:mobile",
    (req, res) => {

        const mobile =
            String(req.params.mobile || "").trim();

        const user =
            db.prepare(`
                SELECT balance
                FROM users
                WHERE mobile = ?
            `).get(mobile);

        if (!user) {

            return res.status(404).json({
                success: false,
                message:
                    "User not found."
            });
        }

        res.json({
            success: true,
            balance:
                Number(user.balance) || 0
        });
    }
);


/* =====================================================
   ADMIN ADD BALANCE
===================================================== */

app.post(
    "/api/demo/add-balance",
    requireAdmin,
    async (req, res) => {

        const mobile =
            String(req.body.mobile || "").trim();

        const amount =
            Number(req.body.amount);

        if (
            !/^[0-9]{10}$/.test(mobile) ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid mobile number or amount."
            });
        }

        const user =
            db.prepare(`
                SELECT
                    id,
                    balance,
                    telegram_chat_id
                FROM users
                WHERE mobile = ?
            `).get(mobile);

        if (!user) {

            return res.status(404).json({
                success: false,
                message:
                    "User not found."
            });
        }

        const newBalance =
            Number(user.balance || 0) + amount;

        const transaction =
            db.transaction(() => {

                db.prepare(`
                    UPDATE users
                    SET balance = ?
                    WHERE id = ?
                `).run(
                    newBalance,
                    user.id
                );

                db.prepare(`
                    INSERT INTO transactions
                    (user_id, type, amount)
                    VALUES (?, ?, ?)
                `).run(
                    user.id,
                    "Money Added",
                    amount
                );
            });

        transaction();

        await sendTelegramMessage(
            user.telegram_chat_id,
            `💰 Money Added\n\nAmount: ₹${amount.toFixed(2)}\nNew Balance: ₹${newBalance.toFixed(2)}`
        );

        res.json({
            success: true,
            balance: newBalance
        });
    }
);


/* =====================================================
   WITHDRAW REQUEST
===================================================== */

/*
   Example:

   Balance = ₹100
   Withdraw = ₹50

   Immediately:
   Balance = ₹50
   Status = Pending

   Approved:
   Balance remains ₹50

   Rejected:
   ₹50 is refunded
   Balance becomes ₹100
*/

app.post(
    "/api/demo/withdraw-request",
    async (req, res) => {

        const mobile =
            String(req.body.mobile || "").trim();

        const upi =
            String(req.body.upi_id || "").trim();

        const amount =
            Number(req.body.amount);

        if (!/^[0-9]{10}$/.test(mobile)) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid mobile number."
            });
        }

        if (!upi) {

            return res.status(400).json({
                success: false,
                message:
                    "UPI ID is required."
            });
        }

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid withdrawal amount."
            });
        }

        try {

            const transaction =
                db.transaction(() => {

                    const user =
                        db.prepare(`
                            SELECT
                                id,
                                balance,
                                telegram_chat_id
                            FROM users
                            WHERE mobile = ?
                        `).get(mobile);

                    if (!user) {
                        throw new Error(
                            "USER_NOT_FOUND"
                        );
                    }

                    const balance =
                        Number(user.balance || 0);

                    if (amount > balance) {
                        throw new Error(
                            "INSUFFICIENT_BALANCE"
                        );
                    }

                    const newBalance =
                        balance - amount;

                    /*
                       Deduct immediately.
                    */

                    db.prepare(`
                        UPDATE users
                        SET balance = ?
                        WHERE id = ?
                    `).run(
                        newBalance,
                        user.id
                    );

                    const result =
                        db.prepare(`
                            INSERT INTO withdrawal_requests
                            (
                                user_id,
                                upi_id,
                                amount,
                                status
                            )
                            VALUES (?, ?, ?, 'Pending')
                        `).run(
                            user.id,
                            upi,
                            amount
                        );

                    return {
                        user,
                        newBalance,
                        requestId:
                            result.lastInsertRowid
                    };
                });

            const result =
                transaction();

            await sendTelegramMessage(
                result.user.telegram_chat_id,
                `📤 Withdrawal Request\n\nAmount: ₹${amount.toFixed(2)}\nUPI ID: ${upi}\nStatus: Pending\nRemaining Balance: ₹${result.newBalance.toFixed(2)}`
            );

            res.json({
                success: true,
                message:
                    "Withdrawal request submitted.",
                request_id:
                    result.requestId,
                balance:
                    result.newBalance
            });

        } catch (error) {

            if (
                error.message ===
                "USER_NOT_FOUND"
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "User not found."
                });
            }

            if (
                error.message ===
                "INSUFFICIENT_BALANCE"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Insufficient balance."
                });
            }

            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Failed to create withdrawal request."
            });
        }
    }
);


/* =====================================================
   USER WITHDRAWAL HISTORY
===================================================== */

app.get(
    "/api/withdrawals/:mobile",
    (req, res) => {

        const mobile =
            String(req.params.mobile || "").trim();

        const user =
            db.prepare(`
                SELECT id
                FROM users
                WHERE mobile = ?
            `).get(mobile);

        if (!user) {

            return res.status(404).json({
                success: false,
                message:
                    "User not found."
            });
        }

        const withdrawals =
            db.prepare(`
                SELECT
                    id,
                    upi_id,
                    amount,
                    status,
                    created_at,
                    updated_at
                FROM withdrawal_requests
                WHERE user_id = ?
                ORDER BY id DESC
            `).all(user.id);

        res.json({
            success: true,
            withdrawals
        });
    }
);


/* =====================================================
   ADMIN WITHDRAWALS
===================================================== */

app.get(
    "/api/admin/withdrawals",
    requireAdmin,
    (req, res) => {

        const withdrawals =
            db.prepare(`
                SELECT
                    wr.id,
                    u.id AS user_id,
                    u.name,
                    u.mobile,
                    wr.upi_id,
                    wr.amount,
                    wr.status,
                    wr.created_at,
                    wr.updated_at
                FROM withdrawal_requests wr
                INNER JOIN users u
                    ON u.id = wr.user_id
                ORDER BY wr.id DESC
            `).all();

        res.json({
            success: true,
            withdrawals
        });
    }
);


/* =====================================================
   ADMIN APPROVE / REJECT
===================================================== */

app.post(
    "/api/admin/withdrawals/:id",
    requireAdmin,
    async (req, res) => {

        const id =
            Number(req.params.id);

        const status =
            String(
                req.body.status || ""
            ).trim();

        if (!Number.isInteger(id)) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid request ID."
            });
        }

        if (
            status !== "Approved" &&
            status !== "Rejected"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid withdrawal status."
            });
        }

        try {

            const request =
                db.prepare(`
                    SELECT
                        wr.*,
                        u.name,
                        u.mobile,
                        u.balance,
                        u.telegram_chat_id
                    FROM withdrawal_requests wr
                    INNER JOIN users u
                        ON u.id = wr.user_id
                    WHERE wr.id = ?
                `).get(id);

            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Withdrawal request not found."
                });
            }

            if (request.status !== "Pending") {

                return res.status(400).json({
                    success: false,
                    message:
                        "This request has already been processed."
                });
            }

            const amount =
                Number(request.amount);

            const currentBalance =
                Number(request.balance || 0);


            /* ================= REJECT ================= */

            if (status === "Rejected") {

                const refundedBalance =
                    currentBalance + amount;

                const transaction =
                    db.transaction(() => {

                        db.prepare(`
                            UPDATE users
                            SET balance = ?
                            WHERE id = ?
                        `).run(
                            refundedBalance,
                            request.user_id
                        );

                        db.prepare(`
                            UPDATE withdrawal_requests
                            SET
                                status = 'Rejected',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `).run(id);
                    });

                transaction();

                await sendTelegramMessage(
                    request.telegram_chat_id,
                    `❌ Withdrawal Rejected\n\nAmount: ₹${amount.toFixed(2)}\nRefunded: ₹${amount.toFixed(2)}\nNew Balance: ₹${refundedBalance.toFixed(2)}`
                );

                return res.json({
                    success: true,
                    balance:
                        refundedBalance
                });
            }


            /* ================= APPROVE ================= */

            const transaction =
                db.transaction(() => {

                    /*
                       টাকা already deducted
                       when withdrawal was created.

                       তাই এখানে আবার deduct হবে না.
                    */

                    db.prepare(`
                        UPDATE withdrawal_requests
                        SET
                            status = 'Approved',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).run(id);

                    db.prepare(`
                        INSERT INTO transactions
                        (user_id, type, amount)
                        VALUES (?, ?, ?)
                    `).run(
                        request.user_id,
                        "Withdrawal",
                        amount
                    );
                });

            transaction();

            await sendTelegramMessage(
                request.telegram_chat_id,
                `✅ Withdrawal Approved\n\nAmount: ₹${amount.toFixed(2)}\nRemaining Balance: ₹${currentBalance.toFixed(2)}`
            );

            res.json({
                success: true,
                balance:
                    currentBalance
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Failed to update withdrawal."
            });
        }
    }
);


/* =====================================================
   TRANSACTIONS
===================================================== */

app.get(
    "/api/transactions/:mobile",
    (req, res) => {

        const mobile =
            String(req.params.mobile || "").trim();

        const user =
            db.prepare(`
                SELECT id
                FROM users
                WHERE mobile = ?
            `).get(mobile);

        if (!user) {

            return res.status(404).json({
                success: false,
                message:
                    "User not found."
            });
        }

        const transactions =
            db.prepare(`
                SELECT
                    id,
                    type,
                    amount,
                    created_at
                FROM transactions
                WHERE user_id = ?
                ORDER BY id DESC
            `).all(user.id);

        res.json({
            success: true,
            transactions
        });
    }
);


/* =====================================================
   ADMIN USERS
===================================================== */

app.get(
    "/api/users",
    requireAdmin,
    (req, res) => {

        const users =
            db.prepare(`
                SELECT
                    id,
                    name,
                    mobile,
                    balance
                FROM users
                ORDER BY id DESC
            `).all();

        res.json(users);
    }
);


/* =====================================================
   START SERVER
===================================================== */

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});