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

// Global variables
let currentUser = null;
let modules = [];
let tests = [];
let students = [];
let testResults = [];

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const pageContents = document.querySelectorAll('.page-content');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const topUserName = document.getElementById('topUserName');
const addModuleBtn = document.getElementById('addModuleBtn');
const createModuleBtn = document.getElementById('createModuleBtn');
const createTestBtn = document.getElementById('createTestBtn');
const moduleModal = document.getElementById('moduleModal');
const testModal = document.getElementById('testModal');
const editProfileModal = document.getElementById('editProfileModal');
const changePasswordModal = document.getElementById('changePasswordModal');
const studentTestDetailsModal = document.getElementById('studentTestDetailsModal');
const closeModuleModal = document.getElementById('closeModuleModal');
const closeTestModal = document.getElementById('closeTestModal');
const closeEditProfileModal = document.getElementById('closeEditProfileModal');
const viewProfileBtn = document.getElementById('viewProfileBtn');
const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileMainBtn = document.getElementById('editProfileMainBtn');
const changePasswordBtn = document.getElementById('changePasswordBtn');

// Authentication Check
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserProfile();
        loadInitialData();
    } else {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
    }
});

// Load user profile data
async function loadUserProfile() {
    try {
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentUser = { ...auth.currentUser, ...userData };
            updateProfileDisplay();
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}
// In Facilitator.js, update the updateProfileDisplay function
function updateProfileDisplay() {
    if (currentUser) {
        document.getElementById('topUserName').textContent = currentUser.name || 'User';
        document.getElementById('profile-name').textContent = currentUser.name || 'N/A';
        document.getElementById('profile-email').textContent = currentUser.email || 'N/A';
        document.getElementById('profile-id').textContent = currentUser.staffId || 'N/A';
        document.getElementById('profile-gender').textContent = currentUser.gender || 'N/A';
        document.getElementById('profile-additional-name').textContent = currentUser.additionalName || 'N/A';
        document.getElementById('profile-birthday').textContent = currentUser.birthday || 'N/A';
        document.getElementById('profile-education').textContent = currentUser.education || 'N/A';
        document.getElementById('profile-language').textContent = currentUser.language || 'English (United States)';
        document.getElementById('profile-privacy').textContent = currentUser.privacy || 'Only instructors can view my profile information';
        document.getElementById('profile-notifications').textContent = currentUser.notifications || 'Stream notifications';
        document.getElementById('profile-email-notifications').textContent = currentUser.emailNotifications || 'Push notifications';
    }
}

// Load initial data
function loadInitialData() {
    loadModules();
    loadTests();
    loadStudents();
    loadTestResults();
    updateDashboardStats();
}

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

        // Load page-specific data
        if (page === 'modules') {
            loadAllModules();
        } else if (page === 'tests') {
            loadTests();
        } else if (page === 'analytics') {
            loadAnalytics();
        }
    });
});

// Modal Handling
if (addModuleBtn) {
    addModuleBtn.addEventListener('click', () => {
        clearModuleForm();
        document.getElementById('moduleModalTitle').textContent = 'Add New Module';
        document.getElementById('moduleSubmitBtn').textContent = 'Create Module';
        moduleModal.style.display = 'flex';
    });
}

if (createModuleBtn) {
    createModuleBtn.addEventListener('click', () => {
        clearModuleForm();
        document.querySelector('#moduleModal .modal-title').textContent = 'Add New Module';
        document.querySelector('#moduleModal .btn-primary').textContent = 'Create Module';
        moduleModal.style.display = 'flex';
    });
}

if (createTestBtn) {
    createTestBtn.addEventListener('click', () => {
        clearTestForm();
        document.querySelector('#testModal .modal-title').textContent = 'Create New Test';
        document.querySelector('#testModal .btn-primary').textContent = 'Create Test';
        loadModulesForTest();
        testModal.style.display = 'flex';
    });
}

// Close modals
function setupModalClosers() {
    const modals = [
        { modal: moduleModal, closer: closeModuleModal },
        { modal: testModal, closer: closeTestModal },
        { modal: editProfileModal, closer: closeEditProfileModal },
        { modal: changePasswordModal, closer: document.getElementById('closeChangePasswordModal') },
        { modal: studentTestDetailsModal, closer: document.querySelector('#studentTestDetailsModal .close-modal') }
    ];

    modals.forEach(({ modal, closer }) => {
        if (closer && modal) {
            closer.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        modals.forEach(({ modal }) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Initialize modal closers
setupModalClosers();

// Profile buttons
if (editProfileMainBtn) {
    editProfileMainBtn.addEventListener('click', openEditProfile);
}

if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
        changePasswordModal.style.display = 'flex';
    });
}

// Edit Profile functionality
function openEditProfile() {
    if (!currentUser) return;
    
    // Pre-fill the form with current user data
    document.getElementById('editName').value = currentUser.name || '';
    document.getElementById('editEmail').value = currentUser.email || '';
    document.getElementById('editGender').value = currentUser.gender || 'Male';
    document.getElementById('editAdditionalName').value = currentUser.additionalName || '';
    document.getElementById('editBirthday').value = currentUser.birthday || '';
    document.getElementById('editEducation').value = currentUser.education || 'Degree';
    document.getElementById('editLanguage').value = currentUser.language || 'English (United States)';
    document.getElementById('editPrivacy').value = currentUser.privacy || 'Only instructors can view my profile information';
    
    editProfileModal.style.display = 'flex';
}
// Handle Edit Profile Form Submission
document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const updatedData = {
        name: document.getElementById('editName').value,
        email: document.getElementById('editEmail').value,
        gender: document.getElementById('editGender').value,
        additionalName: document.getElementById('editAdditionalName').value,
        birthday: document.getElementById('editBirthday').value,
        education: document.getElementById('editEducation').value,
        language: document.getElementById('editLanguage').value,
        privacy: document.getElementById('editPrivacy').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    // Note: staffId is not included in updatedData since it shouldn't be editable
    try {
        await db.collection('users').doc(auth.currentUser.uid).update(updatedData);
        currentUser = { ...currentUser, ...updatedData };
        updateProfileDisplay();
        editProfileModal.style.display = 'none';
        showNotification('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Error updating profile. Please try again.', 'error');
    }
});

// Handle Change Password Form Submission
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match!', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('Password must be at least 6 characters long!', 'error');
        return;
    }
    
    try {
        const credential = firebase.auth.EmailAuthProvider.credential(
            auth.currentUser.email,
            currentPassword
        );
        
        await auth.currentUser.reauthenticateWithCredential(credential);
        await auth.currentUser.updatePassword(newPassword);
        
        changePasswordModal.style.display = 'none';
        document.getElementById('changePasswordForm').reset();
        showNotification('Password updated successfully!', 'success');
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('Error changing password. Please check your current password.', 'error');
    }
});

// Module Management Functions
function clearModuleForm() {
    document.getElementById('moduleForm').reset();
    document.getElementById('moduleId').value = '';
}

async function handleModuleSubmit(e) {
    e.preventDefault();
    
    const moduleId = document.getElementById('moduleId').value;
    const moduleData = {
        code: document.getElementById('moduleCode').value,
        name: document.getElementById('moduleName').value,
        description: document.getElementById('moduleDescription').value,
        status: document.getElementById('moduleStatus').value,
        facilitatorId: auth.currentUser.uid,
        facilitatorName: currentUser.name,
        createdAt: moduleId ? null : firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (moduleId) {
            // Update existing module
            await db.collection('modules').doc(moduleId).update(moduleData);
            showNotification('Module updated successfully!', 'success');
        } else {
            // Create new module
            await db.collection('modules').add(moduleData);
            showNotification('Module created successfully!', 'success');
        }
        
        moduleModal.style.display = 'none';
        loadModules();
        loadAllModules();
    } catch (error) {
        console.error('Error saving module:', error);
        showNotification('Error saving module. Please try again.', 'error');
    }
}

// Add event listener for module form
document.getElementById('moduleForm').addEventListener('submit', handleModuleSubmit);

async function loadModules() {
    if (!auth.currentUser) return;
    
    try {
        const snapshot = await db.collection('modules')
            .where('facilitatorId', '==', auth.currentUser.uid)
            .get();
        
        modules = [];
        snapshot.forEach(doc => {
            modules.push({ id: doc.id, ...doc.data() });
        });
        
        displayModules();
        updateDashboardStats();
    } catch (error) {
        console.error('Error loading modules:', error);
    }
}

function displayModules() {
    const modulesGrid = document.querySelector('.courses-grid');
    if (!modulesGrid) return;
    
    modulesGrid.innerHTML = '';
    
    modules.forEach(module => {
        const moduleCard = document.createElement('div');
        moduleCard.className = 'course-card';
        moduleCard.innerHTML = `
            <div class="course-code">${module.code}</div>
            <div class="course-name">${module.name}</div>
            <div class="course-status">${module.status}</div>
        `;
        modulesGrid.appendChild(moduleCard);
    });
}

async function loadAllModules() {
    try {
        const snapshot = await db.collection('modules').get();
        const allModules = [];
        snapshot.forEach(doc => {
            allModules.push({ id: doc.id, ...doc.data() });
        });
        
        displayAllModules(allModules);
    } catch (error) {
        console.error('Error loading all modules:', error);
    }
}

function displayAllModules(modulesList) {
    const tableBody = document.getElementById('modules-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    modulesList.forEach(module => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${module.code}</td>
            <td>${module.name}</td>
            <td><span class="status-badge status-${module.status}">${module.status}</span></td>
            <td>0</td>
            <td>
                <button class="action-btn edit-module" onclick="editModule('${module.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-danger delete-module" onclick="deleteModule('${module.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function editModule(moduleId) {
    try {
        const moduleDoc = await db.collection('modules').doc(moduleId).get();
        if (!moduleDoc.exists) {
            showNotification('Module not found', 'error');
            return;
        }
        
        const moduleData = moduleDoc.data();
        
        // Pre-fill form
        document.getElementById('moduleId').value = moduleId;
        document.getElementById('moduleCode').value = moduleData.code;
        document.getElementById('moduleName').value = moduleData.name;
        document.getElementById('moduleDescription').value = moduleData.description || '';
        document.getElementById('moduleStatus').value = moduleData.status;
        
        document.querySelector('#moduleModal .modal-title').textContent = 'Edit Module';
        document.querySelector('#moduleModal .btn-primary').textContent = 'Update Module';
        moduleModal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading module for edit:', error);
        showNotification('Error loading module', 'error');
    }
}

async function deleteModule(moduleId) {
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
        return;
    }
    
    try {
        await db.collection('modules').doc(moduleId).delete();
        showNotification('Module deleted successfully!', 'success');
        loadAllModules();
        loadModules();
    } catch (error) {
        console.error('Error deleting module:', error);
        showNotification('Error deleting module', 'error');
    }
}

// Test Management Functions
function clearTestForm() {
    document.getElementById('testForm').reset();
    document.getElementById('testId').value = '';
}

async function loadModulesForTest() {
    try {
        const snapshot = await db.collection('modules').get();
        const moduleSelect = document.getElementById('testModule');
        moduleSelect.innerHTML = '<option value="">-- Select a Module --</option>';
        
        snapshot.forEach(doc => {
            const module = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${module.code} - ${module.name}`;
            moduleSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading modules for test:', error);
    }
}

async function handleTestSubmit(e) {
    e.preventDefault();
    
    const testId = document.getElementById('testId').value;
    const testData = {
        title: document.getElementById('testName').value,
        moduleId: document.getElementById('testModule').value,
        duration: parseInt(document.getElementById('testDuration').value),
        questionCount: parseInt(document.getElementById('testQuestions').value),
        status: document.getElementById('testStatus').value,
        facilitatorId: auth.currentUser.uid,
        facilitatorName: currentUser.name,
        createdAt: testId ? null : firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (testId) {
            await db.collection('tests').doc(testId).update(testData);
            showNotification('Test updated successfully!', 'success');
        } else {
            await db.collection('tests').add(testData);
            showNotification('Test created successfully!', 'success');
        }
        
        testModal.style.display = 'none';
        loadTests();
    } catch (error) {
        console.error('Error saving test:', error);
        showNotification('Error saving test. Please try again.', 'error');
    }
}

// Add event listener for test form
document.getElementById('testForm').addEventListener('submit', handleTestSubmit);

async function loadTests() {
    try {
        const snapshot = await db.collection('tests').get();
        tests = [];
        snapshot.forEach(doc => {
            tests.push({ id: doc.id, ...doc.data() });
        });
        
        displayTests();
        populateTestSelect();
    } catch (error) {
        console.error('Error loading tests:', error);
    }
}

function displayTests() {
    const tableBody = document.getElementById('tests-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    tests.forEach(test => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${test.title}</td>
            <td>Module Linked</td>
            <td>${test.questionCount || 0}</td>
            <td>${test.duration} mins</td>
            <td><span class="status-badge status-${test.status}">${test.status}</span></td>
            <td>
                <button class="action-btn edit-test" onclick="editTest('${test.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-danger delete-test" onclick="deleteTest('${test.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function editTest(testId) {
    try {
        const testDoc = await db.collection('tests').doc(testId).get();
        if (!testDoc.exists) {
            showNotification('Test not found', 'error');
            return;
        }
        
        const testData = testDoc.data();
        
        // Pre-fill form
        document.getElementById('testId').value = testId;
        document.getElementById('testName').value = testData.title;
        document.getElementById('testModule').value = testData.moduleId || '';
        document.getElementById('testDuration').value = testData.duration || 60;
        document.getElementById('testQuestions').value = testData.questionCount || 10;
        document.getElementById('testStatus').value = testData.status || 'draft';
        
        await loadModulesForTest();
        document.querySelector('#testModal .modal-title').textContent = 'Edit Test';
        document.querySelector('#testModal .btn-primary').textContent = 'Update Test';
        testModal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading test for edit:', error);
        showNotification('Error loading test', 'error');
    }
}

async function deleteTest(testId) {
    if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
        return;
    }
    
    try {
        await db.collection('tests').doc(testId).delete();
        showNotification('Test deleted successfully!', 'success');
        loadTests();
    } catch (error) {
        console.error('Error deleting test:', error);
        showNotification('Error deleting test', 'error');
    }
}

// Analytics Functions
async function loadStudents() {
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'student')
            .get();
        
        students = [];
        snapshot.forEach(doc => {
            students.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

async function loadTestResults() {
    try {
        const snapshot = await db.collection('testResults').get();
        testResults = [];
        snapshot.forEach(doc => {
            testResults.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('Error loading test results:', error);
    }
}

async function loadAnalytics() {
    try {
        await Promise.all([loadStudents(), loadTestResults(), loadTests()]);
        displayStudentResults();
        updateAnalyticsStats();
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function displayStudentResults() {
    const tableBody = document.querySelector('#student-results-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Create sample student results for demonstration
    const sampleResults = [
        { 
            studentName: 'John Doe', 
            studentId: '220415001', 
            testName: 'Database Midterm',
            score: 85, 
            totalPoints: 100, 
            status: 'Pass',
            answers: [
                { questionId: 1, isCorrect: true },
                { questionId: 2, isCorrect: false },
                { questionId: 3, isCorrect: true }
            ]
        },
        { 
            studentName: 'Jane Smith', 
            studentId: '220415002', 
            testName: 'Database Midterm',
            score: 72, 
            totalPoints: 100, 
            status: 'Pass',
            answers: [
                { questionId: 1, isCorrect: true },
                { questionId: 2, isCorrect: true },
                { questionId: 3, isCorrect: false }
            ]
        },
        { 
            studentName: 'Mike Johnson', 
            studentId: '220415003', 
            testName: 'Programming Assignment',
            score: 45, 
            totalPoints: 100, 
            status: 'Fail',
            answers: [
                { questionId: 1, isCorrect: false },
                { questionId: 2, isCorrect: false },
                { questionId: 3, isCorrect: true }
            ]
        }
    ];
    
    sampleResults.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${result.studentName}</td>
            <td>${result.studentId}</td>
            <td>${result.score}/${result.totalPoints}</td>
            <td><span class="status-badge status-${result.status.toLowerCase()}">${result.status}</span></td>
            <td>
                <button class="action-btn" onclick="viewTestDetails('${result.studentName}', '${result.testName}', ${JSON.stringify(result.answers).replace(/"/g, '&quot;')})">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function viewTestDetails(studentName, testName, answers) {
    document.getElementById('studentName').textContent = studentName;
    const detailsContent = document.getElementById('testDetailsContent');
    
    // Sample questions for demonstration
    const sampleQuestions = [
        { id: 1, text: "What is normalization in databases?", correctAnswer: "A" },
        { id: 2, text: "Explain the ACID properties.", correctAnswer: "B" },
        { id: 3, text: "What is a foreign key?", correctAnswer: "C" }
    ];
    
    let detailsHtml = `<h4>Test: ${testName}</h4><div class="question-details">`;
    
    sampleQuestions.forEach((question, index) => {
        const answer = answers[index];
        const statusClass = answer.isCorrect ? 'correct' : 'incorrect';
        const statusText = answer.isCorrect ? 'Correct' : 'Incorrect';
        
        detailsHtml += `
            <div class="question-detail">
                <h5>Question ${question.id}</h5>
                <p>${question.text}</p>
                <div class="answer-status ${statusClass}">
                    <i class="fas ${answer.isCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                    ${statusText}
                </div>
            </div>
        `;
    });
    
    detailsHtml += '</div>';
    detailsContent.innerHTML = detailsHtml;
    
    studentTestDetailsModal.style.display = 'flex';
}

function populateTestSelect() {
    const testSelect = document.getElementById('testSelect');
    if (!testSelect) return;
    
    testSelect.innerHTML = '<option value="">-- Select a Test --</option>';
    
    tests.forEach(test => {
        const option = document.createElement('option');
        option.value = test.id;
        option.textContent = test.title;
        testSelect.appendChild(option);
    });
}

// Test selection handler
document.getElementById('testSelect')?.addEventListener('change', (e) => {
    const testId = e.target.value;
    if (testId) {
        displayQuestionStatistics(testId);
    } else {
        document.getElementById('question-stats-section').style.display = 'none';
    }
});

function displayQuestionStatistics(testId) {
    const questionStatsSection = document.getElementById('question-stats-section');
    const tableBody = document.querySelector('#question-stats-table tbody');
    
    if (!questionStatsSection || !tableBody) return;
    
    // Sample question statistics
    const sampleStats = [
        { 
            questionNumber: 1, 
            questionText: "What is normalization in databases?", 
            correct: 15, 
            incorrect: 5,
            successRate: 75
        },
        { 
            questionNumber: 2, 
            questionText: "Explain the ACID properties.", 
            correct: 8, 
            incorrect: 12,
            successRate: 40
        },
        { 
            questionNumber: 3, 
            questionText: "What is a foreign key?", 
            correct: 18, 
            incorrect: 2,
            successRate: 90
        }
    ];
    
    tableBody.innerHTML = '';
    
    sampleStats.forEach(stat => {
        const row = document.createElement('tr');
        const difficultyClass = stat.successRate >= 70 ? 'easy' : stat.successRate >= 40 ? 'medium' : 'hard';
        
        row.innerHTML = `
            <td>${stat.questionNumber}</td>
            <td>${stat.questionText}</td>
            <td class="success-count">${stat.correct}</td>
            <td class="fail-count">${stat.incorrect}</td>
            <td>
                <div class="success-rate ${difficultyClass}">
                    ${stat.successRate}%
                    <small class="${difficultyClass}">${difficultyClass === 'easy' ? 'Easy' : difficultyClass === 'medium' ? 'Medium' : 'Hard'}</small>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    questionStatsSection.style.display = 'block';
}

function updateDashboardStats() {
    // Update stats on dashboard
    const statCards = document.querySelectorAll('.stat-number');
    if (statCards.length >= 4) {
        statCards[0].textContent = modules.length;
        statCards[1].textContent = tests.length;
        statCards[2].textContent = students.length;
        statCards[3].textContent = '92%'; // Static for demo
    }
}

function updateAnalyticsStats() {
    const statCards = document.querySelectorAll('#analytics-page .stat-number');
    if (statCards.length >= 4) {
        statCards[0].textContent = students.length;
        statCards[1].textContent = '92%'; // Static for demo
        statCards[2].textContent = '76%'; // Static for demo
        statCards[3].textContent = tests.length;
    }
}

// Logout functionality
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Position notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        removeNotification(notification);
    }, 5000);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        removeNotification(notification);
    });
}

function removeNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set initial page if needed
    const dashboardPage = document.getElementById('dashboard-page');
    if (dashboardPage) {
        dashboardPage.classList.add('active');
    }
    
    // Add hidden input for module/test IDs
    if (!document.getElementById('moduleId')) {
        const moduleForm = document.getElementById('moduleForm');
        if (moduleForm) {
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'moduleId';
            hiddenInput.name = 'moduleId';
            moduleForm.appendChild(hiddenInput);
        }
    }
    
    if (!document.getElementById('testId')) {
        const testForm = document.getElementById('testForm');
        if (testForm) {
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'testId';
            hiddenInput.name = 'testId';
            testForm.appendChild(hiddenInput);
        }
    }
});

// Content upload functionality
function handleContentUpload() {
    const uploadBtn = document.querySelector('#upload-page .btn-primary');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const moduleId = document.getElementById('moduleSelect').value;
            const title = document.getElementById('contentTitle').value;
            const type = document.getElementById('contentType').value;
            const description = document.getElementById('contentDescription').value;
            const fileInput = document.getElementById('contentFile');
            
            if (!moduleId || !title || !fileInput.files[0]) {
                showNotification('Please fill in all required fields and select a file', 'error');
                return;
            }
            
            try {
                // Here you would typically upload the file to Firebase Storage
                // For now, we'll just simulate the upload
                showNotification('Content uploaded successfully!', 'success');
                
                // Clear the form
                document.getElementById('moduleSelect').value = '';
                document.getElementById('contentTitle').value = '';
                document.getElementById('contentDescription').value = '';
                document.getElementById('contentFile').value = '';
            } catch (error) {
                console.error('Error uploading content:', error);
                showNotification('Error uploading content. Please try again.', 'error');
            }
        });
    }
}

// Initialize content upload
document.addEventListener('DOMContentLoaded', handleContentUpload);

// Search functionality
const searchInput = document.querySelector('.search-bar input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        // Get current active page
        const activePage = document.querySelector('.page-content.active');
        
        if (activePage.id === 'modules-page') {
            filterModules(searchTerm);
        } else if (activePage.id === 'tests-page') {
            filterTests(searchTerm);
        }
    });
}

function filterModules(searchTerm) {
    const rows = document.querySelectorAll('#modules-table-body tr');
    rows.forEach(row => {
        const moduleCode = row.cells[0].textContent.toLowerCase();
        const moduleName = row.cells[1].textContent.toLowerCase();
        
        if (moduleCode.includes(searchTerm) || moduleName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterTests(searchTerm) {
    const rows = document.querySelectorAll('#tests-table-body tr');
    rows.forEach(row => {
        const testName = row.cells[0].textContent.toLowerCase();
        
        if (testName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Populate module select in upload section
async function populateModuleSelect() {
    const moduleSelect = document.getElementById('moduleSelect');
    if (!moduleSelect) return;
    
    try {
        const snapshot = await db.collection('modules')
            .where('facilitatorId', '==', auth.currentUser.uid)
            .get();
        
        moduleSelect.innerHTML = '<option value="">-- Select a Module --</option>';
        
        snapshot.forEach(doc => {
            const module = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${module.code} - ${module.name}`;
            moduleSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading modules for upload:', error);
    }
}

// Load module select when upload page is accessed
document.querySelector('.nav-item[data-page="upload"]')?.addEventListener('click', () => {
    setTimeout(populateModuleSelect, 100);
});