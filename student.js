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

// Sample courses data
const sampleCourses = [
    {
        title: "Introduction to Programming",
        description: "Learn the basics of programming with Python",
        progress: 75,
        testsAvailable: 5
    },
    {
        title: "Web Development",
        description: "Build modern web applications with HTML, CSS, and JavaScript",
        progress: 60,
        testsAvailable: 8
    },
    {
        title: "Database Management",
        description: "Master SQL and database design principles",
        progress: 40,
        testsAvailable: 6
    },
    {
        title: "Data Structures",
        description: "Understanding algorithms and data structures",
        progress: 90,
        testsAvailable: 10
    }
];

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
        if (userData.role !== 'student') {
            alert('Access denied. Students only.');
            auth.signOut();
            return;
        }

        // Update UI with user info
        document.getElementById('welcomeMessage').textContent = `Welcome, ${userData.name}!`;
        document.getElementById('userEmail').textContent = userData.email;

        // Load courses
        loadCourses();

    } catch (error) {
        console.error('Error loading user data:', error);
        alert('Error loading dashboard');
    }
});

// Load courses
function loadCourses() {
    const coursesGrid = document.getElementById('coursesGrid');
    coursesGrid.innerHTML = '';

    sampleCourses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.innerHTML = `
            <h3>${course.title}</h3>
            <p>${course.description}</p>
            <div style="margin-top: 1rem;">
                <small>Progress: ${course.progress}% | Tests: ${course.testsAvailable}</small>
            </div>
        `;
        
        courseCard.addEventListener('click', () => {
            alert(`Opening ${course.title}...`);
        });

        coursesGrid.appendChild(courseCard);
    });
}

