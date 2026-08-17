/* =====================================================
   MY WALLET - CLEAN SCRIPT.JS
===================================================== */

let currentUser = null;


/* =====================================================
   HELPER
===================================================== */

const $ = (id) => document.getElementById(id);


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


/* =====================================================
   AUTH SCREEN
===================================================== */

function showAuthCard(card) {

    const registerCard = $("registerCard");
    const forgotCard = $("forgotCard");

    if (registerCard) {
        registerCard.style.display = "none";
    }

    if (forgotCard) {
        forgotCard.style.display = "none";
    }

    if (card) {
        card.style.display = "block";
    }
}


/* =====================================================
   CREATE ACCOUNT SCREEN
===================================================== */

$("showRegisterBtn")?.addEventListener("click", () => {

    showAuthCard($("registerCard"));

});


$("backToLoginBtn")?.addEventListener("click", () => {

    showAuthCard(null);

});


/* =====================================================
   FORGOT PASSWORD SCREEN
===================================================== */

$("forgotPasswordBtn")?.addEventListener("click", () => {

    showAuthCard($("forgotCard"));

});


$("forgotBackBtn")?.addEventListener("click", () => {

    showAuthCard(null);

});


/* =====================================================
   REGISTER
===================================================== */

$("registerBtn")?.addEventListener("click", async () => {

    const name =
        $("name").value.trim();

    const mobile =
        $("username").value.trim();

    const password =
        $("registerPassword").value;


    if (!name) {

        showMessage(
            "message",
            "Enter your name."
        );

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


    const button =
        $("registerBtn");

    button.disabled = true;
    button.textContent = "Creating...";


    try {

        const response =
            await fetch(
                "/api/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        name,
                        mobile,
                        password
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            showMessage(
                "message",
                data.message ||
                "Registration failed."
            );

            return;
        }


        showMessage(
            "message",
            "Account created successfully. Please login.",
            true
        );


        $("name").value = "";
        $("username").value = "";
        $("registerPassword").value = "";


        setTimeout(() => {

            showAuthCard(null);

            $("loginUsername").value =
                mobile;

            $("loginPassword").value = "";

        }, 800);


    } catch (error) {

        console.error(
            "Register error:",
            error
        );

        showMessage(
            "message",
            "Server connection failed."
        );


    } finally {

        button.disabled = false;
        button.textContent = "Create Account";

    }

});


/* =====================================================
   LOGIN
===================================================== */

$("loginBtn")?.addEventListener("click", async () => {

    const mobile =
        $("loginUsername").value.trim();

    const password =
        $("loginPassword").value;


    if (!/^[0-9]{10}$/.test(mobile)) {

        showMessage(
            "loginMessage",
            "Enter a valid 10 digit mobile number."
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


const button = $("loginBtn");

button.disabled = true;
button.innerHTML = `
    <span class="login-spinner"></span>
    Logging in...
`;

    try {

        const response =
            await fetch(
                "/api/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        mobile,
                        password
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            showMessage(
                "loginMessage",
                data.message ||
                "Login failed."
            );

            return;
        }


        currentUser =
            data.user;


        localStorage.setItem(
            "walletUser",
            JSON.stringify(currentUser)
        );


       document.body.classList.add("login-success");

setTimeout(() => {
    openWallet();

    $("walletBox").classList.add("wallet-enter");

    setTimeout(() => {
        $("walletBox").classList.remove("wallet-enter");
    }, 650);

    document.body.classList.remove("login-success");
}, 500);


    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showMessage(
            "loginMessage",
            "Server connection failed."
        );


    } finally {

        button.disabled = false;
        button.textContent = "Login";

    }

});


/* =====================================================
   FORGOT PASSWORD - REQUEST OTP
===================================================== */

$("sendOtpBtn")?.addEventListener(
    "click",
    async () => {

        const mobile =
            $("forgotMobile").value.trim();


        if (!/^[0-9]{10}$/.test(mobile)) {

            showMessage(
                "forgotMessage",
                "Enter a valid 10 digit mobile number."
            );

            return;
        }


        const button =
            $("sendOtpBtn");

        button.disabled = true;
        button.textContent = "Sending...";


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


            $("forgotOtp").style.display =
                "block";

            $("newPassword").style.display =
                "block";

            $("resetPasswordBtn").style.display =
                "block";

            $("sendOtpBtn").style.display =
                "none";


            showMessage(
                "forgotMessage",
                "OTP generated. Check the Node.js terminal.",
                true
            );


        } catch (error) {

            console.error(
                "OTP error:",
                error
            );

            showMessage(
                "forgotMessage",
                "Server connection failed."
            );


        } finally {

            button.disabled = false;

            if (
                $("sendOtpBtn").style.display !==
                "none"
            ) {
                button.textContent = "Send OTP";
            }

        }

    }
);


/* =====================================================
   FORGOT PASSWORD - RESET
===================================================== */

$("resetPasswordBtn")?.addEventListener(
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
                "Password must be at least 4 characters."
            );

            return;
        }


        const button =
            $("resetPasswordBtn");

        button.disabled = true;
        button.textContent = "Resetting...";


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

            console.error(
                "Password reset error:",
                error
            );

            showMessage(
                "forgotMessage",
                "Server connection failed."
            );


        } finally {

            button.disabled = false;
            button.textContent = "Reset Password";

        }

    }
);


/* =====================================================
   OPEN WALLET
===================================================== */

function openWallet() {

    $("authBox").style.display =
        "none";

    $("walletBox").style.display =
        "block";


    $("userName").textContent =
        currentUser?.name || "";


    showSection("dashboard");

}


/* =====================================================
   3 DOT MENU
===================================================== */

$("menuBtn")?.addEventListener(
    "click",
    () => {

        const panel =
            $("menuPanel");

        if (!panel) return;


        if (
            panel.style.display === "none" ||
            panel.style.display === ""
        ) {

            panel.style.display = "block";

        } else {

            panel.style.display = "none";

        }

    }
);


/* =====================================================
   MENU ITEMS
===================================================== */

document
    .querySelectorAll(
        "#menuPanel button[data-section]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showSection(
                    button.dataset.section
                );


                const panel =
                    $("menuPanel");

                if (panel) {
                    panel.style.display =
                        "none";
                }

            }
        );

    });


/* =====================================================
   SHOW SECTION
===================================================== */

function showSection(section) {

    const sections = {

        dashboard:
            "dashboardSection",

        withdraw:
            "withdrawSection",

        withdrawHistory:
            "withdrawHistorySection",

        transactions:
            "transactionsSection",

        telegram:
            "telegramSection"

    };


    Object.values(sections)
        .forEach(id => {

            const element =
                $(id);

            if (element) {
                element.style.display =
                    "none";
            }

        });


    const selected =
        sections[section];


    if (selected) {

        const element =
            $(selected);

        if (element) {
            element.style.display =
                "block";
        }

    }


    /* =========================
       DASHBOARD
       Balance + Transactions
    ========================= */

    if (
        section === "dashboard"
    ) {

        refreshBalance();

        loadTransactions();

    }


    /* =========================
       TRANSACTION PAGE
    ========================= */

    if (
        section === "transactions"
    ) {

        loadTransactions();

    }


    /* =========================
       WITHDRAWAL HISTORY
    ========================= */

    if (
        section === "withdrawHistory"
    ) {

        loadWithdrawals();

    }

}


/* =====================================================
   REFRESH BALANCE
===================================================== */

async function refreshBalance() {

    if (
        !currentUser ||
        !currentUser.mobile
    ) {
        return;
    }


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


        if (!response.ok) {

            console.error(
                "Balance error:",
                data.message
            );

            return;
        }


        currentUser.balance =
            Number(data.balance) || 0;


        const balanceElement =
            $("balance");


        if (balanceElement) {

            balanceElement.textContent =
                "₹" +
                currentUser.balance.toFixed(2);

        }


        localStorage.setItem(
            "walletUser",
            JSON.stringify(currentUser)
        );


    } catch (error) {

        console.error(
            "Balance connection error:",
            error
        );

    }

}


/* =====================================================
   WITHDRAW
===================================================== */

$("withdrawBtn")?.addEventListener(
    "click",
    async () => {

        if (!currentUser) {

            showMessage(
                "withdrawMessage",
                "Please login first."
            );

            return;
        }


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


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

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
        button.textContent =
            "Processing...";


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

                            upi_id:
                                upi,

                            amount:
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


            currentUser.balance =
                Number(data.balance) || 0;


            $("balance").textContent =
                "₹" +
                currentUser.balance.toFixed(2);


            localStorage.setItem(
                "walletUser",
                JSON.stringify(currentUser)
            );


            showMessage(
                "withdrawMessage",
                "Withdrawal request submitted successfully.",
                true
            );


            $("withdrawUpiId").value = "";
            $("withdrawAmount").value = "";


            /*
                Refresh transaction list.
                The server adds the actual
                Withdrawal transaction when
                admin approves it.
            */

            await loadTransactions();


        } catch (error) {

            console.error(
                "Withdrawal error:",
                error
            );

            showMessage(
                "withdrawMessage",
                "Server connection failed."
            );


        } finally {

            button.disabled = false;
            button.textContent =
                "Withdraw";

        }

    }
);


/* =====================================================
   WITHDRAWAL HISTORY
===================================================== */

async function loadWithdrawals() {

    if (!currentUser) return;


    const box =
        $("withdrawalStatusList");


    if (!box) return;


    box.innerHTML =
        "Loading...";


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

            box.innerHTML = `
                <div>
                    No withdrawal requests yet.
                </div>
            `;

            return;
        }


        box.innerHTML = "";


        data.withdrawals.forEach(item => {

            const div =
                document.createElement("div");


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

        console.error(
            "Withdrawal history error:",
            error
        );


        box.textContent =
            "Server connection failed.";

    }

}


/* =====================================================
   TRANSACTION HISTORY
===================================================== */

async function loadTransactions() {

    if (
        !currentUser ||
        !currentUser.mobile
    ) {
        return;
    }


    const box =
        $("transactions");


    if (!box) {

        console.error(
            "Transaction container not found."
        );

        return;
    }


    box.innerHTML = `
        <div class="empty-transaction">
            Loading transactions...
        </div>
    `;


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

            box.innerHTML = `
                <div class="empty-transaction">
                    ${escapeHtml(
                        data.message ||
                        "Failed to load transactions."
                    )}
                </div>
            `;

            return;
        }


        const transactions =
            Array.isArray(
                data.transactions
            )
                ? data.transactions
                : [];


        if (
            transactions.length === 0
        ) {

            box.innerHTML = `
                <div class="empty-transaction">

                    <div class="empty-icon">
                        ↕
                    </div>

                    <strong>
                        No transactions yet
                    </strong>

                    <br>

                    <span>
                        Your wallet activity will appear here.
                    </span>

                </div>
            `;

            return;
        }


        box.innerHTML = "";


        transactions.forEach(tx => {

            const div =
                document.createElement("div");


            const type =
                escapeHtml(
                    tx.type || "Transaction"
                );


            const amount =
                Number(tx.amount) || 0;


            const createdAt =
                escapeHtml(
                    tx.created_at || ""
                );


            div.innerHTML = `

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:10px;
                ">

                    <strong>
                        ${type}
                    </strong>

                    <strong>
                        ₹${amount.toFixed(2)}
                    </strong>

                </div>

                <small style="
                    display:block;
                    margin-top:7px;
                    opacity:.65;
                ">
                    ${createdAt}
                </small>

            `;


            box.appendChild(div);

        });


    } catch (error) {

        console.error(
            "Transaction error:",
            error
        );


        box.innerHTML = `
            <div class="empty-transaction">
                Server connection failed.
            </div>
        `;

    }

}


/* =====================================================
   TELEGRAM
===================================================== */

$("saveTelegramBtn")?.addEventListener(
    "click",
    async () => {

        if (!currentUser) {

            showMessage(
                "telegramMessage",
                "Please login first."
            );

            return;
        }


        const chatId =
            $("telegramChatId")
                .value
                .trim();


        if (!chatId) {

            showMessage(
                "telegramMessage",
                "Enter Telegram Chat ID."
            );

            return;
        }


        const button =
            $("saveTelegramBtn");


        button.disabled = true;
        button.textContent =
            "Saving...";


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


            currentUser.telegram_chat_id =
                chatId;


            localStorage.setItem(
                "walletUser",
                JSON.stringify(currentUser)
            );


            showMessage(
                "telegramMessage",
                "Telegram connected successfully.",
                true
            );


        } catch (error) {

            console.error(
                "Telegram error:",
                error
            );


            showMessage(
                "telegramMessage",
                "Server connection failed."
            );


        } finally {

            button.disabled = false;
            button.textContent =
                "Save Telegram Chat ID";

        }

    }
);


/* =====================================================
   LOGOUT
===================================================== */

$("logoutBtn")?.addEventListener(
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


        if ($("loginPassword")) {
            $("loginPassword").value = "";
        }


        if ($("menuPanel")) {
            $("menuPanel").style.display =
                "none";
        }


        showAuthCard(null);

    }
);


/* =====================================================
   AUTO LOGIN
===================================================== */

const savedUser =
    localStorage.getItem(
        "walletUser"
    );


if (savedUser) {

    try {

        const parsed =
            JSON.parse(savedUser);


        if (
            parsed &&
            parsed.mobile
        ) {

            currentUser =
                parsed;


            openWallet();

        } else {

            localStorage.removeItem(
                "walletUser"
            );

        }

    } catch (error) {

        console.error(
            "Saved user error:",
            error
        );


        localStorage.removeItem(
            "walletUser"
        );

    }

}