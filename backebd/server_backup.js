let currentUser = null;

const $ = id => document.getElementById(id);

function showMessage(id, text, success = false) {
    const el = $(id);
    if (!el) return;

    el.textContent = text;
    el.style.color = success ? "#15803d" : "#b91c1c";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================
   AUTH SCREENS
========================= */

function showAuthCard(card) {

    $("registerCard").style.display = "none";
    $("forgotCard").style.display = "none";

    if (card) {
        card.style.display = "block";
    }
}

$("showRegisterBtn").addEventListener("click", () => {
    showAuthCard($("registerCard"));
});

$("backToLoginBtn").addEventListener("click", () => {
    showAuthCard(null);
});

$("forgotPasswordBtn").addEventListener("click", () => {
    showAuthCard($("forgotCard"));
});

$("forgotBackBtn").addEventListener("click", () => {
    showAuthCard(null);
});


/* =========================
   REGISTER
========================= */

$("registerBtn").addEventListener("click", async () => {

    const name = $("name").value.trim();
    const mobile = $("username").value.trim();
    const password = $("registerPassword").value;

    if (!name) {
        showMessage("message", "Enter your name.");
        return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
        showMessage(
            "message",
            "Enter a valid 10 digit mobile number."
        );
        return;
    }

    if (password.length < 4) {
        showMessage(
            "message",
            "Password must be at least 4 characters."
        );
        return;
    }

    try {

        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                mobile,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(
                "message",
                data.message || "Registration failed."
            );
            return;
        }

        showMessage(
            "message",
            "Account created. Please login.",
            true
        );

        $("name").value = "";
        $("username").value = "";
        $("registerPassword").value = "";

        setTimeout(() => {
            showAuthCard(null);
            $("loginUsername").value = mobile;
        }, 700);

    } catch (error) {

        console.error(error);

        showMessage(
            "message",
            "Server connection failed."
        );
    }

});


/* =========================
   LOGIN
========================= */

$("loginBtn").addEventListener("click", async () => {

    const mobile =
        $("loginUsername").value.trim();

    const password =
        $("loginPassword").value;

    if (!/^[0-9]{10}$/.test(mobile)) {
        showMessage(
            "loginMessage",
            "Enter a valid mobile number."
        );
        return;
    }

    if (!password) {
        showMessage(
            "loginMessage",
            "Enter your password."
        );
        return;
    }

    try {

        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mobile,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(
                "loginMessage",
                data.message || "Login failed."
            );
            return;
        }

        currentUser = data.user;

        localStorage.setItem(
            "walletUser",
            JSON.stringify(currentUser)
        );

        openWallet();

    } catch (error) {

        console.error(error);

        showMessage(
            "loginMessage",
            "Server connection failed."
        );
    }

});


/* =========================
   FORGOT PASSWORD
========================= */

$("sendOtpBtn").addEventListener(
    "click",
    async () => {

        const mobile =
            $("forgotMobile").value.trim();

        if (!/^[0-9]{10}$/.test(mobile)) {

            showMessage(
                "forgotMessage",
                "Enter a valid mobile number."
            );

            return;
        }

        try {

            const response =
                await fetch(
                    "/api/forgot-password/request",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            mobile
                        })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                showMessage(
                    "forgotMessage",
                    data.message ||
                    "Could not send OTP."
                );

                return;
            }

            $("forgotOtp").style.display = "block";
            $("newPassword").style.display = "block";
            $("resetPasswordBtn").style.display = "block";

            $("sendOtpBtn").style.display = "none";

            showMessage(
                "forgotMessage",
                "OTP generated. Check the server console.",
                true
            );

        } catch (error) {

            console.error(error);

            showMessage(
                "forgotMessage",
                "Server connection failed."
            );

        }

    }
);


/* RESET PASSWORD */

$("resetPasswordBtn").addEventListener(
    "click",
    async () => {

        const mobile =
            $("forgotMobile").value.trim();

        const otp =
            $("forgotOtp").value.trim();

        const newPassword =
            $("newPassword").value;

        if (!/^[0-9]{10}$/.test(mobile)) {

            showMessage(
                "forgotMessage",
                "Invalid mobile number."
            );

            return;
        }

        if (!/^[0-9]{6}$/.test(otp)) {

            showMessage(
                "forgotMessage",
                "Enter the 6 digit OTP."
            );

            return;
        }

        if (newPassword.length < 4) {

            showMessage(
                "forgotMessage",
                "New password must be at least 4 characters."
            );

            return;
        }

        try {

            const response =
                await fetch(
                    "/api/forgot-password/reset",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            mobile,
                            otp,
                            newPassword
                        })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                showMessage(
                    "forgotMessage",
                    data.message ||
                    "Password reset failed."
                );

                return;
            }

            showMessage(
                "forgotMessage",
                "Password changed successfully. Login now.",
                true
            );

            $("forgotOtp").value = "";
            $("newPassword").value = "";

            setTimeout(() => {

                showAuthCard(null);

                $("loginUsername").value =
                    mobile;

                $("loginPassword").value = "";

            }, 900);

        } catch (error) {

            console.error(error);

            showMessage(
                "forgotMessage",
                "Server connection failed."
            );

        }

    }
);


/* =========================
   OPEN WALLET
========================= */

function openWallet() {

    $("authBox").style.display = "none";
    $("walletBox").style.display = "block";

    $("userName").textContent =
        currentUser.name || "";

    showSection("dashboard");

    refreshBalance();
}


/* =========================
   MENU
========================= */

$("menuBtn").addEventListener("click", () => {

    const panel = $("menuPanel");

    panel.style.display =
        panel.style.display === "none"
            ? "block"
            : "none";

});


document
    .querySelectorAll("#menuPanel button[data-section]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showSection(
                    button.dataset.section
                );

                $("menuPanel").style.display =
                    "none";
            }
        );

    });


function showSection(section) {

    const sections = {
        dashboard: "dashboardSection",
        withdraw: "withdrawSection",
        withdrawHistory:
            "withdrawHistorySection",
        transactions:
            "transactionsSection",
        telegram:
            "telegramSection"
    };

    Object.values(sections).forEach(id => {
        $(id).style.display = "none";
    });

    if (sections[section]) {
        $(sections[section]).style.display =
            "block";
    }

    if (section === "transactions") {
        loadTransactions();
    }

    if (section === "withdrawHistory") {
        loadWithdrawals();
    }

    if (section === "dashboard") {
        refreshBalance();
    }
}


/* =========================
   BALANCE
========================= */

async function refreshBalance() {

    if (!currentUser) return;

    try {

        const response =
            await fetch(
                "/api/balance/" +
                encodeURIComponent(
                    currentUser.mobile
                )
            );

        const data =
            await response.json();

        if (!response.ok) return;

        currentUser.balance =
            Number(data.balance) || 0;

        $("balance").textContent =
            "₹" +
            currentUser.balance.toFixed(2);

        localStorage.setItem(
            "walletUser",
            JSON.stringify(currentUser)
        );

    } catch (error) {

        console.error(error);

    }
}


/* =========================
   WITHDRAW
========================= */

$("withdrawBtn").addEventListener(
    "click",
    async () => {

        const upi =
            $("withdrawUpiId").value.trim();

        const amount =
            Number(
                $("withdrawAmount").value
            );

        if (!upi) {

            showMessage(
                "withdrawMessage",
                "Enter your UPI ID."
            );

            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {

            showMessage(
                "withdrawMessage",
                "Enter a valid amount."
            );

            return;
        }

        if (
            amount >
            Number(currentUser.balance || 0)
        ) {

            showMessage(
                "withdrawMessage",
                "Insufficient balance."
            );

            return;
        }

        const button =
            $("withdrawBtn");

        button.disabled = true;
        button.textContent = "Processing...";

        try {

            const response =
                await fetch(
                    "/api/demo/withdraw-request",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            mobile:
                                currentUser.mobile,
                            upi_id: upi,
                            amount
                        })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                showMessage(
                    "withdrawMessage",
                    data.message ||
                    "Withdrawal failed."
                );

                return;
            }

            await refreshBalance();

            showMessage(
                "withdrawMessage",
                "Withdrawal request submitted.",
                true
            );

            $("withdrawUpiId").value = "";
            $("withdrawAmount").value = "";

        } catch (error) {

            console.error(error);

            showMessage(
                "withdrawMessage",
                "Server connection failed."
            );

        } finally {

            button.disabled = false;
            button.textContent = "Withdraw";

        }

    }
);


/* =========================
   WITHDRAWAL HISTORY
========================= */

async function loadWithdrawals() {

    const box =
        $("withdrawalStatusList");

    box.innerHTML = "Loading...";

    try {

        const response =
            await fetch(
                "/api/withdrawals/" +
                encodeURIComponent(
                    currentUser.mobile
                )
            );

        const data =
            await response.json();

        if (!response.ok) {
            box.textContent =
                data.message ||
                "Failed to load.";
            return;
        }

        if (
            !Array.isArray(
                data.withdrawals
            ) ||
            data.withdrawals.length === 0
        ) {

            box.innerHTML =
                "No withdrawal requests yet.";

            return;
        }

        box.innerHTML = "";

        data.withdrawals.forEach(item => {

            const div =
                document.createElement("div");

            div.style.cssText =
                "padding:15px;background:#fff;border-radius:12px;margin-bottom:10px;";

            div.innerHTML = `
                <strong>
                    ₹${Number(item.amount).toFixed(2)}
                </strong>

                <br>

                UPI:
                ${escapeHtml(item.upi_id)}

                <br>

                Status:
                <strong>
                    ${escapeHtml(item.status)}
                </strong>

                <br>

                <small>
                    ${escapeHtml(item.created_at)}
                </small>
            `;

            box.appendChild(div);

        });

    } catch (error) {

        console.error(error);

        box.textContent =
            "Server connection failed.";

    }

}


/* =========================
   TRANSACTIONS
========================= */

async function loadTransactions() {

    const box =
        $("transactions");

    box.innerHTML = "Loading...";

    try {

        const response =
            await fetch(
                "/api/transactions/" +
                encodeURIComponent(
                    currentUser.mobile
                )
            );

        const data =
            await response.json();

        if (!response.ok) {
            box.textContent =
                data.message ||
                "Failed to load transactions.";
            return;
        }

        if (
            !Array.isArray(
                data.transactions
            ) ||
            data.transactions.length === 0
        ) {

            box.innerHTML =
                "No transactions yet.";

            return;
        }

        box.innerHTML = "";

        data.transactions.forEach(tx => {

            const div =
                document.createElement("div");

            div.style.cssText =
                "padding:15px;background:#fff;border-radius:12px;margin-bottom:10px;";

            div.innerHTML = `
                <strong>
                    ${escapeHtml(tx.type)}
                </strong>

                <br>

                ₹${Number(tx.amount).toFixed(2)}

                <br>

                <small>
                    ${escapeHtml(tx.created_at)}
                </small>
            `;

            box.appendChild(div);

        });

    } catch (error) {

        console.error(error);

        box.textContent =
            "Server connection failed.";

    }

}


/* =========================
   TELEGRAM
========================= */

$("saveTelegramBtn").addEventListener(
    "click",
    async () => {

        const chatId =
            $("telegramChatId").value.trim();

        if (!chatId) {

            showMessage(
                "telegramMessage",
                "Enter Telegram Chat ID."
            );

            return;
        }

        try {

            const response =
                await fetch(
                    "/api/user/telegram",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            mobile:
                                currentUser.mobile,
                            telegram_chat_id:
                                chatId
                        })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                showMessage(
                    "telegramMessage",
                    data.message ||
                    "Could not save."
                );

                return;
            }

            showMessage(
                "telegramMessage",
                "Telegram connected successfully.",
                true
            );

        } catch (error) {

            console.error(error);

            showMessage(
                "telegramMessage",
                "Server connection failed."
            );

        }

    }
);


/* =========================
   LOGOUT
========================= */

$("logoutBtn").addEventListener(
    "click",
    () => {

        currentUser = null;

        localStorage.removeItem(
            "walletUser"
        );

        $("walletBox").style.display =
            "none";

        $("authBox").style.display =
            "block";

        showAuthCard(null);

    }
);


/* =========================
   AUTO LOGIN
========================= */

const savedUser =
    localStorage.getItem("walletUser");

if (savedUser) {

    try {

        currentUser =
            JSON.parse(savedUser);

        if (
            currentUser &&
            currentUser.mobile
        ) {

            openWallet();

        }

    } catch (error) {

        localStorage.removeItem(
            "walletUser"
        );

    }

}