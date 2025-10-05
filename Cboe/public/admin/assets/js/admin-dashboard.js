// assets/js/admin-dashboard.js

// --- Configuration ---
// Base URL for your running backend server
const API_BASE_URL = 'https://cboebackendapi.onrender.com/api'; 
const LOGIN_PAGE = "./admin-login.html"; 

// --- Data Storage ---
let users = [];
let transactions = [];
// Get the JWT token saved during successful admin login
let jwtToken = localStorage.getItem('jwtToken'); 

/* ===========================
    DOM References & State
    =========================== */
let usersTableBody = null;
let transactionsTableBody = null;
let messageContainer = null;
let modalUserInfo = null;
let messageText = null;
let billingAmount = null;
let sendMessageBtn = null;
let closeModalBtn = null;
let modalStatus = null;
let messageModal = null;
let logoutBtn = null;
let dropdownLogout = null;
let listenersAttached = false;
let selectedUserId = null;


/* ===========================
    UTIL: ensure DOM ready
    =========================== */
function domReady() {
    if (document.readyState !== "loading") return Promise.resolve();
    return new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
}

/* ===========================
    UI Helpers: Modals and Messages
    =========================== */
function ensureMessageContainer() {
    if (messageContainer) return;
    messageContainer = document.getElementById("message-container");
    if (!messageContainer) {
        messageContainer = document.createElement("div");
        messageContainer.id = "message-container";
        messageContainer.style.position = "fixed";
        messageContainer.style.top = "20px";
        messageContainer.style.right = "20px";
        messageContainer.style.zIndex = "9999";
        document.body.appendChild(messageContainer);
    }
}

function showMessage(text, type = "success") {
    ensureMessageContainer();
    const div = document.createElement("div");
    div.className = `admin-msg ${type}`;
    div.textContent = text;
    div.style.marginTop = "8px";
    div.style.padding = "10px 14px";
    div.style.borderRadius = "6px";
    div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
    div.style.background = type === "success" ? "#0f9d58" : "#e74c3c";
    div.style.color = "white";
    div.style.fontWeight = "600";
    messageContainer.prepend(div);
    setTimeout(() => {
        div.style.opacity = "0";
        setTimeout(() => div.remove(), 400);
    }, 3500);
}

function ensureConfirmationModal() {
    let m = document.getElementById("confirmationModal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "confirmationModal";
    m.style.cssText = "display:none;position:fixed;z-index:10000;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;";
    m.innerHTML = `
      <div style="background:#fff;padding:20px;border-radius:8px;max-width:520px;width:90%;box-shadow:0 6px 18px rgba(0,0,0,0.2);">
        <h3 id="conf-title" style="margin:0 0 10px 0"></h3>
        <div id="conf-message" style="margin-bottom:16px;color:#333"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button id="conf-cancel" style="padding:8px 12px;border-radius:6px;border:1px solid #ddd;background:#f1f1f1;cursor:pointer">Cancel</button>
          <button id="conf-ok" style="padding:8px 12px;border-radius:6px;border:none;background:#dc3545;color:#fff;cursor:pointer">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    return m;
}

function showConfirmation(title, messageHtml, callback) {
    const modal = ensureConfirmationModal();
    modal.style.display = "flex";
    const ok = document.getElementById("conf-ok");
    const cancel = document.getElementById("conf-cancel");
    document.getElementById("conf-title").textContent = title;
    document.getElementById("conf-message").innerHTML = messageHtml;

    const handleOk = () => {
        cleanup();
        callback(true);
    };
    const handleCancel = () => {
        cleanup();
        callback(false);
    };
    function cleanup() {
        ok.removeEventListener("click", handleOk);
        cancel.removeEventListener("click", handleCancel);
        modal.style.display = "none";
    }
    ok.addEventListener("click", handleOk);
    cancel.addEventListener("click", handleCancel);
}

function injectModalsIfMissing() {
    if (!document.getElementById("messageModal")) {
        const html = `
          <div id="messageModal" style="display:none;position:fixed;z-index:10001;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.6);align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:8px;padding:18px;max-width:640px;width:92%;box-shadow:0 6px 18px rgba(0,0,0,0.2);">
              <h3 style="margin:0 0 10px 0">Send Message / Bill User</h3>
              <p id="modalUserInfo" style="font-weight:600;margin:6px 0 12px 0"></p>
              <label style="display:block;margin-bottom:6px">Message</label>
              <textarea id="messageText" rows="4" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ddd;margin-bottom:12px"></textarea>
              <label style="display:block;margin-bottom:6px">Billing Amount (optional)</label>
              <input id="billingAmount" type="number" min="0" step="0.01" placeholder="e.g. 50.00" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ddd;margin-bottom:12px" />
              <div id="modalStatus" style="min-height:20px;margin-bottom:12px;font-weight:600"></div>
              <div style="display:flex;justify-content:flex-end;gap:8px">
                <button id="closeModalBtn" style="padding:8px 12px;border-radius:6px;border:1px solid #ddd;background:#f1f1f1;cursor:pointer">Cancel</button>
                <button id="sendMessageBtn" style="padding:8px 12px;border-radius:6px;border:none;background:#007bff;color:#fff;cursor:pointer">Send Action</button>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML("beforeend", html);
    }
}


/* ===========================
    DOM Refs & Renderers
    =========================== */
function cacheDomRefs() {
    usersTableBody = document.getElementById("users-table-body") || document.querySelector("#users-table tbody");
    transactionsTableBody = document.getElementById("transactions-table-body") || document.querySelector("#transactions-table tbody");
    messageContainer = document.getElementById("message-container");

    modalUserInfo = document.getElementById("modalUserInfo");
    messageText = document.getElementById("messageText");
    billingAmount = document.getElementById("billingAmount");
    sendMessageBtn = document.getElementById("sendMessageBtn");
    closeModalBtn = document.getElementById("closeModalBtn");
    modalStatus = document.getElementById("modalStatus");
    messageModal = document.getElementById("messageModal");

    logoutBtn = document.getElementById("logout-btn");
    dropdownLogout = document.getElementById("dropdown-logout");
}


function renderUsers() {
    if (!usersTableBody) return;
    usersTableBody.innerHTML = "";
    users.forEach(user => {
        const tr = document.createElement("tr");
        // Ensure 'id' is a string for substring
        const userId = String(user.id); 
        const balanceNum = Number(user.balance) || 0;
        const isBanned = user.is_banned === true; // Note: SQL column names often use snake_case
        const isFrozen = user.is_frozen === true; // Note: SQL column names often use snake_case
        const statusText = isBanned ? "BANNED" : (isFrozen ? "FROZEN" : "Active");
        const statusColor = isBanned ? "red" : (isFrozen ? "orange" : "green");

        tr.innerHTML = `
          <td><code title="ID: ${userId}">${userId.substring(0,8)}...</code></td>
          <td>${user.username || "N/A"}</td>
          <td>${user.email || ""}</td>
          <td>$${balanceNum.toFixed(2)}</td>
          <td>
            <input id="balance-input-${userId}" type="number" step="0.01" value="${balanceNum.toFixed(2)}" style="width:120px;padding:6px;border:1px solid #ddd;border-radius:6px" />
            <button class="update-btn" data-userid="${userId}" style="margin-left:8px;padding:6px 10px;border-radius:6px">Update</button>
          </td>
          <td><button class="send-message-btn" data-userid="${userId}" data-username="${(user.username || user.email || '')}" style="padding:6px 10px;border-radius:6px">Message/Bill</button></td>
          <td style="color:${statusColor};font-weight:700">${statusText}</td>
          <td>
            <button class="action-btn" data-user-id="${userId}" data-action="ban">${isBanned ? "Unban" : "Ban"}</button>
            <button class="action-btn" data-user-id="${userId}" data-action="freeze" style="margin-left:6px">${isFrozen ? "Unfreeze" : "Freeze"}</button>
            <button class="action-btn" data-user-id="${userId}" data-action="delete" style="margin-left:6px;background:#dc3545;color:#fff;border:none;padding:6px 8px;border-radius:6px">Delete</button>
          </td>
        `;
        usersTableBody.appendChild(tr);
    });
}

function renderTransactions() {
    if (!transactionsTableBody) return;
    transactionsTableBody.innerHTML = "";
    if (!transactions || transactions.length === 0) {
        transactionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:16px">No pending transactions</td></tr>`;
        return;
    }

    // Sort transactions by creation time (most recent first) - Server should ideally do this
    transactions.sort((a, b) => {
        // Use 'created_at' for SQL data, which is a string timestamp
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeB - timeA;
    });

    transactions.forEach(tx => {
        const user = users.find(u => u.id === tx.user_id); // Note: SQL foreign key is often snake_case
        const txId = String(tx.id);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><code title="TX: ${txId}">${txId.substring(0,8)}...</code></td>
          <td>${user ? (user.username || user.email) : "Unknown"}</td>
          <td style="text-transform:capitalize">${tx.type || ""}</td>
          <td>$${Number(tx.amount || 0).toFixed(2)}</td>
          <td>
            <button class="approve-btn" data-txid="${txId}" style="padding:6px 10px;border-radius:6px">Approve</button>
            <button class="reject-btn" data-txid="${txId}" style="margin-left:6px;padding:6px 10px;border-radius:6px">Reject</button>
          </td>
        `;
        transactionsTableBody.appendChild(tr);
    });
}


/* ===========================
    API Service: Centralized Fetcher
    =========================== */

/**
 * Handles all secure API requests, attaching the JWT token.
 */
async function secureFetch(endpoint, options = {}) {
    if (!jwtToken) {
        console.error("No JWT token found. Redirecting to login.");
        handleLogout();
        throw new Error("Unauthorized");
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                // CRITICAL: Attach the JWT for authorization
                'Authorization': `Bearer ${jwtToken}`, 
                ...options.headers,
            },
        });
    } catch (e) {
        console.error("Network Error:", e);
        throw new Error("Could not connect to the server.");
    }

    // Handle 401 Unauthorized globally (session expired or token invalid)
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('jwtToken');
        window.location.href = LOGIN_PAGE;
        throw new Error("Session expired or unauthorized. Please log in again.");
    }

    // Attempt to parse JSON response
    let data = {};
    try {
        data = await response.json();
    } catch (e) {
        // This catches cases where the server returns non-JSON error or empty body
        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status} but no details.`);
        }
        // If status is OK but no JSON, just return empty data
        return {}; 
    }
    
    if (!response.ok) {
        throw new Error(data.message || `API Error: ${response.statusText} (${response.status})`);
    }
    return data;
}

/* ===========================
    SQL Backend Data Operations (CRUD)
    =========================== */

// 1. Fetch Users
async function fetchUsers() {
    try {
        const data = await secureFetch('/admin/users'); 
        users = data.users || []; 
        renderUsers();
    } catch (err) {
        console.error("fetchUsers error:", err);
        showMessage("Failed to load users: " + err.message, "error");
    }
}

// 2. Fetch Transactions (Pending)
async function fetchTransactions() {
    try {
        const data = await secureFetch('/admin/transactions/pending'); 
        transactions = data.transactions || []; 
        renderTransactions();
    } catch (err) {
        console.error("fetchTransactions error:", err);
        showMessage("Failed to load transactions: " + err.message, "error");
    }
}

// 3. Update User Balance
async function updateUserBalance(userId, newBalance) {
    try {
        const body = { balance: parseFloat(Number(newBalance).toFixed(2)) };
        await secureFetch(`/admin/user/${userId}/balance`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
        
        await fetchUsers(); 
        showMessage("Balance updated", "success");
    } catch (err) {
        console.error("updateUserBalance error:", err);
        showMessage(`Failed to update balance: ${err.message}`, "error");
    }
}

// 4. Handle User Action (Ban, Freeze, Delete)
async function handleUserAction(userId, action) {
    try {
        // Server will handle toggling the state (e.g., ban/unban)
        await secureFetch(`/admin/user/${userId}/action`, {
            method: 'POST',
            body: JSON.stringify({ action: action }) 
        });
        
        await fetchUsers(); 
        showMessage(`User action '${action}' completed`, "success");
    } catch (err) {
        console.error("handleUserAction error:", err);
        showMessage(`Failed to perform action: ${err.message}`, "error");
    }
}

// 5. Approve Transaction
async function approveTransaction(txId) {
    try {
        await secureFetch(`/admin/transaction/${txId}/approve`, {
            method: 'POST'
        });
        
        await fetchTransactions(); 
        await fetchUsers(); 
        showMessage("Transaction approved", "success");
    } catch (err) {
        console.error("approveTransaction error:", err);
        showMessage(`Approve failed: ${err.message}`, "error");
    }
}

// 6. Reject Transaction
async function rejectTransaction(txId) {
    try {
        await secureFetch(`/admin/transaction/${txId}/reject`, {
            method: 'POST'
        });
        
        await fetchTransactions(); 
        showMessage("Transaction rejected", "success");
    } catch (err) {
        console.error("rejectTransaction error:", err);
        showMessage(`Reject failed: ${err.message}`, "error");
    }
}

// 7. Send Message / Bill User
async function sendAdminAction(userId, message, billingAmount) {
     try {
        const body = { 
            message: message, 
            billingAmount: billingAmount 
        };
        
        await secureFetch(`/admin/user/${userId}/send-action`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
        
        if (billingAmount > 0) {
             await fetchUsers(); 
        }
        return true;
    } catch (err) {
        console.error("sendAdminAction error:", err);
        showMessage(`Error: ${err.message}`, "error");
        return false;
    }
}


/* ===========================
    Event Wiring
    =========================== */
function attachTableListeners() {
    if (listenersAttached) return;
    listenersAttached = true;

    if (usersTableBody) {
        usersTableBody.addEventListener("click", (e) => {
            const updateBtn = e.target.closest(".update-btn");
            const msgBtn = e.target.closest(".send-message-btn");
            const actionBtn = e.target.closest(".action-btn");

            if (updateBtn) {
                const userId = updateBtn.dataset.userid;
                const input = document.getElementById(`balance-input-${userId}`);
                const val = parseFloat(input?.value);
                if (isNaN(val) || val < 0) return showMessage("Enter valid non-negative balance", "error");
                updateUserBalance(userId, val);
            }

            if (msgBtn) {
                selectedUserId = msgBtn.dataset.userid;
                const username = msgBtn.dataset.username || selectedUserId;
                if (modalUserInfo) modalUserInfo.textContent = `To: ${username} (ID: ${selectedUserId.substring(0,8)}...)`;
                if (messageText) messageText.value = "";
                if (billingAmount) billingAmount.value = "";
                if (modalStatus) modalStatus.textContent = "";
                if (messageModal) messageModal.style.display = "flex";
            }

            if (actionBtn) {
                const uid = actionBtn.dataset.userId;
                const act = actionBtn.dataset.action;
                if (act === "delete") {
                    showConfirmation("Confirm deletion", `Delete user <strong>${uid.substring(0,8)}...</strong>? This is permanent.`, (ok) => {
                        if (ok) handleUserAction(uid, act);
                    });
                } else {
                    handleUserAction(uid, act);
                }
            }
        });
    }

    if (transactionsTableBody) {
        transactionsTableBody.addEventListener("click", (e) => {
            const approveBtn = e.target.closest(".approve-btn");
            const rejectBtn = e.target.closest(".reject-btn");
            if (approveBtn) {
                const txId = approveBtn.dataset.txid;
                const tx = transactions.find(t => String(t.id) === txId);
                if (!tx) return showMessage("Transaction not found locally", "error");
                showConfirmation("Approve transaction", `Approve TX ${txId.substring(0,8)}...?`, (ok) => { if (ok) approveTransaction(txId); });
            }
            if (rejectBtn) {
                const txId = rejectBtn.dataset.txid;
                showConfirmation("Reject transaction", `Reject TX ${txId.substring(0,8)}...?`, (ok) => { if (ok) rejectTransaction(txId); });
            }
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener("click", () => { if (messageModal) messageModal.style.display = "none"; });
    
    // NEW: Send Message/Bill button logic updated to use API fetch
    if (sendMessageBtn) sendMessageBtn.addEventListener("click", async () => {
        if (!selectedUserId) return showMessage("No user selected", "error");
        const msg = (messageText?.value || "").trim();
        const billing = Number(billingAmount?.value || 0);

        if (!msg && (!billing || billing <= 0)) {
            if (modalStatus) { modalStatus.textContent = "Enter message or positive billing amount"; modalStatus.style.color = "red"; }
            return;
        }

        if (modalStatus) { modalStatus.textContent = "Processing…"; modalStatus.style.color = "black"; }

        const success = await sendAdminAction(selectedUserId, msg, billing);
            
        if (success) {
            if (modalStatus) { modalStatus.textContent = "Action completed"; modalStatus.style.color = "green"; }
            setTimeout(() => { 
                if (messageModal) messageModal.style.display = "none"; 
                if (modalStatus) modalStatus.textContent = ""; 
            }, 900);
        } else {
             // Error status is set inside sendAdminAction
        }
    });

    // NEW: Logout handlers
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
    if (dropdownLogout) dropdownLogout.addEventListener("click", handleLogout);
}

// Utility function to decode JWT payload (for displaying user email/id)
function parseJwt (token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Function to handle logout
function handleLogout() {
    // Clear JWT and redirect
    localStorage.removeItem('jwtToken');
    jwtToken = null; // Clear local variable too
    window.location.href = LOGIN_PAGE;
}


/* ===========================
    INIT: Entry Point
    =========================== */

function checkAuthAndLoadData() {
    // 1. Check for JWT
    if (!jwtToken) {
        console.log("❌ No JWT token found. Redirecting to login.");
        window.location.href = LOGIN_PAGE;
        return;
    }

    // 2. Decode the token to get user info (client-side only)
    const tokenPayload = parseJwt(jwtToken);

    // Assuming the server puts an 'isAdmin' flag or role in the token payload
    if (!tokenPayload || tokenPayload.role !== 'admin') { 
        console.warn("❌ Token found but user is not an admin.");
        handleLogout(); // Force logout if not admin
        return;
    }

    // ✅ Admin confirmed - Start loading data
    console.log("✅ Authorization success: Admin confirmed");
    
    // Start data fetching loop (or simply fetch once/interval)
    fetchUsers();
    fetchTransactions();
    
    // Display admin information
    const adminNameEl = document.getElementById("admin-user-name");
    if (adminNameEl) {
      adminNameEl.textContent = `Welcome, Admin (${tokenPayload.email || tokenPayload.userId})`;
    }
}

async function init() {
    await domReady();
    injectModalsIfMissing();
    cacheDomRefs();
    ensureMessageContainer();
    ensureConfirmationModal();
    attachTableListeners();
    checkAuthAndLoadData();
}

init();