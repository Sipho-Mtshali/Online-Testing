        // Firebase Configuration - Replace with your actual config
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
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');

        // Toggle between login and signup forms
        showSignupBtn.addEventListener('click', () => {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            clearMessages();
        });

        showLoginBtn.addEventListener('click', () => {
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
            clearMessages();
        });

        // Clear error/success messages
        function clearMessages() {
            errorMessage.textContent = '';
            successMessage.textContent = '';
        }

        // Show error message
        function showError(message) {
            errorMessage.textContent = message;
            successMessage.textContent = '';
        }

        // Show success message
        function showSuccess(message) {
            successMessage.textContent = message;
            errorMessage.textContent = '';
        }

        // Login function
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            if (!email || !password) {
                showError('Please fill in all fields');
                return;
            }

            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Get user role from Firestore
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    
                    // Redirect based on role
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
                } else {
                    showError('User data not found');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError(error.message);
            }
        });

        // Signup function
        signupBtn.addEventListener('click', async () => {
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const role = document.getElementById('userRole').value;

            if (!name || !email || !password) {
                showError('Please fill in all fields');
                return;
            }

            try {
                // Create user with email and password
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Save user data to Firestore
                await db.collection('users').doc(user.uid).set({
                    name: name,
                    email: email,
                    role: role,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                showSuccess('Account created successfully! Redirecting...');
                
                // Redirect based on role after a short delay
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
                showError(error.message);
            }
        });

        // Check if user is already logged in
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // Get user role from Firestore
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        
                        // Redirect based on role
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
                } catch (error) {
                    console.error('Auth state change error:', error);
                }
            }
        });