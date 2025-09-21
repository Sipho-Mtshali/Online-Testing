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
let modulesListener = null;
let questions = [];
let editingQuestionIndex = -1;
let currentTestId = null;
let currentTestVisibility = false;
let accommodatedStudents = [];

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const pageContents = document.querySelectorAll('.page-content');
const logoutBtn = document.getElementById('logoutBtn');
const topUserName = document.getElementById('topUserName');
const addModuleBtn = document.getElementById('addModuleBtn');
const createModuleBtn = document.getElementById('createModuleBtn');
const createTestBtn = document.getElementById('createTestBtn');
const moduleModal = document.getElementById('moduleModal');
const editProfileModal = document.getElementById('editProfileModal');
const changePasswordModal = document.getElementById('changePasswordModal');
const studentTestDetailsModal = document.getElementById('studentTestDetailsModal');
const closeModuleModal = document.getElementById('closeModuleModal');
const closeEditProfileModal = document.getElementById('closeEditProfileModal');
const editProfileMainBtn = document.getElementById('editProfileMainBtn');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const testCreationModal = document.getElementById('testCreationModal');

// Enhanced Toast Notification System
function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toast-container');
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="toast-icon ${iconMap[type] || iconMap.info}"></i>
        <div class="toast-message">${message}</div>
        <button class="toast-close">&times;</button>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove
    const autoRemoveTimer = setTimeout(() => {
        removeToast(toast);
    }, duration);
    
    // Close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(autoRemoveTimer);
        removeToast(toast);
    });
    
    return toast;
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.add('removing');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 200);
}

// Authentication Check
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('User authenticated:', user.uid);
        currentUser = user;
        
        try {
            await loadUserProfile();
            initializeRealTimeListeners();
            loadInitialData();
            showToast('Welcome back! Dashboard loaded successfully.', 'success', 3000);
        } catch (error) {
            console.error('Error during initialization:', error);
            showToast('Error loading user data. Please refresh the page.', 'error');
        }
    } else {
        console.log('User not authenticated, cleaning up and redirecting');
        if (modulesListener) {
            modulesListener();
            modulesListener = null;
        }
        window.location.href = 'index.html';
    }
});

// Initialize real-time listeners for modules
function initializeRealTimeListeners() {
    if (!auth.currentUser) {
        console.log('User not authenticated, skipping real-time listener setup');
        return;
    }
    
    console.log('Setting up real-time listener for user:', auth.currentUser.uid);
    
    if (modulesListener) {
        console.log('Cleaning up existing modules listener');
        modulesListener();
    }
    
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
            displayModules();
            updateDashboardStats();
            
            const modulesPage = document.getElementById('modules-page');
            if (modulesPage && modulesPage.classList.contains('active')) {
                loadAllModulesWithRealTime();
            }
            
            const dashboardPage = document.getElementById('dashboard-page');
            if (dashboardPage && dashboardPage.classList.contains('active')) {
                console.log('Dashboard is active, refreshing display');
                setTimeout(() => {
                    displayModules();
                }, 100);
            }
        }, (error) => {
            console.error('Error in modules listener:', error);
            
            if (error.code === 'permission-denied') {
                console.error('Permission denied - check Firestore security rules');
                showToast('Permission denied. Please check your access rights.', 'error');
            } else if (error.code === 'failed-precondition') {
                console.error('Missing index - check Firestore indexes');
                showToast('Database configuration issue. Please contact support.', 'error');
            } else {
                console.error('Unknown error loading modules:', error);
                showToast('Error loading modules. Please try refreshing the page.', 'error');
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
        showToast('Error loading profile data.', 'error');
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
}

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const page = item.getAttribute('data-page');
        
        navItems.forEach(navItem => navItem.classList.remove('active'));
        item.classList.add('active');
        
        pageContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${page}-page`) {
                content.classList.add('active');
            }
        });

        if (page === 'dashboard') {
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
        openTestCreation();
    });
}

// Close modals
function setupModalClosers() {
    const modals = [
        { modal: moduleModal, closer: closeModuleModal },
        { modal: editProfileModal, closer: closeEditProfileModal },
        { modal: changePasswordModal, closer: document.getElementById('closeChangePasswordModal') },
        { modal: studentTestDetailsModal, closer: document.querySelector('#studentTestDetailsModal .close-modal') },
        { modal: testCreationModal, closer: document.querySelector('#testCreationModal .close-modal') }
    ];

    modals.forEach(({ modal, closer }) => {
        if (closer && modal) {
            closer.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    });

    window.addEventListener('click', (e) => {
        modals.forEach(({ modal }) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

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
        showToast('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Error updating profile. Please try again.', 'error');
    }
});

// Handle Change Password Form Submission
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match!', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters long!', 'error');
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
        showToast('Password updated successfully!', 'success');
    } catch (error) {
        console.error('Error changing password:', error);
        showToast('Error changing password. Please check your current password.', 'error');
    }
});

// MODULE MANAGEMENT FUNCTIONS

// Clear module form
function clearModuleForm() {
    document.getElementById('moduleForm').reset();
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

    if (!moduleCode || !moduleName) {
        showToast('Module code and name are required!', 'error');
        return;
    }

    if (!moduleId) {
        try {
            const existingModule = await db.collection('modules')
                .where('code', '==', moduleCode)
                .limit(1)
                .get();
            
            if (!existingModule.empty) {
                showToast('A module with this code already exists!', 'error');
                return;
            }
        } catch (error) {
            console.error('Error checking for duplicate module:', error);
            showToast('Error validating module. Please try again.', 'error');
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

    if (!moduleId) {
        moduleData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    try {
        if (moduleId) {
            await db.collection('modules').doc(moduleId).update(moduleData);
            showToast('Module updated successfully!', 'success');
        } else {
            const docRef = await db.collection('modules').add(moduleData);
            showToast('Module created successfully!', 'success');
            console.log('New module created with ID:', docRef.id);
        }
        
        moduleModal.style.display = 'none';
        clearModuleForm();
    } catch (error) {
        console.error('Error saving module:', error);
        showToast('Error saving module. Please try again.', 'error');
    }
}

document.getElementById('moduleForm').addEventListener('submit', handleModuleSubmit);

// Display modules in dashboard grid
function displayModules() {
    const modulesGrid = document.querySelector('.courses-grid');
    if (!modulesGrid) {
        console.log('Modules grid not found');
        return;
    }
    
    console.log('Displaying modules. Count:', modules.length);
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
        
        moduleCard.addEventListener('click', () => {
            switchToModulesPage(module.id);
        });
        
        modulesGrid.appendChild(moduleCard);
    });
    
    console.log('Finished displaying modules. Cards added:', modules.length);
}

function getStatusText(status) {
    switch(status) {
        case 'open': return 'Open for enrollment';
        case 'closed': return 'Closed';
        case 'draft': return 'Draft';
        default: return 'Unknown status';
    }
}

function switchToModulesPage(moduleId = null) {
    const modulesNavItem = document.querySelector('.nav-item[data-page="modules"]');
    if (modulesNavItem) {
        modulesNavItem.click();
        
        if (moduleId) {
            setTimeout(() => {
                highlightModule(moduleId);
            }, 300);
        }
    }
}

function highlightModule(moduleId) {
    const moduleRows = document.querySelectorAll('#modules-table-body tr');
    moduleRows.forEach(row => {
        const editButton = row.querySelector('.edit-module');
        if (editButton && editButton.getAttribute('onclick').includes(moduleId)) {
            row.classList.add('highlighted-row');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            setTimeout(() => {
                row.classList.remove('highlighted-row');
            }, 3000);
        }
    });
}

async function loadAllModulesWithRealTime() {
    try {
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
                showToast('Error loading modules', 'error');
            });
    } catch (error) {
        console.error('Error setting up modules listener:', error);
    }
}

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

async function editModule(moduleId) {
    try {
        showToast('Loading module data...', 'info', 2000);
        
        const moduleDoc = await db.collection('modules').doc(moduleId).get();
        if (!moduleDoc.exists) {
            showToast('Module not found', 'error');
            return;
        }
        
        const moduleData = moduleDoc.data();
        
        if (moduleData.facilitatorId !== auth.currentUser.uid) {
            showToast('You can only edit your own modules', 'error');
            return;
        }
        
        const moduleIdInput = document.getElementById('moduleId') || createHiddenInput('moduleId', 'moduleForm');
        moduleIdInput.value = moduleId;
        
        document.getElementById('moduleCode').value = moduleData.code || '';
        document.getElementById('moduleName').value = moduleData.name || '';
        document.getElementById('moduleDescription').value = moduleData.description || '';
        document.getElementById('moduleStatus').value = moduleData.status || 'draft';
        
        document.querySelector('#moduleModal .modal-title').textContent = 'Edit Module';
        document.querySelector('#moduleModal .btn-primary').textContent = 'Update Module';
        moduleModal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading module for edit:', error);
        showToast('Error loading module data', 'error');
    }
}

async function deleteModule(moduleId) {
    try {
        const moduleDoc = await db.collection('modules').doc(moduleId).get();
        if (!moduleDoc.exists) {
            showToast('Module not found', 'error');
            return;
        }
        
        const moduleData = moduleDoc.data();
        
        if (moduleData.facilitatorId !== auth.currentUser.uid) {
            showToast('You can only delete your own modules', 'error');
            return;
        }
        
        const confirmMessage = `Are you sure you want to delete "${moduleData.name}" (${moduleData.code})?\n\nThis action cannot be undone and will remove all associated content.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        await db.collection('modules').doc(moduleId).delete();
        showToast(`Module "${moduleData.name}" deleted successfully!`, 'success');
        
    } catch (error) {
        console.error('Error deleting module:', error);
        showToast('Error deleting module. Please try again.', 'error');
    }
}

function viewModule(moduleId) {
    showToast('Module viewing functionality coming soon!', 'info');
}

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

// ENHANCED TEST MANAGEMENT FUNCTIONS

async function loadModulesForAdvancedTest() {
    try {
        const snapshot = await db.collection('modules')
            .where('facilitatorId', '==', auth.currentUser.uid)
            .get();
        const moduleSelect = document.getElementById('testModuleAdvanced');
        moduleSelect.innerHTML = '<option value="">-- Select a Module --</option>';
        
        snapshot.forEach(doc => {
            const module = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${module.code} - ${module.name}`;
            moduleSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading modules for advanced test:', error);
        showToast('Error loading modules', 'error');
    }
}

async function loadTests() {
    try {
        let snapshot;
        try {
            snapshot = await db.collection('tests')
                .where('facilitatorId', '==', auth.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();
        } catch (orderError) {
            console.log('OrderBy failed, trying simple query:', orderError);
            snapshot = await db.collection('tests')
                .where('facilitatorId', '==', auth.currentUser.uid)
                .get();
        }
            
        tests = [];
        snapshot.forEach(doc => {
            tests.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort manually if we couldn't sort in the query
        tests.sort((a, b) => {
            const aTime = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
            const bTime = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
            return bTime - aTime;
        });
        
        displayTests();
        populateTestSelect();
    } catch (error) {
        console.error('Error loading tests:', error);
        showToast('Error loading tests. Please try again.', 'error');
        
        tests = [];
        displayTests();
        populateTestSelect();
    }
}

function displayTests() {
    const tableBody = document.getElementById('tests-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (tests.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">No tests found</td>
            </tr>
        `;
        return;
    }
    
    tests.forEach(test => {
        const row = document.createElement('tr');
        const accommodationsCount = test.accommodations?.students?.length || 0;
        
        row.innerHTML = `
            <td><strong>${test.title || test.name || 'Untitled Test'}</strong></td>
            <td>${test.facilitatorName || 'Unknown'}</td>
            <td>${formatDate(test.createdAt)}</td>
            <td>
                <span style="font-weight: 600; color: #2c3e50;">${test.maxAttempts || 1}</span>
            </td>
            <td>
                <span class="status-badge status-${test.status}">${test.status}</span>
            </td>
            <td>
                <div class="visibility-toggle ${test.visible ? 'visible' : 'hidden'}" onclick="toggleTestVisibility('${test.id}', ${test.visible})">
                    <i class="fas fa-${test.visible ? 'eye' : 'eye-slash'}"></i>
                    <span>${test.visible ? 'Visible' : 'Hidden'}</span>
                </div>
            </td>
            <td>
                <div class="accommodations-indicator">
                    <i class="fas fa-universal-access"></i>
                    <span class="accommodations-count">${accommodationsCount}</span>
                    <span>student${accommodationsCount !== 1 ? 's' : ''}</span>
                </div>
            </td>
            <td>
                <button class="action-btn" onclick="editTest('${test.id}')" title="Edit Test">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-danger" onclick="deleteTest('${test.id}')" title="Delete Test">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else {
        return 'N/A';
    }
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

async function toggleTestVisibility(testId, currentVisibility) {
    try {
        const newVisibility = !currentVisibility;
        await db.collection('tests').doc(testId).update({
            visible: newVisibility,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast(`Test ${newVisibility ? 'shown to' : 'hidden from'} students`, 'success');
        
        // Update the local tests array and refresh display
        const testIndex = tests.findIndex(t => t.id === testId);
        if (testIndex !== -1) {
            tests[testIndex].visible = newVisibility;
            displayTests();
        }
    } catch (error) {
        console.error('Error toggling test visibility:', error);
        showToast('Error updating test visibility', 'error');
    }
}

async function editTest(testId) {
    openTestCreation(testId);
}

async function deleteTest(testId) {
    const test = tests.find(t => t.id === testId);
    const testName = test ? (test.title || test.name || 'this test') : 'this test';
    
    if (!confirm(`Are you sure you want to delete "${testName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        await db.collection('tests').doc(testId).delete();
        showToast(`Test "${testName}" deleted successfully!`, 'success');
        loadTests();
    } catch (error) {
        console.error('Error deleting test:', error);
        showToast('Error deleting test', 'error');
    }
}

// ENHANCED TEST CREATION MODAL FUNCTIONS

function openTestCreation(testId = null) {
    currentTestId = testId;
    questions = [];
    editingQuestionIndex = -1;
    currentTestVisibility = false;
    accommodatedStudents = [];
    
    clearTestCreationForm();
    loadModulesForAdvancedTest();
    loadStudentsForAccommodations();
    
    if (testId) {
        loadTestForEditing(testId);
    } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59);
        document.getElementById('dueDate').value = tomorrow.toISOString().slice(0, 16);
        
        updateQuestionsList();
        updateVisibilityToggle();
        updateAccommodationsSummary();
    }
    
    document.getElementById('testCreationModal').style.display = 'flex';
}

function closeTestCreation() {
    document.getElementById('testCreationModal').style.display = 'none';
    clearTestCreationForm();
    questions = [];
    editingQuestionIndex = -1;
    currentTestId = null;
    currentTestVisibility = false;
    accommodatedStudents = [];
}

function clearTestCreationForm() {
    document.getElementById('testTitleInput').value = 'New Test';
    document.getElementById('testModuleAdvanced').value = '';
    document.getElementById('testDurationAdvanced').value = '60';
    document.getElementById('testStatusAdvanced').value = 'draft';
    document.getElementById('dueDate').value = '';
    document.getElementById('gradeCategory').value = 'test';
    document.getElementById('maxPoints').value = '100';
    document.getElementById('maxAttempts').value = '1';
    currentTestVisibility = false;
    accommodatedStudents = [];
    updateVisibilityToggle();
    updateAccommodationsSummary();
    
    const questionsList = document.getElementById('questionsList');
    if (questionsList) {
        questionsList.style.display = 'none';
    }
    
    const createSection = document.getElementById('createSection');
    if (createSection) {
        createSection.style.display = 'block';
    }
}

function updateVisibilityToggle() {
    const visibilityIcon = document.getElementById('visibilityIcon');
    const visibilityText = document.getElementById('visibilityText');
    const visibilityToggle = document.getElementById('visibilityToggle');
    
    if (currentTestVisibility) {
        visibilityIcon.className = 'fas fa-eye';
        visibilityText.textContent = 'Visible to students';
        visibilityToggle.classList.add('visible');
        visibilityToggle.classList.remove('hidden');
    } else {
        visibilityIcon.className = 'fas fa-eye-slash';
        visibilityText.textContent = 'Hidden from students';
        visibilityToggle.classList.add('hidden');
        visibilityToggle.classList.remove('visible');
    }
}

// Add event listener for visibility toggle
document.getElementById('visibilityToggle')?.addEventListener('click', () => {
    currentTestVisibility = !currentTestVisibility;
    updateVisibilityToggle();
    showToast(`Test ${currentTestVisibility ? 'shown to' : 'hidden from'} students`, 'info', 2000);
});

async function loadTestForEditing(testId) {
    try {
        const testDoc = await db.collection('tests').doc(testId).get();
        if (!testDoc.exists) {
            showToast('Test not found', 'error');
            return;
        }
        
        const testData = testDoc.data();
        
        if (testData.facilitatorId !== auth.currentUser.uid) {
            showToast('You can only edit your own tests', 'error');
            return;
        }
        
        // Populate all form fields
        document.getElementById('testTitleInput').value = testData.title || testData.name || 'Untitled Test';
        document.getElementById('testModuleAdvanced').value = testData.moduleId || '';
        document.getElementById('testDurationAdvanced').value = testData.duration || 60;
        document.getElementById('testStatusAdvanced').value = testData.status || 'draft';
        document.getElementById('dueDate').value = testData.dueDate || '';
        document.getElementById('gradeCategory').value = testData.gradeCategory || 'test';
        document.getElementById('maxPoints').value = testData.maxPoints || 100;
        document.getElementById('maxAttempts').value = testData.maxAttempts || 1;
        
        currentTestVisibility = testData.visible || false;
        accommodatedStudents = testData.accommodations?.students || [];
        
        updateVisibilityToggle();
        updateAccommodationsSummary();
        
        if (testData.questions && Array.isArray(testData.questions)) {
            questions = testData.questions;
            updateQuestionsList();
        }
        
        document.querySelector('#testCreationModal .modal-title').textContent = 'Edit Test';
        
    } catch (error) {
        console.error('Error loading test for editing:', error);
        showToast('Error loading test data', 'error');
    }
}

async function saveTest() {
    const testTitle = document.getElementById('testTitleInput').value.trim();
    const moduleId = document.getElementById('testModuleAdvanced').value;
    const duration = parseInt(document.getElementById('testDurationAdvanced').value) || 60;
    const status = document.getElementById('testStatusAdvanced').value;
    const dueDate = document.getElementById('dueDate').value;
    const gradeCategory = document.getElementById('gradeCategory').value;
    const maxPoints = document.getElementById('maxPoints').value;
    const maxAttempts = parseInt(document.getElementById('maxAttempts').value) || 1;
    
    if (!testTitle) {
        showToast('Please enter a test name.', 'error');
        return;
    }
    
    if (!moduleId) {
        showToast('Please select a module for this test.', 'error');
        return;
    }
    
    if (questions.length === 0) {
        showToast('Please add at least one question to save the test.', 'error');
        return;
    }
    
    const testData = {
        title: testTitle,
        name: testTitle,
        moduleId: moduleId,
        duration: duration,
        status: status,
        dueDate: dueDate,
        gradeCategory: gradeCategory,
        maxPoints: parseInt(maxPoints),
        maxAttempts: maxAttempts,
        questions: questions,
        totalQuestions: questions.length,
        visible: currentTestVisibility,
        facilitatorId: auth.currentUser.uid,
        facilitatorName: currentUser.name || currentUser.email,
        accommodations: {
            students: accommodatedStudents,
            count: accommodatedStudents.length
        },
        attempts: 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: currentTestId ? null : firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (currentTestId) {
            await db.collection('tests').doc(currentTestId).update(testData);
            showToast('Test updated successfully!', 'success');
        } else {
            const docRef = await db.collection('tests').add(testData);
            showToast('Test created successfully!', 'success');
            currentTestId = docRef.id;
        }
        
        closeTestCreation();
        loadTests();
        
    } catch (error) {
        console.error('Error saving test:', error);
        showToast('Error saving test. Please try again.', 'error');
    }
}

function cancelTest() {
    if (questions.length > 0 || accommodatedStudents.length > 0) {
        if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
            closeTestCreation();
        }
    } else {
        closeTestCreation();
    }
}

// STUDENT LIMIT FUNCTIONALITY
function updateStudentLimit() {
    const studentLimit = document.getElementById('studentLimit').value;
    const studentLimitIndicator = document.querySelector('.student-limit-indicator');
    
    if (studentLimitIndicator) {
        const countSpan = studentLimitIndicator.querySelector('.student-limit-count');
        if (countSpan) {
            countSpan.textContent = studentLimit === '0' || studentLimit === '' ? '∞' : studentLimit;
        }
    }
}

// ACCOMMODATIONS MANAGEMENT
async function loadStudentsForAccommodations() {
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'student')
            .get();
        
        const studentsList = document.getElementById('studentsList');
        studentsList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const student = doc.data();
            const studentCheckbox = document.createElement('div');
            studentCheckbox.className = 'student-checkbox';
            studentCheckbox.innerHTML = `
                <input type="checkbox" id="student-${doc.id}" value="${doc.id}" 
                    ${accommodatedStudents.includes(doc.id) ? 'checked' : ''}>
                <label for="student-${doc.id}">${student.name || student.email} (${student.studentId || 'No ID'})</label>
            `;
            studentsList.appendChild(studentCheckbox);
        });
        
        // Add event listeners to checkboxes
        document.querySelectorAll('.student-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const studentId = e.target.value;
                if (e.target.checked && !accommodatedStudents.includes(studentId)) {
                    accommodatedStudents.push(studentId);
                } else if (!e.target.checked) {
                    accommodatedStudents = accommodatedStudents.filter(id => id !== studentId);
                }
                updateAccommodationsSummary();
                
                // Show/hide accommodations settings based on selection
                const accommodationsSettings = document.getElementById('accommodationsSettings');
                accommodationsSettings.style.display = accommodatedStudents.length > 0 ? 'block' : 'none';
            });
        });
        
    } catch (error) {
        console.error('Error loading students for accommodations:', error);
        showToast('Error loading students', 'error');
    }
}

function updateAccommodationsSummary() {
    const accommodationsCount = document.getElementById('accommodationsCount');
    if (accommodationsCount) {
        accommodationsCount.textContent = accommodatedStudents.length;
    }
}

function openAccommodationsModal() {
    document.getElementById('accommodationsModal').style.display = 'flex';
}

function closeAccommodationsModal() {
    document.getElementById('accommodationsModal').style.display = 'none';
}

function saveAccommodations() {
    // Accommodations are already being tracked in the accommodatedStudents array
    // and individual accommodation settings are stored in checkboxes
    showToast('Accommodations saved successfully!', 'success');
    closeAccommodationsModal();
}

// Add event listeners for accommodation checkboxes to show/hide details
document.addEventListener('DOMContentLoaded', function() {
    const accommodationCheckboxes = [
        { checkbox: 'extraTimeEnabled', detail: 'extraTimeDetail' },
        { checkbox: 'unlimitedAttemptsEnabled', detail: 'unlimitedAttemptsDetail' },
        { checkbox: 'separateRoomEnabled', detail: 'separateRoomDetail' },
        { checkbox: 'readAloudEnabled', detail: 'readAloudDetail' }
    ];
    
    accommodationCheckboxes.forEach(item => {
        const checkbox = document.getElementById(item.checkbox);
        const detail = document.getElementById(item.detail);
        
        if (checkbox && detail) {
            checkbox.addEventListener('change', (e) => {
                detail.style.display = e.target.checked ? 'block' : 'none';
            });
            
            // Initialize visibility
            detail.style.display = checkbox.checked ? 'block' : 'none';
        }
    });
});

// QUESTION MANAGEMENT FUNCTIONS

function openQuestionModal() {
    editingQuestionIndex = -1;
    clearQuestionForm();
    updateQuestionForm();
    document.getElementById('questionModal').style.display = 'flex';
}

function closeQuestionModal() {
    document.getElementById('questionModal').style.display = 'none';
    clearQuestionForm();
}

function clearQuestionForm() {
    document.getElementById('questionText').value = '';
    document.getElementById('questionPoints').value = '1';
    document.getElementById('questionType').value = 'multiple-choice';
}

function updateQuestionForm() {
    const questionType = document.getElementById('questionType').value;
    const answersSection = document.getElementById('answersSection');
    
    let answersHtml = '';
    
    if (questionType === 'multiple-choice') {
        answersHtml = `
            <div class="form-group">
                <label class="form-label">Answer Options</label>
                <div class="answer-input-group">
                    <input type="text" class="answer-input" placeholder="Option A" data-option="0">
                    <div class="correct-indicator" onclick="selectCorrect(0)" data-correct="0">
                        <i class="fas fa-check" style="display: none;"></i>
                    </div>
                </div>
                <div class="answer-input-group">
                    <input type="text" class="answer-input" placeholder="Option B" data-option="1">
                    <div class="correct-indicator" onclick="selectCorrect(1)" data-correct="1">
                        <i class="fas fa-check" style="display: none;"></i>
                    </div>
                </div>
                <div class="answer-input-group">
                    <input type="text" class="answer-input" placeholder="Option C" data-option="2">
                    <div class="correct-indicator" onclick="selectCorrect(2)" data-correct="2">
                        <i class="fas fa-check" style="display: none;"></i>
                    </div>
                </div>
                <div class="answer-input-group">
                    <input type="text" class="answer-input" placeholder="Option D" data-option="3">
                    <div class="correct-indicator" onclick="selectCorrect(3)" data-correct="3">
                        <i class="fas fa-check" style="display: none;"></i>
                    </div>
                </div>
                <small style="color: #666; margin-top: 10px;">Click the circle to mark the correct answer</small>
            </div>
        `;
    } else if (questionType === 'true-false') {
        answersHtml = `
            <div class="form-group">
                <label class="form-label">Correct Answer</label>
                <div class="answer-input-group">
                    <span style="flex: 1;">True</span>
                    <div class="correct-indicator selected" onclick="selectTrueFalse(true)" data-value="true">
                        <i class="fas fa-check"></i>
                    </div>
                </div>
                <div class="answer-input-group">
                    <span style="flex: 1;">False</span>
                    <div class="correct-indicator" onclick="selectTrueFalse(false)" data-value="false">
                        <i class="fas fa-check" style="display: none;"></i>
                    </div>
                </div>
            </div>
        `;
    } else if (questionType === 'short-answer' || questionType === 'essay') {
        answersHtml = `
            <div class="form-group">
                <label class="form-label">Sample Answer (Optional)</label>
                <textarea class="form-textarea" id="sampleAnswer" placeholder="Enter a sample answer for reference..."></textarea>
            </div>
        `;
    }
    
    answersSection.innerHTML = answersHtml;
}

function selectCorrect(index) {
    document.querySelectorAll('.correct-indicator').forEach((indicator, i) => {
        indicator.classList.remove('selected');
        indicator.querySelector('i').style.display = 'none';
    });
    
    const selectedIndicator = document.querySelector(`[data-correct="${index}"]`);
    selectedIndicator.classList.add('selected');
    selectedIndicator.querySelector('i').style.display = 'inline';
}

function selectTrueFalse(value) {
    document.querySelectorAll('.correct-indicator').forEach(indicator => {
        indicator.classList.remove('selected');
        indicator.querySelector('i').style.display = 'none';
    });
    
    const selectedIndicator = document.querySelector(`[data-value="${value}"]`);
    selectedIndicator.classList.add('selected');
    selectedIndicator.querySelector('i').style.display = 'inline';
}

function saveQuestion() {
    const questionText = document.getElementById('questionText').value.trim();
    const questionType = document.getElementById('questionType').value;
    const points = parseFloat(document.getElementById('questionPoints').value);
    
    if (!questionText) {
        showToast('Please enter a question text', 'error');
        return;
    }
    
    const question = {
        id: Date.now(),
        text: questionText,
        type: questionType,
        points: points,
        answers: []
    };
    
    if (questionType === 'multiple-choice') {
        const answerInputs = document.querySelectorAll('.answer-input');
        const correctIndicator = document.querySelector('.correct-indicator.selected');
        
        answerInputs.forEach((input, index) => {
            if (input.value.trim()) {
                question.answers.push({
                    text: input.value.trim(),
                    correct: correctIndicator && correctIndicator.dataset.correct == index
                });
            }
        });
        
        if (question.answers.length < 2) {
            showToast('Please provide at least 2 answer options', 'error');
            return;
        }
        
        if (!question.answers.some(a => a.correct)) {
            showToast('Please select the correct answer', 'error');
            return;
        }
    } else if (questionType === 'true-false') {
        const correctValue = document.querySelector('.correct-indicator.selected').dataset.value === 'true';
        question.answers = [
            { text: 'True', correct: correctValue },
            { text: 'False', correct: !correctValue }
        ];
    } else if (questionType === 'short-answer' || questionType === 'essay') {
        const sampleAnswer = document.getElementById('sampleAnswer');
        if (sampleAnswer && sampleAnswer.value.trim()) {
            question.sampleAnswer = sampleAnswer.value.trim();
        }
    }
    
    if (editingQuestionIndex >= 0) {
        questions[editingQuestionIndex] = question;
        showToast('Question updated successfully!', 'success');
    } else {
        questions.push(question);
        showToast('Question added successfully!', 'success');
    }
    
    updateQuestionsList();
    closeQuestionModal();
}

function updateQuestionsList() {
    const createSection = document.getElementById('createSection');
    const questionsList = document.getElementById('questionsList');
    const questionCount = document.getElementById('questionCount');
    
    if (questions.length === 0) {
        createSection.style.display = 'block';
        questionsList.style.display = 'none';
    } else {
        createSection.style.display = 'none';
        questionsList.style.display = 'block';
        
        questionsList.innerHTML = questions.map((question, index) => `
            <div class="question-item">
                <div class="question-header">
                    <span class="question-number">Question ${index + 1}</span>
                    <div class="question-actions">
                        <button class="action-btn" onclick="editQuestion(${index})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="duplicateQuestion(${index})" title="Duplicate">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="action-btn" onclick="deleteQuestion(${index})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="question-content">
                    <div class="question-text">${question.text}</div>
                    <span class="question-type">${formatQuestionType(question.type)} • ${question.points} point${question.points !== 1 ? 's' : ''}</span>
                </div>
                ${question.answers.length > 0 ? `
                    <div class="answers-preview">
                        ${question.answers.map(answer => `
                            <div class="answer-option ${answer.correct ? 'correct' : ''}">
                                <i class="fas ${answer.correct ? 'fa-check-circle' : 'fa-circle'}"></i>
                                <span>${answer.text}</span>
                            </div>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        questionsList.innerHTML += `
            <div style="text-align: center; margin-top: 20px;">
                <button class="add-question-btn" onclick="openQuestionModal()">
                    <i class="fas fa-plus"></i>
                    Add Another Question
                </button>
            </div>
        `;
    }
    
    questionCount.textContent = `${questions.length} question${questions.length !== 1 ? 's' : ''}`;
}

function formatQuestionType(type) {
    const types = {
        'multiple-choice': 'Multiple Choice',
        'true-false': 'True/False',
        'short-answer': 'Short Answer',
        'essay': 'Essay'
    };
    return types[type] || type;
}

function editQuestion(index) {
    editingQuestionIndex = index;
    const question = questions[index];
    
    document.getElementById('questionText').value = question.text;
    document.getElementById('questionType').value = question.type;
    document.getElementById('questionPoints').value = question.points;
    
    updateQuestionForm();
    
    setTimeout(() => {
        if (question.type === 'multiple-choice') {
            const answerInputs = document.querySelectorAll('.answer-input');
            const correctIndicators = document.querySelectorAll('.correct-indicator');
            
            question.answers.forEach((answer, i) => {
                if (answerInputs[i]) {
                    answerInputs[i].value = answer.text;
                    if (answer.correct) {
                        selectCorrect(i);
                    }
                }
            });
        } else if (question.type === 'true-false') {
            const correctAnswer = question.answers.find(a => a.correct);
            if (correctAnswer) {
                selectTrueFalse(correctAnswer.text === 'True');
            }
        } else if (question.sampleAnswer) {
            const sampleAnswerField = document.getElementById('sampleAnswer');
            if (sampleAnswerField) {
                sampleAnswerField.value = question.sampleAnswer;
            }
        }
    }, 100);
    
    document.querySelector('.modal-title').textContent = 'Edit Question';
    document.querySelector('.modal-footer .btn-primary').textContent = 'Update Question';
    document.getElementById('questionModal').style.display = 'flex';
}

function duplicateQuestion(index) {
    const question = JSON.parse(JSON.stringify(questions[index]));
    question.id = Date.now();
    questions.splice(index + 1, 0, question);
    updateQuestionsList();
    showToast('Question duplicated successfully!', 'success');
}

function deleteQuestion(index) {
    if (confirm('Are you sure you want to delete this question?')) {
        questions.splice(index, 1);
        updateQuestionsList();
        showToast('Question deleted successfully!', 'success');
    }
}

// ANALYTICS FUNCTIONS

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
        option.textContent = test.title || test.name || 'Untitled Test';
        testSelect.appendChild(option);
    });
}

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
    const statCards = document.querySelectorAll('.stat-number');
    if (statCards.length >= 4) {
        statCards[0].textContent = modules.length;
        statCards[1].textContent = tests.length;
        statCards[2].textContent = students.length;
        statCards[3].textContent = '92%';
    }
}

function updateAnalyticsStats() {
    const statCards = document.querySelectorAll('#analytics-page .stat-number');
    if (statCards.length >= 4) {
        statCards[0].textContent = students.length;
        statCards[1].textContent = '92%';
        statCards[2].textContent = '76%';
        statCards[3].textContent = tests.length;
    }
}

// LOGOUT AND OTHER UTILITY FUNCTIONS

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error signing out:', error);
            showToast('Error signing out. Please try again.', 'error');
        }
    });
}

// Enhanced search functionality for modules
const searchInput = document.querySelector('.search-bar input');
if (searchInput) {
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
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
        if (row.querySelector('.no-data')) return;
        
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
    
    const tableBody = document.getElementById('tests-table-body');
    let noResultsRow = tableBody.querySelector('.no-results');
    
    if (visibleCount === 0 && searchTerm.trim() !== '') {
        if (!noResultsRow) {
            noResultsRow = document.createElement('tr');
            noResultsRow.className = 'no-results';
            noResultsRow.innerHTML = '<td colspan="8" class="no-data">No tests match your search</td>';
            tableBody.appendChild(noResultsRow);
        }
        noResultsRow.style.display = '';
    } else if (noResultsRow) {
        noResultsRow.style.display = 'none';
    }
}

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
        showToast('Error loading modules', 'error');
    }
}

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
            
            if (!moduleId) {
                showToast('Please select a module', 'error');
                return;
            }
            
            if (!title) {
                showToast('Please enter a content title', 'error');
                return;
            }
            
            if (!fileInput.files[0]) {
                showToast('Please select a file to upload', 'error');
                return;
            }
            
            const file = fileInput.files[0];
            const maxSize = 10 * 1024 * 1024;
            
            if (file.size > maxSize) {
                showToast('File size must be less than 10MB', 'error');
                return;
            }
            
            try {
                showToast('Uploading content...', 'info');
                
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
                
                await db.collection('moduleContent').add(contentData);
                
                showToast('Content uploaded successfully!', 'success');
                
                document.getElementById('moduleSelect').value = '';
                document.getElementById('contentTitle').value = '';
                document.getElementById('contentDescription').value = '';
                document.getElementById('contentFile').value = '';
                document.getElementById('contentType').value = 'lecture';
                
            } catch (error) {
                console.error('Error uploading content:', error);
                showToast('Error uploading content. Please try again.', 'error');
            }
        });
    }
}

document.querySelector('.nav-item[data-page="upload"]')?.addEventListener('click', () => {
    setTimeout(populateModuleSelect, 100);
});

// INITIALIZATION

document.addEventListener('DOMContentLoaded', () => {
    const dashboardPage = document.getElementById('dashboard-page');
    if (dashboardPage) {
        dashboardPage.classList.add('active');
    }
    
    initializeDashboard();
    handleContentUpload();
    
    // Add event listener for student limit input
    const studentLimitInput = document.getElementById('studentLimit');
    if (studentLimitInput) {
        studentLimitInput.addEventListener('input', updateStudentLimit);
    }
});

function initializeDashboard() {
    const modulesGrid = document.querySelector('.courses-grid');
    if (modulesGrid) {
        modulesGrid.innerHTML = '<div class="loading-modules">Loading your modules...</div>';
    }
    
    const checkAndDisplayModules = () => {
        if (auth.currentUser && modules !== undefined) {
            displayModules();
            updateDashboardStats();
        } else {
            setTimeout(checkAndDisplayModules, 500);
        }
    };
    
    checkAndDisplayModules();
}

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
window.openQuestionModal = openQuestionModal;
window.closeQuestionModal = closeQuestionModal;
window.selectCorrect = selectCorrect;
window.selectTrueFalse = selectTrueFalse;
window.saveQuestion = saveQuestion;
window.editQuestion = editQuestion;
window.duplicateQuestion = duplicateQuestion;
window.deleteQuestion = deleteQuestion;
window.saveTest = saveTest;
window.cancelTest = cancelTest;
window.openTestCreation = openTestCreation;
window.closeTestCreation = closeTestCreation;
window.toggleTestVisibility = toggleTestVisibility;
window.updateQuestionForm = updateQuestionForm;
window.openAccommodationsModal = openAccommodationsModal;
window.closeAccommodationsModal = closeAccommodationsModal;
window.saveAccommodations = saveAccommodations;
window.updateStudentLimit = updateStudentLimit;