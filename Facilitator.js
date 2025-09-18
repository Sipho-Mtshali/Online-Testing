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
let modulesListener = null; // For real-time updates

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
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('User authenticated:', user.uid);
        currentUser = user;
        
        try {
            // Load user profile first
            await loadUserProfile();
            
            // Then initialize real-time listeners
            console.log('User profile loaded, initializing listeners');
            initializeRealTimeListeners();
            
            // Load other initial data
            loadInitialData();
        } catch (error) {
            console.error('Error during initialization:', error);
            showNotification('Error loading user data. Please refresh the page.', 'error');
        }
    } else {
        console.log('User not authenticated, cleaning up and redirecting');
        // Clean up listeners
        if (modulesListener) {
            modulesListener();
            modulesListener = null;
        }
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
    }
});

// Initialize real-time listeners for modules
function initializeRealTimeListeners() {
    if (!auth.currentUser) {
        console.log('User not authenticated, skipping real-time listener setup');
        return;
    }
    
    console.log('Setting up real-time listener for user:', auth.currentUser.uid);
    
    // Clean up existing listener if it exists
    if (modulesListener) {
        console.log('Cleaning up existing modules listener');
        modulesListener();
    }
    
    // Listen for changes to modules where current user is facilitator
    modulesListener = db.collection('modules')
        .where('facilitatorId', '==', auth.currentUser.uid)
        .onSnapshot((snapshot) => {
            console.log('Modules snapshot received, count:', snapshot.docs.length);
            
            modules = [];
            snapshot.forEach(doc => {
                const moduleData = { id: doc.id, ...doc.data() };
                modules.push(moduleData);
                console.log('Module loaded:', moduleData.code, moduleData.name);
            });
            
            console.log('Total modules loaded:', modules.length);
            
            // Update all displays immediately
            displayModules();
            updateDashboardStats();
            
            // Update modules page if it's currently active
            const modulesPage = document.getElementById('modules-page');
            if (modulesPage && modulesPage.classList.contains('active')) {
                loadAllModulesWithRealTime();
            }
            
            // Force refresh dashboard if it's currently active
            const dashboardPage = document.getElementById('dashboard-page');
            if (dashboardPage && dashboardPage.classList.contains('active')) {
                console.log('Dashboard is active, refreshing display');
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    displayModules();
                }, 100);
            }
        }, (error) => {
            console.error('Error in modules listener:', error);
            
            // Handle specific error cases
            if (error.code === 'permission-denied') {
                console.error('Permission denied - check Firestore security rules');
                showNotification('Permission denied. Please check your access rights.', 'error');
            } else if (error.code === 'failed-precondition') {
                console.error('Missing index - check Firestore indexes');
                showNotification('Database configuration issue. Please contact support.', 'error');
            } else {
                console.error('Unknown error loading modules:', error);
                showNotification('Error loading modules. Please try refreshing the page.', 'error');
            }
        });
}

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

// Update profile display
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
    loadTests();
    loadStudents();
    loadTestResults();
    // Modules are loaded via real-time listener
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

        // Load page-specific data and clear hardcoded content
        if (page === 'dashboard') {
            // Clear any hardcoded modules and refresh from database
            setTimeout(() => {
                displayModules();
                updateDashboardStats();
            }, 100);
        } else if (page === 'modules') {
            loadAllModulesWithRealTime();
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
        document.querySelector('#moduleModal .modal-title').textContent = 'Add New Module';
        document.querySelector('#moduleModal .btn-primary').textContent = 'Create Module';
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

// ENHANCED MODULE MANAGEMENT FUNCTIONS WITH FIREBASE INTEGRATION

// Clear module form
function clearModuleForm() {
    document.getElementById('moduleForm').reset();
    // Clear the hidden ID field
    const moduleIdInput = document.getElementById('moduleId') || createHiddenInput('moduleId', 'moduleForm');
    moduleIdInput.value = '';
}

// Create module with validation and error handling
async function handleModuleSubmit(e) {
    e.preventDefault();
    
    const moduleIdInput = document.getElementById('moduleId') || createHiddenInput('moduleId', 'moduleForm');
    const moduleId = moduleIdInput.value;
    const moduleCode = document.getElementById('moduleCode').value.trim();
    const moduleName = document.getElementById('moduleName').value.trim();
    const moduleDescription = document.getElementById('moduleDescription').value.trim();
    const moduleStatus = document.getElementById('moduleStatus').value;

    // Validation
    if (!moduleCode || !moduleName) {
        showNotification('Module code and name are required!', 'error');
        return;
    }

    // Check for duplicate module codes (only when creating new)
    if (!moduleId) {
        try {
            const existingModule = await db.collection('modules')
                .where('code', '==', moduleCode)
                .limit(1)
                .get();
            
            if (!existingModule.empty) {
                showNotification('A module with this code already exists!', 'error');
                return;
            }
        } catch (error) {
            console.error('Error checking for duplicate module:', error);
            showNotification('Error validating module. Please try again.', 'error');
            return;
        }
    }

    const moduleData = {
        code: moduleCode.toUpperCase(),
        name: moduleName,
        description: moduleDescription,
        status: moduleStatus,
        facilitatorId: auth.currentUser.uid,
        facilitatorName: currentUser.name || currentUser.email,
        enrollmentCount: 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Add createdAt only for new modules
    if (!moduleId) {
        moduleData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    try {
        if (moduleId) {
            // Update existing module
            await db.collection('modules').doc(moduleId).update(moduleData);
            showNotification('Module updated successfully!', 'success');
        } else {
            // Create new module
            const docRef = await db.collection('modules').add(moduleData);
            showNotification('Module created successfully!', 'success');
            console.log('New module created with ID:', docRef.id);
        }
        
        moduleModal.style.display = 'none';
        clearModuleForm();
    } catch (error) {
        console.error('Error saving module:', error);
        showNotification('Error saving module. Please try again.', 'error');
    }
}

// Add event listener for module form
document.getElementById('moduleForm').addEventListener('submit', handleModuleSubmit);

// Display modules in dashboard grid (using real-time data)
function displayModules() {
    const modulesGrid = document.querySelector('.courses-grid');
    if (!modulesGrid) {
        console.log('Modules grid not found');
        return;
    }
    
    console.log('Displaying modules. Count:', modules.length);
    
    // Clear existing content including hardcoded modules
    modulesGrid.innerHTML = '';
    
    if (modules.length === 0) {
        modulesGrid.innerHTML = `
            <div class="no-modules-card">
                <i class="fas fa-book-open"></i>
                <p>No modules found</p>
                <p class="sub-text">Create your first module to get started!</p>
                <button class="btn-primary" onclick="document.getElementById('addModuleBtn').click()">
                    <i class="fas fa-plus"></i> Create Module
                </button>
            </div>
        `;
        return;
    }
    
    modules.forEach(module => {
        console.log('Creating card for module:', module.code, module.name);
        const moduleCard = document.createElement('div');
        moduleCard.className = 'course-card';
        const statusText = getStatusText(module.status);
        
        moduleCard.innerHTML = `
            <div class="course-code">${module.code}</div>
            <h4 class="course-name">${module.name}</h4>
            <span class="course-status">${statusText} | ${module.enrollmentCount || 0} enrolled</span>
        `;
        
        // Add click handler to view module details
        moduleCard.addEventListener('click', () => {
            // Switch to modules page and highlight this module
            switchToModulesPage(module.id);
        });
        
        modulesGrid.appendChild(moduleCard);
    });
    
    console.log('Finished displaying modules. Cards added:', modules.length);
}

// Helper function to get readable status text
function getStatusText(status) {
    switch(status) {
        case 'open': return 'Open for enrollment';
        case 'closed': return 'Closed';
        case 'draft': return 'Draft';
        default: return 'Unknown status';
    }
}

// Function to switch to modules page and highlight specific module
function switchToModulesPage(moduleId = null) {
    // Click the modules nav item
    const modulesNavItem = document.querySelector('.nav-item[data-page="modules"]');
    if (modulesNavItem) {
        modulesNavItem.click();
        
        // If a specific module ID is provided, highlight it after a delay
        if (moduleId) {
            setTimeout(() => {
                highlightModule(moduleId);
            }, 300);
        }
    }
}

// Function to highlight a specific module in the table
function highlightModule(moduleId) {
    const moduleRows = document.querySelectorAll('#modules-table-body tr');
    moduleRows.forEach(row => {
        const editButton = row.querySelector('.edit-module');
        if (editButton && editButton.getAttribute('onclick').includes(moduleId)) {
            row.classList.add('highlighted-row');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
                row.classList.remove('highlighted-row');
            }, 3000);
        }
    });
}

// Load all modules for the modules page with real-time updates
async function loadAllModulesWithRealTime() {
    try {
        // Set up real-time listener for all modules in the modules page
        db.collection('modules')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                const allModules = [];
                snapshot.forEach(doc => {
                    allModules.push({ id: doc.id, ...doc.data() });
                });
                displayAllModules(allModules);
            }, (error) => {
                console.error('Error loading all modules:', error);
                showNotification('Error loading modules', 'error');
            });
    } catch (error) {
        console.error('Error setting up modules listener:', error);
    }
}

// Display all modules in the modules management table
function displayAllModules(modulesList) {
    const tableBody = document.getElementById('modules-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (modulesList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">No modules found</td>
            </tr>
        `;
        return;
    }
    
    modulesList.forEach(module => {
        const row = document.createElement('tr');
        const isOwner = module.facilitatorId === auth.currentUser.uid;
        const statusClass = module.status ? module.status.toLowerCase() : 'draft';
        
        row.innerHTML = `
            <td><strong>${module.code}</strong></td>
            <td>${module.name}</td>
            <td><span class="status-badge status-${statusClass}">${module.status || 'Draft'}</span></td>
            <td>${module.enrollmentCount || 0}</td>
            <td>
                ${isOwner ? `
                    <button class="action-btn edit-module" onclick="editModule('${module.id}')" title="Edit Module">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-danger delete-module" onclick="deleteModule('${module.id}')" title="Delete Module">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : `
                    <button class="action-btn" onclick="viewModule('${module.id}')" title="View Module">
                        <i class="fas fa-eye"></i>
                    </button>
                `}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Edit existing module
async function editModule(moduleId) {
    try {
        // Show loading state
        showNotification('Loading module data...', 'info');
        
        const moduleDoc = await db.collection('modules').doc(moduleId).get();
        if (!moduleDoc.exists) {
            showNotification('Module not found', 'error');
            return;
        }
        
        const moduleData = moduleDoc.data();
        
        // Verify ownership
        if (moduleData.facilitatorId !== auth.currentUser.uid) {
            showNotification('You can only edit your own modules', 'error');
            return;
        }
        
        // Pre-fill form with existing data
        const moduleIdInput = document.getElementById('moduleId') || createHiddenInput('moduleId', 'moduleForm');
        moduleIdInput.value = moduleId;
        
        document.getElementById('moduleCode').value = moduleData.code || '';
        document.getElementById('moduleName').value = moduleData.name || '';
        document.getElementById('moduleDescription').value = moduleData.description || '';
        document.getElementById('moduleStatus').value = moduleData.status || 'draft';
        
        // Update modal title and button
        document.querySelector('#moduleModal .modal-title').textContent = 'Edit Module';
        document.querySelector('#moduleModal .btn-primary').textContent = 'Update Module';
        moduleModal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading module for edit:', error);
        showNotification('Error loading module data', 'error');
    }
}

// Delete module with confirmation
async function deleteModule(moduleId) {
    try {
        // Get module data first for confirmation
        const moduleDoc = await db.collection('modules').doc(moduleId).get();
        if (!moduleDoc.exists) {
            showNotification('Module not found', 'error');
            return;
        }
        
        const moduleData = moduleDoc.data();
        
        // Verify ownership
        if (moduleData.facilitatorId !== auth.currentUser.uid) {
            showNotification('You can only delete your own modules', 'error');
            return;
        }
        
        // Confirmation dialog
        const confirmMessage = `Are you sure you want to delete "${moduleData.name}" (${moduleData.code})?\n\nThis action cannot be undone and will remove all associated content.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Delete the module
        await db.collection('modules').doc(moduleId).delete();
        showNotification(`Module "${moduleData.name}" deleted successfully!`, 'success');
        
    } catch (error) {
        console.error('Error deleting module:', error);
        showNotification('Error deleting module. Please try again.', 'error');
    }
}

// View module details (for non-owners)
function viewModule(moduleId) {
    // This could open a modal showing module details
    showNotification('Module viewing functionality coming soon!', 'info');
}

// Helper function to create hidden inputs
function createHiddenInput(id, formId) {
    const form = document.getElementById(formId);
    if (!form) return null;
    
    const input = document.createElement('input');
    input.type = 'hidden';
    input.id = id;
    input.name = id;
    form.appendChild(input);
    return input;
}

// Test Management Functions
function clearTestForm() {
    document.getElementById('testForm').reset();
    const testIdInput = document.getElementById('testId') || createHiddenInput('testId', 'testForm');
    testIdInput.value = '';
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
    
    const testIdInput = document.getElementById('testId') || createHiddenInput('testId', 'testForm');
    const testId = testIdInput.value;
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
        const testIdInput = document.getElementById('testId') || createHiddenInput('testId', 'testForm');
        testIdInput.value = testId;
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
            studentName: 'Zakwe Mlamuli', 
            studentId: '22461501', 
            testName: 'Database Midterm',
            score: 37, 
            totalPoints: 40, 
            status: 'Pass',
            answers: [
                { questionId: 1, isCorrect: true },
                { questionId: 2, isCorrect: false },
                { questionId: 3, isCorrect: true }
            ]
        },
        { 
            studentName: 'Andiswa Zondi', 
            studentId: '22541500', 
            testName: 'Database Midterm',
            score: 38, 
            totalPoints: 40, 
            status: 'Pass',
            answers: [
                { questionId: 1, isCorrect: true },
                { questionId: 2, isCorrect: true },
                { questionId: 3, isCorrect: false }
            ]
        },
        { 
            studentName: 'Scelo Gumede', 
            studentId: '224415603', 
            testName: 'Programming Assignment',
            score: 40, 
            totalPoints: 40, 
            status: 'Pass',
            answers: [
                { questionId: 1, isCorrect: true },
                { questionId: 2, isCorrect: true },
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

// Enhanced notification system with better styling and animations
function showNotification(message, type = 'info') {
    // Remove existing notifications of the same type to prevent spam
    const existingNotifications = document.querySelectorAll(`.notification-${type}`);
    existingNotifications.forEach(notification => {
        removeNotification(notification);
    });

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
    
    // Auto remove after 5 seconds (longer for errors)
    const autoRemoveTime = type === 'error' ? 8000 : 5000;
    setTimeout(() => {
        removeNotification(notification);
    }, autoRemoveTime);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        removeNotification(notification);
    });
}

function removeNotification(notification) {
    if (!notification || !notification.parentNode) return;
    
    notification.classList.remove('show');
    notification.classList.add('hide');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Enhanced search functionality for modules
const searchInput = document.querySelector('.search-bar input');
if (searchInput) {
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        // Debounce search to avoid excessive filtering
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            // Get current active page
            const activePage = document.querySelector('.page-content.active');
            
            if (activePage.id === 'modules-page') {
                filterModules(searchTerm);
            } else if (activePage.id === 'tests-page') {
                filterTests(searchTerm);
            }
        }, 300);
    });
}

function filterModules(searchTerm) {
    const rows = document.querySelectorAll('#modules-table-body tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        if (row.querySelector('.no-data')) return; // Skip "no data" row
        
        const moduleCode = row.cells[0].textContent.toLowerCase();
        const moduleName = row.cells[1].textContent.toLowerCase();
        const facilitator = row.cells[4] ? row.cells[4].textContent.toLowerCase() : '';
        
        if (moduleCode.includes(searchTerm) || 
            moduleName.includes(searchTerm) || 
            facilitator.includes(searchTerm)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Show/hide "no results" message
    const tableBody = document.getElementById('modules-table-body');
    let noResultsRow = tableBody.querySelector('.no-results');
    
    if (visibleCount === 0 && searchTerm.trim() !== '') {
        if (!noResultsRow) {
            noResultsRow = document.createElement('tr');
            noResultsRow.className = 'no-results';
            noResultsRow.innerHTML = '<td colspan="5" class="no-data">No modules match your search</td>';
            tableBody.appendChild(noResultsRow);
        }
        noResultsRow.style.display = '';
    } else if (noResultsRow) {
        noResultsRow.style.display = 'none';
    }
}

function filterTests(searchTerm) {
    const rows = document.querySelectorAll('#tests-table-body tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const testName = row.cells[0].textContent.toLowerCase();
        const moduleName = row.cells[1].textContent.toLowerCase();
        
        if (testName.includes(searchTerm) || moduleName.includes(searchTerm)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Show/hide "no results" message for tests
    const tableBody = document.getElementById('tests-table-body');
    let noResultsRow = tableBody.querySelector('.no-results');
    
    if (visibleCount === 0 && searchTerm.trim() !== '') {
        if (!noResultsRow) {
            noResultsRow = document.createElement('tr');
            noResultsRow.className = 'no-results';
            noResultsRow.innerHTML = '<td colspan="6" class="no-data">No tests match your search</td>';
            tableBody.appendChild(noResultsRow);
        }
        noResultsRow.style.display = '';
    } else if (noResultsRow) {
        noResultsRow.style.display = 'none';
    }
}

// Populate module select in upload section
async function populateModuleSelect() {
    const moduleSelect = document.getElementById('moduleSelect');
    if (!moduleSelect || !auth.currentUser) return;
    
    try {
        const snapshot = await db.collection('modules')
            .where('facilitatorId', '==', auth.currentUser.uid)
            .orderBy('name')
            .get();
        
        moduleSelect.innerHTML = '<option value="">-- Select a Module --</option>';
        
        snapshot.forEach(doc => {
            const module = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${module.code} - ${module.name}`;
            moduleSelect.appendChild(option);
        });
        
        if (snapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No modules available - Create a module first';
            option.disabled = true;
            moduleSelect.appendChild(option);
        }
    } catch (error) {
        console.error('Error loading modules for upload:', error);
        showNotification('Error loading modules', 'error');
    }
}

// Enhanced content upload functionality
function handleContentUpload() {
    const uploadBtn = document.querySelector('#upload-page .btn-primary');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const moduleId = document.getElementById('moduleSelect').value;
            const title = document.getElementById('contentTitle').value.trim();
            const type = document.getElementById('contentType').value;
            const description = document.getElementById('contentDescription').value.trim();
            const fileInput = document.getElementById('contentFile');
            
            // Validation
            if (!moduleId) {
                showNotification('Please select a module', 'error');
                return;
            }
            
            if (!title) {
                showNotification('Please enter a content title', 'error');
                return;
            }
            
            if (!fileInput.files[0]) {
                showNotification('Please select a file to upload', 'error');
                return;
            }
            
            const file = fileInput.files[0];
            const maxSize = 10 * 1024 * 1024; // 10MB limit
            
            if (file.size > maxSize) {
                showNotification('File size must be less than 10MB', 'error');
                return;
            }
            
            try {
                // Show upload progress
                showNotification('Uploading content...', 'info');
                
                // Here you would typically upload the file to Firebase Storage
                // For now, we'll simulate the upload and save metadata to Firestore
                const contentData = {
                    title: title,
                    type: type,
                    description: description,
                    moduleId: moduleId,
                    fileName: file.name,
                    fileSize: file.size,
                    facilitatorId: auth.currentUser.uid,
                    facilitatorName: currentUser.name || currentUser.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Save to Firestore
                await db.collection('moduleContent').add(contentData);
                
                showNotification('Content uploaded successfully!', 'success');
                
                // Clear the form
                document.getElementById('moduleSelect').value = '';
                document.getElementById('contentTitle').value = '';
                document.getElementById('contentDescription').value = '';
                document.getElementById('contentFile').value = '';
                document.getElementById('contentType').value = 'lecture';
                
            } catch (error) {
                console.error('Error uploading content:', error);
                showNotification('Error uploading content. Please try again.', 'error');
            }
        });
    }
}

// Load module select when upload page is accessed
document.querySelector('.nav-item[data-page="upload"]')?.addEventListener('click', () => {
    setTimeout(populateModuleSelect, 100);
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set initial page if needed
    const dashboardPage = document.getElementById('dashboard-page');
    if (dashboardPage) {
        dashboardPage.classList.add('active');
    }
    
    // Initialize dashboard when the page loads
    initializeDashboard();
    
    // Initialize content upload
    handleContentUpload();
    
    // Add notification styles and other enhancements
    addNotificationStyles();
});

// Function to initialize dashboard
function initializeDashboard() {
    // Clear any hardcoded module content immediately
    const modulesGrid = document.querySelector('.courses-grid');
    if (modulesGrid) {
        // Clear existing hardcoded content
        modulesGrid.innerHTML = '<div class="loading-modules">Loading your modules...</div>';
    }
    
    // Wait for authentication and then display modules
    const checkAndDisplayModules = () => {
        if (auth.currentUser && modules !== undefined) {
            displayModules();
            updateDashboardStats();
        } else {
            // Keep checking until user is authenticated and modules are loaded
            setTimeout(checkAndDisplayModules, 500);
        }
    };
    
    checkAndDisplayModules();
}

// Function to add notification styles
function addNotificationStyles() {
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                border-left: 4px solid #007bff;
                padding: 16px;
                min-width: 300px;
                max-width: 500px;
                z-index: 10000;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
            }
            
            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification.hide {
                transform: translateX(100%);
                opacity: 0;
            }
            
            .notification-success {
                border-left-color: #28a745;
            }
            
            .notification-error {
                border-left-color: #dc3545;
            }
            
            .notification-info {
                border-left-color: #007bff;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .notification-content i {
                font-size: 18px;
            }
            
            .notification-success i {
                color: #28a745;
            }
            
            .notification-error i {
                color: #dc3545;
            }
            
            .notification-info i {
                color: #007bff;
            }
            
            .notification-close {
                position: absolute;
                top: 8px;
                right: 12px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                opacity: 0.5;
                transition: opacity 0.2s;
            }
            
            .notification-close:hover {
                opacity: 1;
            }
            
            .no-data {
                text-align: center;
                color: #666;
                font-style: italic;
                padding: 20px;
            }
            
            .loading-modules {
                text-align: center;
                color: #666;
                padding: 40px;
                font-style: italic;
                grid-column: 1 / -1;
            }
            
            .success-rate.easy {
                color: #28a745;
            }
            
            .success-rate.medium {
                color: #ffc107;
            }
            
            .success-rate.hard {
                color: #dc3545;
            }
            
            .success-count {
                color: #28a745;
                font-weight: bold;
            }
            
            .fail-count {
                color: #dc3545;
                font-weight: bold;
            }
            
            .question-details {
                max-height: 400px;
                overflow-y: auto;
                padding: 10px 0;
            }
            
            .question-detail {
                margin-bottom: 20px;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 5px;
            }
            
            .answer-status {
                margin-top: 10px;
                padding: 8px;
                border-radius: 4px;
                font-weight: bold;
            }
            
            .answer-status.correct {
                background-color: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .answer-status.incorrect {
                background-color: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .highlighted-row {
                background-color: #fff3cd !important;
                border: 2px solid #ffc107 !important;
                transition: all 0.3s ease;
            }
            
            .no-modules-card {
                background: #f8f9fa;
                border: 2px dashed #dee2e6;
                border-radius: 12px;
                padding: 40px;
                text-align: center;
                color: #6c757d;
                grid-column: 1 / -1;
            }
            
            .no-modules-card i {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }
            
            .no-modules-card p {
                margin: 8px 0;
            }
            
            .no-modules-card .sub-text {
                font-size: 14px;
                opacity: 0.8;
                margin-bottom: 20px;
            }
            
            .no-modules-card .btn-primary {
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s;
            }
            
            .no-modules-card .btn-primary:hover {
                background: #0056b3;
            }
        `;
        document.head.appendChild(style);
    }
}

// Cleanup function for when the page is unloaded
window.addEventListener('beforeunload', () => {
    if (modulesListener) {
        modulesListener();
    }
});

// Export functions to global scope for onclick handlers
window.editModule = editModule;
window.deleteModule = deleteModule;
window.viewModule = viewModule;
window.editTest = editTest;
window.deleteTest = deleteTest;
window.viewTestDetails = viewTestDetails;