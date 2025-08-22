window.addEventListener('DOMContentLoaded', () => {
    const demoUser = {
        username: "demo_user",
        password: "1234asd",
        balance: 250,
        pendingDeposits: [200],
        pendingWithdrawals: [100],
        messages: ["Welcome to your account"]
    };

    localStorage.setItem('user_demoUser', JSON.stringify(demoUser))


    if (!localStorage.getItem('user_demo_user')) {
        localStorage.setItem('user_demo_user', JSON.stringify(demoUser));
        let allUsers = JSON.parse(localStorage.getItem('allUsers')) || [];
        if (!allUsers.includes("demo_user")) {
            allUsers.push("demo_user");
            localStorage.setItem('allUsers', JSON.stringify(allUsers));
        }
    }

    // protect route
    if (sessionStorage.getItem('isAdmin') !== 'true') {
        window.location.href = 'admin.html';
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('isAdmin');
        window.location.href = 'admin.html';
    });

    function renderAdminUserTable() {
        const tBody = document.getElementById('adminUserTableBody');
        tBody.innerHTML = "";

        const allUsers = JSON.parse(localStorage.getItem('allUsers')) || [];
        allUsers.forEach(username => {
            const key = `user_${username}`;
            const user = JSON.parse(localStorage.getItem(key));
            if (!allUsers) return;

            const tr = document.createElement('tr');

            const depositList = user.pendingDeposits?.map(
                (amount, i) => `<div>$${amount} 
                <button data-user="${username}" data-index="${i}" class="approve-deposit">Approve</button>
                <button data-user="${username}" data-index="${i}" class="decline-deposit">Decline</button>
                </div>`
            ).join("") || "-";

            const withdrawalList = user.pendingWithdrawals?.map(
                (amount, i) => `<div>$${amount} 
                <button data-user="${username}" data-index="${i}" class="approve-withdraw">Approve</button>
                <button data-user="${username}" data-index="${i}" class="decline-withdraw">Decline</button>
                </div>`
            ).join("") || "-";

            const messageList = user.messages?.length
                ? `<ul>${user.messages.map(msg => `<li>${msg}</li>`).join("")}</ul>`
                : "-";

            // example: display in table
            tr.innerHTML = `
        <td>${username}</td>
        <td>$<span class="balance" data-user="${username}">${user.balance.toFixed(2)}</span></td>
        <td>${depositList}</td>
        <td>${withdrawalList}</td>
        <td>${messageList}</td>
        <td>
        <button class="edit-balance" data-user"${username}">Edit Balance</button>
        <button class="action-btn" onclick="openSendMessage('${username}')">Message</button>
        </td>
        `;
            tBody.appendChild(tr);
        });
        attachAdminActions();
    }


    function attachAdminActions() {
        document.querySelectorAll('.edit-balance').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.user;
                const key = `user_${username}`;
                const user = JSON.parse(localStorage.getItem(key));
                const newBalance = parseFloat(prompt("Enter new balance:", user.balance));
                if (!isNaN(newBalance)) {
                    user.balance = newBalance;
                    localStorage.setItem(key, JSON.stringify(user));
                    renderAdminUserTable();
                }
            });
        });

        // deposit

        document.querySelectorAll('.approve-deposit').forEach(btn => {
            btn.addEventListener('click', () => {
                const { user, index } = btn.dataset;
                const key = `user_${user}`;
                const data = JSON.parse(localStorage.getItem(key));
                const amount = data.pendingDeposits.splice(index, 1)[0];
                data.balance += amount;
                localStorage.setItem(key, JSON.stringify(data));
                renderAdminUserTable();
            });
        });

        document.querySelectorAll('.decline-deposit').forEach(btn => {
            btn.addEventListener('click', () => {
                const { user, index } = btn.dataset;
                const key = `user_${user}`;
                const data = JSON.parse(localStorage.getItem(key));
                data.pendingDeposits.splice(index, 1);
                localStorage.setItem(key, JSON.stringify(data));
                renderAdminUserTable();
            });
        });

        // widthdrawal
        document.querySelectorAll('.approve-withdraw').forEach(btn => {
            btn.addEventListener('click', () => {
                const { user, index } = btn.dataset;
                const key = `user_${user}`;
                const data = JSON.parse(localStorage.getItem(key));
                const amount = data.pendingWithdrawals.splice(index, 1)[0];
                data.balance -= amount;
                localStorage.setItem(key, JSON.stringify(data));
                renderAdminUserTable();
            });
        });

        document.querySelectorAll('.decline-withdraw').forEach(btn => {
            btn.addEventListener('click', () => {
                const { user, index } = btn.dataset;
                const key = `user_${user}`;
                const data = JSON.parse(localStorage.getItem(key));
                data.pendingWithdrawals.splice(index, 1);
                localStorage.setItem(key, JSON.stringify(data));
                renderAdminUserTable();
            });
        });
    }


    // load user
    // fetch('users.json')
    //     .then(res => res.json())
    //     .then(users => {
    //         const userList = document.getElementById('userList')
    //         const depositList = document.getElementById('depositList')
    //         const withdrawalList = document.getElementById('withdrawalList')
    //         const targetUser = document.getElementById('targetUser')

    //         users.forEach(user => {
    //             // user List
    //             const userItem = document.createElement('li');
    //             userItem.textContent = `${user.username} (${user.email}) - Balance: $${user.balance}`;
    //             userList.appendChild(li);

    //             // deposits
    //             user.deposits.forEach(amount => {
    //                 const li = document.createElement('li');
    //                 li.textContent = `${user.username}: $${amount}`;
    //                 depositList.appendChild(li);
    //             });

    //             // withdrawals
    //             user.withdrawals.forEach(amount => {
    //                 const li = document.createElement('li');
    //                 li.textContent = `${user.username}: $${amount}`;
    //                 withdrawalList.appendChild(li);
    //             });

    //             // drop down
    //             const opt = document.createElement('option');
    //             opt.value = user.username;
    //             opt.textContent = user.username;
    //             targetUserSelect.appendChild(opt);
    //         });
    //     });

    // // handle message send
    // document.getElementById('adminMessageForm').addEventListener('submit', (e) => {
    //     e.preventDefault();

    //     const user = document.getElementById('targetUser').value;
    //     const msg = document.getElementById('adminMessage').value;
    //     const status = document.getElementById('messageStatus').value;

    //     if (!user || !msg.trim()) {
    //         status.style.color = 'red';
    //         status.textContent = 'Please select a user and enter a message.';
    //         return;
    //     }

    //     // in real app: send via API
    //     status.style.color = 'green';
    //     status.textContent = `Message sent to ${user}`;
    //     document.getElementById('adminMessage').value = '';
    // });
});