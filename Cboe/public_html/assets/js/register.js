document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    const fullNameInput = document.getElementById('fullName');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');
    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close');
    const modalMessage = document.getElementById('modal-message');

    const fullNameError = document.getElementById('fullNameError');
    const usernameError = document.getElementById('usernameError');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const termsError = document.getElementById('termsError');

    const usernameFeedback = document.getElementById('usernameFeedback');
    const usernameSuggestions = document.getElementById('usernameSuggestions');
    const phoneFeedback = document.getElementById('phoneFeedback');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    const psi = document.querySelector('.password-strength-indicator');


    // utility function to display error messages
    const displayError = (element, message) => {
        element.textContent = message;
        element.style.display = 'block';
        element.previousElementSibling.classList.add('invalid'); // Add invalid class to input
        element.previousElementSibling.classList.remove('valid'); // remove valid class if present
    };

    // utility function to clear error messages
    const clearError = (element) => {
        element.textContent = '';
        element.style.display = 'none';
        element.previousElementSibling.classList.remove('invalid'); // Remove invalid class from input
        element.previousElementSibling.classList.add('valid'); // Add valid class to input
    };

    // --- Validation Functions ---
    // Full Name Validation
    const validateFullName = () => {
        const fullName = fullNameInput.value.trim();
        if (fullName === '') {
            displayError(fullNameError, 'Full Name is required.');
            return false;
        } else if (fullName.length < 3) {
            displayError(fullNameError, 'Full Name must be at least 3 characters.');
            return false;
        } else {
            clearError(fullNameError);
            return true;
        }
    };

    const takenUsernames = ['john', 'admin', 'testuser', 'guest123', 'username']; // pretend these are already taken

    // Username validation and suggestion
    usernameInput.addEventListener('input', () => {
        const value = usernameInput.value.trim();
        usernameSuggestions.innerHTML = '';
        usernameSuggestions.style.display = 'none';

        if (value.length < 6) {
            usernameFeedback.textContent = 'Username must be at least 6 characters';
            usernameFeedback.classList.remove('valid');
            return;
        }

        const isTaken = takenUsernames.includes(value.toLowerCase());
        if (isTaken) {
            usernameFeedback.textContent = 'This username is taken';
            usernameFeedback.classList.remove('valid');

            // show suggestions
            const suggestions = [
                value + Math.floor(Math.random() * 100),
                value + '_01',
                value + '_user',
            ];
            suggestions.forEach(s => {
                const li = document.createElement('li');
                li.textContent = s;
                li.addEventListener('click', () => {
                    usernameInput.value = s;
                    usernameFeedback.textContent = 'Available';
                    usernameFeedback.classList.add('valid');
                    usernameSuggestions.style.display = 'none';
                });
                usernameSuggestions.appendChild(li);
            });
            usernameSuggestions.style.display = 'block';
        } else {
            usernameFeedback.textContent = 'Username available';
            usernameFeedback.classList.add('valid');
        }
    });

    // Email Validation 
    const validateEmail = () => {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email === '') {
            displayError(emailError, 'Email is required.');
            return false;
        } else if (!emailRegex.test(email)) {
            displayError(emailError, 'Please enter a valid email address.');
            return false;
        } else {
            clearError(emailError);
            return true;
        }
    };

    // Phone Number validation
    phoneInput.addEventListener('input', () => {
        const value = phoneInput.value.trim();
        const phoneRegex = /^\+?[0-9]{7,15}$/; // supports international format
        if (!phoneRegex.test(value)) {
            phoneFeedback.textContent = 'Enter a phone number';
            phoneFeedback.classList.remove('valid');
        } else {
            phoneFeedback.textContent = 'Valid phone number';
            phoneFeedback.classList.add('valid');
        }
    });

    // Password Strength Check
    const checkPasswordStrength = (password) => {
        let strength = 0;
        let feedback = '';

        if (password.length >= 8) {
            strength += 1;
        } else {
            feedback += 'Password should be at least 8 characters.';
        }
        if (/[A-Z]/.test(password)) {
            strength += 1;
        } else {
            feedback += 'Include upperCase letters. ';
        }
        if (/[a-z]/.test(password)) {
            strength += 1;
        } else {
            feedback += 'Include lowerCase letters. ';
        }
        if (/[0-9]/.test(password)) {
            strength += 1;
        } else {
            feedback += 'Include numbers';
        }
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(password)) {
            strength += 1;
        } else {
            feedback += 'Include special characters. ';
        }

        strengthBar.className = 'strength-bar'; // Reset class name 
        if (strength === 0) {
            strengthBar.style.width = '0%';
            strengthText.textContent = '';
        } else if (strength < 3) {
            strengthBar.style.width = '33%';
            strengthBar.classList.add('weak');
            strengthText.textContent = 'Weak';
            strengthText.style.color = '#dc3545';
        } else if (strength < 5) {
            strengthBar.style.width = '66%';
            strengthBar.classList.add('moderate');
            strengthText.textContent = 'Moderate';
            strengthText.style.color = '#ffc107';
        } else {
            strengthBar.style.width = '100%';
            strengthBar.classList.add('strong');
            strengthText.textContent = 'Strong';
            strengthText.style.color = '#28a745';
        }

        return { strength, feedback };
    };

    // password validation
    const validatePassword = () => {
        const password = passwordInput.value;
        const { strength, feedback } = checkPasswordStrength(password);

        if (password.length === 0) {
            displayError(passwordError, 'Password is required.');
            strengthBar.style.width = '0%';
            strengthText.textContent = '';
            return false;
        } else if (strength < 5) {
            displayError(passwordError, `Password is too weak. ${feedback.trim()}`);
            return false;
        } else {
            clearError(passwordError);
            return true;
        }
    };

    // Confirm Password Validation
    const validateConfirmPassword = () => {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (confirmPassword === '') {
            displayError(confirmPasswordError, 'Confirm Password is required.');
            return false;
        } else if (password !== confirmPassword) {
            displayError(confirmPasswordError, 'Passwords do not match.');
            return false;
        } else {
            clearError(confirmPasswordError);
            return true;
        }
    };

    // Terms and Condition Validation
    const validateTerms = () => {
        if (!termsCheckbox.checked) {
            displayError(termsError, 'You must agree to the Terms and Conditions.');
            return false;
        } else {
            clearError(termsError);
            return true;
        }
    };

    //  Real-time validation
    fullNameInput.addEventListener('input', validateFullName);
    emailInput.addEventListener('input', validateEmail);
    passwordInput.addEventListener('input', () => {
        psi.style.display = 'block';
        validatePassword();
        validateConfirmPassword(); // Re-validate confirm password if password changes
    });
    confirmPasswordInput.addEventListener('input', validateConfirmPassword);
    termsCheckbox.addEventListener('change', validateTerms);


    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Run all validations
        const isFullNameValid = validateFullName();
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        const isConfirmPasswordValid = validateConfirmPassword();
        const isTermsValid = validateTerms();

        if (isFullNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isTermsValid) {
            // Extract values
            const fullName = fullNameInput.value.trim();
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const phone = phoneInput.value.trim();
            const password = passwordInput.value;

            try {
                // Check if username or email already exists in db
                const response = await fetch(`http://localhost:5500/users?username=${username}&email=${email}`);
                const existingUsers = await response.json();

                const usernameExists = existingUsers.some(user => user.username === username);
                const emailExists = existingUsers.some(user => user.email === email);

                if (usernameExists || emailExists) {
                    if (usernameExists) displayError(usernameError, 'Username is already taken.');
                    if (emailExists) displayError(emailError, 'Email is already registered.');
                    return;
                }

                // If not exists, register new user
                const newUser = {
                    fullName,
                    username,
                    email,
                    phone,
                    password // In real-world apps, never store raw passwords!
                };

                const postRes = await fetch(`http://localhost:5500/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newUser)
                });

                if (!postRes.ok) {
                    throw new Error('Failed to register user.');
                }

                // Show success modal
                modalMessage.textContent = 'Thank you for signing up! You will be redirected to the login page in 3 seconds.';
                modal.style.display = 'block';

                setTimeout(() => {
                    window.location.href = "../login/login.html";
                }, 3000);

                closeBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                });

                window.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                    }
                });

                form.reset();
                strengthBar.style.width = '0%';
                strengthText.textContent = '';
                document.querySelectorAll('input').forEach(input => {
                    input.classList.remove('valid', 'invalid');
                });

            } catch (err) {
                console.error('Error:', err);
                modalMessage.textContent = 'An error occurred while registering. Please try again.';
                modal.style.display = 'block';
            }

        } else {
            modalMessage.textContent = 'Please correct the errors in the form.';
            modal.style.display = 'block';
        }
    });


    /* Eye toggle */
    // const toggles = document.querySelectorAll('.toggle-eye');

    // toggles.forEach(toggle => {
    //     toggle.addEventListener('click', () => {
    //         const inputId = toggle.getAttribute('data-target');

    //         const isPassword = input.type === 'password';
    //         input.type = isPassword ? 'text' : 'password';
    //         toggle.classList.toggle('fa-eye', !isPassword);
    //         toggle.classList.toggle('fa-eye-slash', isPassword);
    //         toggle.style.color = isPassword ? '#0066cc' : '#666';
    //     });
    // });
});