// admin/admin.js
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

let allUsers = [];
let currentDeleteUserId = null;

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
        if (userData.role !== 'admin') {
            alert('Access denied. Admins only.');
            auth.signOut();
            return;
        }

        // Update UI with user info
        document.getElementById('welcomeMessage').textContent = `Welcome, ${userData.name}!`;
        document.getElementById('userEmail').textContent = userData.email;

        // Load all users
        await loadAllUsers();

    } catch (error) {
        console.error('Error loading user data:', error);
        alert('Error loading dashboard');
    }
});

// Load all users from Firestore
async function loadAllUsers() {
    try {
        const usersSnapshot = await db.collection('users').get();
        
        allUsers = [];
        let students = 0, facilitators = 0, admins = 0;

        usersSnapshot.forEach(doc => {
            const userData = {
                id: doc.id,
                ...doc.data()
            };
            allUsers.push(userData);

            // Count by role
            switch (userData.role) {
                case 'student':
                    students++;
                    break;
                case 'facilitator':
                    facilitators++;
                    break;
                case 'admin':
                    admins++;
                    break;
            }
        });

        // Update overview numbers
        document.getElementById('totalUsers').textContent = allUsers.length;
        document.getElementById('totalStudents').textContent = students;
        document.getElementById('totalFacilitators').textContent = facilitators;
        document.getElementById('totalAdmins').textContent = admins;

        // Display users
        displayUsers(allUsers);

    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersTableBody').innerHTML = '<tr><td colspan="5">Error loading users</td></tr>';
    }
}

// Display users in table
function displayUsers(users) {
    const tableBody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No users found</td></tr>';
        return;
    }

    tableBody.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="role-badge role-${user.role}">${user.role}</span></td>
            <td>${user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
            <td>
                <button class="btn-delete" onclick="confirmDeleteUser('${user.id}', '${user.name}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Search and filter functionality
document.getElementById('userSearch').addEventListener('input', filterUsers);
document.getElementById('roleFilter').addEventListener('change', filterUsers);

function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    
    const filteredUsers = allUsers.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm) || 
                             user.email.toLowerCase().includes(searchTerm);
        const matchesRole = roleFilter === '' || user.role === roleFilter;
        
        return matchesSearch && matchesRole;
    });
    
    displayUsers(filteredUsers);
}

// Delete user functionality
function confirmDeleteUser(userId, userName) {
    currentDeleteUserId = userId;
    const modal = document.getElementById('deleteModal');
    modal.querySelector('p').textContent = `Are you sure you want to delete ${userName}? This action cannot be undone.`;
    modal.classList.add('active');
}

document.getElementById('confirmDelete').addEventListener('click', async () => {
    if (currentDeleteUserId) {
        try {
            await db.collection('users').doc(currentDeleteUserId).delete();
            
            // Remove from local array
            allUsers = allUsers.filter(user => user.id !== currentDeleteUserId);
            
            // Refresh display
            await loadAllUsers();
            
            // Close modal
            closeDeleteModal();
            
            alert('User deleted successfully');
            
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user: ' + error.message);
        }
    }
});

document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.classList.remove('active');
    currentDeleteUserId = null;
}

// Close modal when clicking outside
document.getElementById('deleteModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeDeleteModal();
    }
});

// Admin action functions
function refreshData() {
    loadAllUsers();
    alert('Data refreshed successfully!');
}

function exportUsers() {
    // Create CSV content
    const headers = ['Name', 'Email', 'Role', 'Join Date'];
    const csvContent = [
        headers.join(','),
        ...allUsers.map(user => [
            user.name,
            user.email,
            user.role,
            user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A'
        ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edutech_users_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('User data exported successfully!');
}

function viewLogs() {
    alert('System Logs functionality - Coming Soon!\n\nThis would show:\n- User index/logout times\n- Test creation and completion logs\n- System errors and warnings\n- Performance metrics');
}

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out');
    }
});