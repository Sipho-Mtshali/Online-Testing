        // Firebase configuration
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
        const navItems = document.querySelectorAll('.nav-item');
        const pageContents = document.querySelectorAll('.page-content');
        const logoutBtn = document.getElementById('logoutBtn');
        const userName = document.getElementById('userName');
        const topUserName = document.getElementById('topUserName');
        const addCourseBtn = document.getElementById('addCourseBtn');
        const createCourseBtn = document.getElementById('createCourseBtn');
        const createTestBtn = document.getElementById('createTestBtn');
        const courseModal = document.getElementById('courseModal');
        const testModal = document.getElementById('testModal');
        const closeCourseModal = document.getElementById('closeCourseModal');
        const closeTestModal = document.getElementById('closeTestModal');
        const closeModalButtons = document.querySelectorAll('.close-modal');
        const viewProfileBtn = document.getElementById('viewProfileBtn');
        const editProfileBtn = document.getElementById('editProfileBtn');

        // Navigation
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');
                
                // Update active nav item
                navItems.forEach(navItem => navItem.classList.remove('active'));
                item.classList.add('active');
                
                // Show corresponding page
                pageContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${page}-page`) {
                        content.classList.add('active');
                    }
                });
            });
        });

        // Modal Handling
        if (addCourseBtn) {
            addCourseBtn.addEventListener('click', () => {
                courseModal.style.display = 'flex';
            });
        }

        if (createCourseBtn) {
            createCourseBtn.addEventListener('click', () => {
                courseModal.style.display = 'flex';
            });
        }

        if (createTestBtn) {
            createTestBtn.addEventListener('click', () => {
                testModal.style.display = 'flex';
            });
        }

        if (closeCourseModal) {
            closeCourseModal.addEventListener('click', () => {
                courseModal.style.display = 'none';
            });
        }

        if (closeTestModal) {
            closeTestModal.addEventListener('click', () => {
                testModal.style.display = 'none';
            });
        }

        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                courseModal.style.display = 'none';
                testModal.style.display = 'none';
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === courseModal) {
                courseModal.style.display = 'none';
            }
            if (e.target === testModal) {
                testModal.style.display = 'none';
            }
        });

        // Profile buttons
        if (viewProfileBtn) {
            viewProfileBtn.addEventListener('click', () => {
                alert('View Profile functionality would open here');
            });
        }

        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                alert('Edit Profile functionality would open here');
            });
        }

        // Check authentication and load user data
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '../index.html';
                return;
            }

            try {
                // Verify user role
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (!userDoc.exists) {
                    alert('User data not found');
                    auth.signOut();
                    return;
                }

                const userData = userDoc.data();
                if (userData.role !== 'facilitator') {
                    alert('Access denied. Facilitators only.');
                    auth.signOut();
                    return;
                }

                // Update UI with user info
                userName.textContent = userData.name;
                topUserName.textContent = userData.name;

            } catch (error) {
                console.error('Error loading user data:', error);
                alert('Error loading dashboard');
            }
        });

        // Logout functionality
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = '../index.html';
            }).catch((error) => {
                console.error('Logout error:', error);
                alert('Error signing out');
            });
        });