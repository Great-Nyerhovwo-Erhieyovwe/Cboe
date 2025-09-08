document.addEventListener('DOMContentLoaded', () => {
  const API_USERS = 'http://172.20.10.4:5000/users';
  const API_TRANSACTIONS = 'http://172.20.10.4:5000/transactions';
  const API_MESSAGES = 'http://172.20.10.4:5000/messages';

  const messageContainer = document.getElementById('message-container');
  const usersTableBody = document.querySelector('#users-table tbody');
  const transactionsTableBody = document.querySelector('#transactions-table tbody');

  // Modal Elements
  const messageModal = document.createElement('div');
  messageModal.id = 'messageModal';
  messageModal.style.display = 'none';
  messageModal.style.position = 'fixed';
  messageModal.style.top = '0';
  messageModal.style.left = '0';
  messageModal.style.width = '100%';
  messageModal.style.height = '100%';
  messageModal.style.background = 'rgba(0,0,0,0.5)';
  messageModal.style.justifyContent = 'center';
  messageModal.style.alignItems = 'center';
  messageModal.innerHTML = `
    <div style="background:#fff; padding:20px; width:400px; border-radius:8px; position:relative;">
      <h3>Send Message / Billing</h3>
      <p id="modalUserInfo"></p>

      <label for="messageText">Message:</label><br/>
      <textarea id="messageText" rows="4" style="width:100%;"></textarea><br/><br/>

      <label for="billingAmount">Billing Amount ($):</label><br/>
      <input type="number" id="billingAmount" min="0" step="0.01" style="width:100%;" /><br/><br/>

      <button id="sendMessageBtn">Send</button>
      <button id="closeModalBtn" style="margin-left:10px;">Cancel</button>

      <p id="modalStatus" style="margin-top:10px;"></p>
    </div>
  `;
  document.body.appendChild(messageModal);

  const modalUserInfo = document.getElementById('modalUserInfo');
  const messageText = document.getElementById('messageText');
  const billingAmount = document.getElementById('billingAmount');
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalStatus = document.getElementById('modalStatus');

  let selectedUserId = null;
  let users = [];
  let transactions = [];

  function showMessage(text, type = 'success') {
    messageContainer.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'message ' + type;
    div.textContent = text;
    messageContainer.appendChild(div);
    setTimeout(() => div.remove(), 4000);
  }

  async function fetchUsers() {
    try {
      const res = await fetch(API_USERS);
      if (!res.ok) throw new Error('Failed to fetch users');
      users = await res.json();
      renderUsers();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  async function fetchTransactions() {
    try {
      const res = await fetch(`${API_TRANSACTIONS}?status=pending`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      transactions = await res.json();
      renderTransactions();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  function renderUsers() {
    usersTableBody.innerHTML = '';
    users.forEach(user => {
      const tr = document.createElement('tr');
      const balanceNum = Number(user.balance) || 0;

      tr.innerHTML = `
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${balanceNum.toFixed(2)}</td>
        <td>
          <input type="number" min="0" step="0.01" placeholder="New balance" id="balance-input-${user.id}" />
          <button class="update-btn" data-userid="${user.id}">Update</button>
        </td>
        <td>
          <button class="send-message-btn" data-userid="${user.id}" data-username="${user.username}">Message</button>
        </td>
      `;

      usersTableBody.appendChild(tr);
    });

    document.querySelectorAll('.update-btn').forEach(button => {
      button.addEventListener('click', () => {
        const userId = button.getAttribute('data-userid');
        const input = document.getElementById(`balance-input-${userId}`);
        const newBalance = parseFloat(input.value);

        if (isNaN(newBalance) || newBalance < 0) {
          showMessage('Please enter a valid non-negative balance.', 'error');
          return;
        }

        updateUserBalance(userId, newBalance);
      });
    });

    document.querySelectorAll('.send-message-btn').forEach(button => {
      button.addEventListener('click', () => {
        selectedUserId = button.getAttribute('data-userid');
        const username = button.getAttribute('data-username');
        modalUserInfo.textContent = `To: ${username} (ID: ${selectedUserId})`;
        messageText.value = '';
        billingAmount.value = '';
        modalStatus.textContent = '';
        messageModal.style.display = 'flex';
      });
    });
  }

  async function updateUserBalance(userId, newBalance) {
    try {
      const res = await fetch(`${API_USERS}/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBalance })
      });
      if (!res.ok) throw new Error('Failed to update balance');
      showMessage('Balance updated successfully');
      await fetchUsers();
      await fetchTransactions();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  function renderTransactions() {
    transactionsTableBody.innerHTML = '';

    if (transactions.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" style="text-align:center;">No pending transactions</td>`;
      transactionsTableBody.appendChild(tr);
      return;
    }

    transactions.forEach(tx => {
      const user = users.find(u => u.id == tx.userId);
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${tx.id}</td>
        <td>${user ? user.username : 'Unknown'}</td>
        <td style="text-transform: capitalize;">${tx.type}</td>
        <td>${Number(tx.amount).toFixed(2)}</td>
        <td>
          <button class="approve-btn" data-txid="${tx.id}">Approve</button>
          <button class="reject-btn" data-txid="${tx.id}">Reject</button>
        </td>
      `;

      transactionsTableBody.appendChild(tr);
    });

    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const txId = btn.getAttribute('data-txid');
        const tx = transactions.find(t => t.id == txId);
        if (tx) approveTransaction(tx);
      });
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const txId = btn.getAttribute('data-txid');
        rejectTransaction(txId);
      });
    });
  }

  async function approveTransaction(tx) {
    try {
      const user = users.find(u => u.id == tx.userId);
      if (!user) {
        showMessage('User not found', 'error');
        return;
      }

      let newBalance = Number(user.balance) || 0;
      const txAmount = Number(tx.amount) || 0;

      if (tx.type === 'deposit') {
        newBalance += txAmount;
      } else if (tx.type === 'withdrawal') {
        if (txAmount > newBalance) {
          showMessage('Cannot approve withdrawal: insufficient balance.', 'error');
          return;
        }
        newBalance -= txAmount;
      }

      await fetch(`${API_USERS}/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBalance })
      });

      await fetch(`${API_TRANSACTIONS}/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });

      showMessage(`Transaction #${tx.id} approved.`);
      await fetchUsers();
      await fetchTransactions();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  async function rejectTransaction(txId) {
    if (!confirm('Reject this transaction?')) return;

    try {
      await fetch(`${API_TRANSACTIONS}/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
      showMessage(`Transaction #${txId} rejected.`);
      await fetchTransactions();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  // Modal close
  closeModalBtn.addEventListener('click', () => {
    messageModal.style.display = 'none';
  });

  // Modal submit
  sendMessageBtn.addEventListener('click', async () => {
    if (!selectedUserId) return;

    const message = messageText.value.trim();
    const billing = parseFloat(billingAmount.value);

    if (!message && (isNaN(billing) || billing < 0)) {
      modalStatus.textContent = 'Please enter a message or a valid billing amount.';
      modalStatus.style.color = 'red';
      return;
    }

    modalStatus.textContent = 'Sending...';
    modalStatus.style.color = 'black';

    const payload = {
      userId: selectedUserId,
      message: message || null,
      billingAmount: isNaN(billing) ? null : billing,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch(API_MESSAGES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to send message');

      modalStatus.textContent = 'Message sent successfully!';
      modalStatus.style.color = 'green';

      setTimeout(() => {
        messageModal.style.display = 'none';
      }, 1500);
    } catch (error) {
      modalStatus.textContent = error.message;
      modalStatus.style.color = 'red';
    }
  });

  async function init() {
    await fetchUsers();
    await fetchTransactions();
  }

  init();
});
