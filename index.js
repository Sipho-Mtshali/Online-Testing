       // Firebase Configuration
        const firebaseConfig = {
            apiKey: "AIzaSyC8m_iv91L2EUEc6Xsg5DJHGWTdfUcxGZY",
            authDomain: "edutech-system.firebaseapp.com",
            projectId: "edutech-system",
            storageBucket: "edutech-system.firebasestorage.app",
            messagingSenderId: "1072073327476",
            appId: "1:1072073327476:web:5fdd0c76218a3a772ca221",
            measurementId: "G-6M9540ZEPE"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // DOM Elements
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const showSignupBtn = document.getElementById('showSignup');
        const showLoginBtn = document.getElementById('showLogin');
        const loginFormElement = document.getElementById('loginFormElement');
        const signupFormElement = document.getElementById('signupFormElement');
        const signInBtn = document.getElementById('signInBtn');
        const signUpBtn = document.getElementById('signUpBtn');

        // Message elements
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const signupErrorMessage = document.getElementById('signupErrorMessage');
        const signupSuccessMessage = document.getElementById('signupSuccessMessage');

        // Toggle password visibility
        function togglePassword() {
            const passwordInput = document.getElementById('password');
            const toggleBtn = passwordInput.nextElementSibling;
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleBtn.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                toggleBtn.textContent = '👁️';
            }
        }

        function toggleSignupPassword() {
            const passwordInput = document.getElementById('signupPassword');
            const toggleBtn = passwordInput.nextElementSibling;
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleBtn.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                toggleBtn.textContent = '👁️';
            }
        }

        // Toggle forms
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            clearMessages();
        });

        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
            clearMessages();
        });

        // Clear messages
        function clearMessages() {
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
            signupErrorMessage.style.display = 'none';
            signupSuccessMessage.style.display = 'none';
        }

        // Show messages
        function showError(message, isSignup = false) {
            const errorEl = isSignup ? signupErrorMessage : errorMessage;
            const successEl = isSignup ? signupSuccessMessage : successMessage;
            
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            successEl.style.display = 'none';
        }

        function showSuccess(message, isSignup = false) {
            const errorEl = isSignup ? signupErrorMessage : errorMessage;
            const successEl = isSignup ? signupSuccessMessage : successMessage;
            
            successEl.textContent = message;
            successEl.style.display = 'block';
            errorEl.style.display = 'none';
        }

        // Loading states
        function setLoading(isLoading, isSignup = false) {
            const btn = isSignup ? signUpBtn : signInBtn;
            const spinner = btn.querySelector('.loading-spinner');
            const text = btn.querySelector(isSignup ? '#signupBtnText' : '#btnText');
            
            if (isLoading) {
                btn.disabled = true;
                spinner.style.display = 'inline-block';
                text.textContent = isSignup ? 'Creating Account...' : 'Signing In...';
            } else {
                btn.disabled = false;
                spinner.style.display = 'none';
                text.textContent = isSignup ? 'Create Account' : 'Sign In';
            }
        }

        // Login handler
        loginFormElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            if (!email || !password) {
                showError('Please fill in all fields');
                return;
            }

            setLoading(true);
            clearMessages();

            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Wait a moment for Firestore to be ready
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Get user role from Firestore with retry logic
                let userDoc;
                let retries = 3;
                
                while (retries > 0) {
                    try {
                        userDoc = await db.collection('users').doc(user.uid).get();
                        if (userDoc.exists) {
                            break;
                        }
                        retries--;
                        if (retries > 0) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    } catch (error) {
                        console.log('Retry attempt for user doc:', error);
                        retries--;
                        if (retries > 0) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }
                
                if (userDoc && userDoc.exists) {
                    const userData = userDoc.data();
                    showSuccess('Login successful! Redirecting...');
                    
                    // Redirect based on role
                    setTimeout(() => {
                        switch (userData.role) {
                            case 'student':
                                window.location.href = 'student.html';
                                break;
                            case 'facilitator':
                                window.location.href = 'facilitator.html';
                                break;
                            case 'admin':
                                window.location.href = 'admin.html';
                                break;
                            default:
                                showError('Unknown user role');
                        }
                    }, 1500);
                } else {
                    showError('User data not found. Please contact support.');
                }
                
            } catch (error) {
                console.error('Login error:', error);
                let errorMsg = 'Login failed. Please try again.';
                
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMsg = 'No account found with this email.';
                        break;
                    case 'auth/wrong-password':
                        errorMsg = 'Incorrect password.';
                        break;
                    case 'auth/invalid-email':
                        errorMsg = 'Please enter a valid email address.';
                        break;
                    case 'auth/too-many-requests':
                        errorMsg = 'Too many failed attempts. Please try again later.';
                        break;
                }
                
                showError(errorMsg);
            } finally {
                setLoading(false);
            }
        });

        // Signup handler
        signupFormElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('fullName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const role = document.querySelector('input[name="role"]:checked').value;

            if (!name || !email || !password) {
                showError('Please fill in all fields', true);
                return;
            }

            if (password.length < 6) {
                showError('Password must be at least 6 characters long', true);
                return;
            }

            setLoading(true, true);
            clearMessages();

            try {
                // Create user
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Save user data to Firestore
                await db.collection('users').doc(user.uid).set({
                    name: name,
                    email: email,
                    role: role,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                showSuccess('Account created successfully! Redirecting...', true);
                
                // Redirect based on role
                setTimeout(() => {
                    switch (role) {
                        case 'student':
                            window.location.href = 'student.html';
                            break;
                        case 'facilitator':
                            window.location.href = 'facilitator.html';
                            break;
                        case 'admin':
                            window.location.href = 'admin.html';
                            break;
                    }
                }, 1500);

            } catch (error) {
                console.error('Signup error:', error);
                let errorMsg = 'Account creation failed. Please try again.';
                
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMsg = 'An account with this email already exists.';
                        break;
                    case 'auth/invalid-email':
                        errorMsg = 'Please enter a valid email address.';
                        break;
                    case 'auth/weak-password':
                        errorMsg = 'Please choose a stronger password.';
                        break;
                }
                
                showError(errorMsg, true);
            } finally {
                setLoading(false, true);
            }
        });

        // Check authentication state (with improved error handling)
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // Add delay to ensure Firestore is ready
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        
                        // Only redirect if we're on the login page and not in the middle of login/signup process
                        if (!signInBtn.disabled && !signUpBtn.disabled) {
                            switch (userData.role) {
                                case 'student':
                                    window.location.href = 'student.html';
                                    break;
                                case 'facilitator':
                                    window.location.href = 'facilitator.html';
                                    break;
                                case 'admin':
                                    window.location.href = 'admin.html';
                                    break;
                            }
                        }
                    }
                } catch (error) {
                    console.error('Auth state change error:', error);
                    // Don't show error to user as this is background check
                }
            }
        });