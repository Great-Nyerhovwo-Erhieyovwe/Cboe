const loginForm = document.getElementById('loginForm');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalIcon = document.getElementById('modalIcon');
const closeModal = document.getElementById('closeModal');
const modalSpinner = document.getElementById('modalSpinner');

loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let errors = [];

    !email && errors.push('Email is required.');
    !password && errors.push('Password is required.');
    email && !emailPattern.test(email) && errors.push('Invalid email format.');
    password && password.length < 6 && errors.push('Password must be at least 6 characters.');

    if (errors.length > 0) {
        showModal('Login Error', errors.join(" "));
    } else {
        showModal('Login Successful', "Welcome back! Redirecting....");

        sessionStorage.setItem('isUser', 'true');

        // option redirecting after a delay
        setTimeout(() => {
            window.location.href = "../Dashboard3/index.html"; // replacable
        }, 2000);
    }
});



function showModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.style.display = "block";
}

closeModal.onclick = function () {
    modal.style.display = "none";
};

window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
};




