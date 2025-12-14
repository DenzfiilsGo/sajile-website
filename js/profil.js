// P5 Project/js/lihat_profil.js

// ⭐ IMPORT API URL DAN AUTH MANAGER DARI FILE CONFIG.JS/AUTHMANAGER.JS ⭐
import { PUBLIC_BACKEND_URL, API_BASE_URL } from './config.js'; 
import { getAuthToken, removeAuthToken, updateAuthUI, getAuthUser } from './authManager.js'; 

// Asumsi API endpoints
const API_USERS_URL = `${API_BASE_URL}/users`; // Untuk fetch profil publik
const API_RECIPES_BY_USER_URL = `${API_BASE_URL}/recipes/user`; // Untuk fetch resep publik pengguna

const RECIPES_PER_PAGE = 9;

// --- Elemen DOM ---
const body = document.body;
const navAuthLinks = document.querySelector('.nav-auth-links'); // Container tombol Masuk
const themeToggle = document.getElementById('theme-toggle');
const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper'); // Container Profil
const profileContent = document.getElementById('profile-content');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessageEl = document.getElementById('error-message');

const profileAvatarImg = document.getElementById('profile-avatar-img');
const profileUsernameEl = document.getElementById('profile-username');
const profileBioEl = document.getElementById('profile-bio');
const statRecipesEl = document.getElementById('stat-recipes');
const statLikesEl = document.getElementById('stat-likes');
const statJoinedDateEl = document.getElementById('stat-joined-date');
const detailEmailEl = document.getElementById('detail-email');
const detailVerifiedEl = document.getElementById('detail-verified');
const recipesOwnerNameEl = document.getElementById('recipes-owner-name');
const userRecipesListEl = document.getElementById('user-recipes-list');
const editProfileBtn = document.getElementById('edit-profile-btn');

const loadMoreBtnContainer = document.getElementById('load-more-container');
const loadMoreBtn = document.getElementById('load-more-btn');

let targetUserId = null; // ID pengguna yang sedang dilihat
let currentPage = 1;
let isLoadingRecipes = false;

// =======================================================
// FUNGSI UTAMA: UPDATE UI PROFIL (FOTO, NAMA, EMAIL)
// =======================================================

/**
 * Mengambil data pengguna dari localStorage dan memperbarui
 * foto profil, username, dan email pada navbar dropdown.
 */
function updateUserProfileUI() {
    // ✅ PERBAIKAN: Menggunakan kunci 'authUser'
    const userDataJSON = localStorage.getItem('authUser');
    
    if (userDataJSON) {
        try {
            const userData = JSON.parse(userDataJSON);
            
            // 1. Update Profile Picture (ID harus 'profile-pic-img')
            const profilePicImg = document.getElementById('profile-pic-img');
            if (profilePicImg && userData.profilePictureUrl) {
                profilePicImg.src = userData.profilePictureUrl;
                
                // Tambahkan error handler untuk berjaga-jaga jika URL eksternal gagal
                profilePicImg.onerror = () => {
                    console.warn("Gagal memuat foto profil eksternal. Menggunakan default HTML.");
                    // Biarkan browser menggunakan src default yang sudah ada di HTML
                };
            }
            
            // 2. Update Username (ID atau Class)
            const usernameEl = document.querySelector('.username'); // Atau gunakan ID jika ada
            if (usernameEl && userData.username) {
                usernameEl.textContent = userData.username; // Teks biasa (yang akan disembunyikan)
                usernameEl.setAttribute('data-text', userData.username); // Teks untuk animasi marquee
            }
                
            // 3. Update Email (ID atau Class)
            const emailEl = document.querySelector('.email'); // Atau gunakan ID jika ada
            if (emailEl && userData.email) {
                emailEl.textContent = userData.email; // Teks biasa (yang akan disembunyikan)
                emailEl.setAttribute('data-text', userData.email); // Teks untuk animasi marquee
            }
                
        } catch (error) {
            console.error("Gagal memparsing data pengguna dari LocalStorage:", error);
        }
    }
}

// =======================================================
// FUNGSI UTAMA: CEK STATUS LOGIN DAN TAMPILKAN UI YANG SESUAI
// =======================================================

async function checkLoginState(navAuthLinks, profileDropdownWrapper, body) {
    // ✅ PERBAIKAN: Menggunakan kunci 'authToken'
    const token = localStorage.getItem('authToken');
    // ✅ PERBAIKAN: Menggunakan kunci 'authUser'
    const userDataJSON = localStorage.getItem('authUser');
    
    // Asumsi: Token valid jika ada dan data pengguna ada
    if (token && userDataJSON) {
        // Logika sederhana: anggap token dan data di LS valid
        if (navAuthLinks) navAuthLinks.style.display = 'none';
        if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'flex'; // Gunakan flex/block sesuai layout Anda
        if (body) body.dataset.loggedIn = 'true';

        // ⭐ Panggil fungsi untuk memperbarui UI profil ⭐
        updateUserProfileUI();
    } else {
        // Pengguna belum login
        if (navAuthLinks) navAuthLinks.style.display = 'flex'; // Gunakan flex/block sesuai layout Anda
        if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'none';
        if (body) body.dataset.loggedIn = 'false';
    }
}

// --- 2. Cek Status Login Saat Halaman Dimuat ---
checkLoginState(navAuthLinks, profileDropdownWrapper, body);

// =======================================================
// FUNGSI UTAMA: PENGAMBILAN ID DARI URL
// =======================================================

/**
 * Mendapatkan nilai parameter dari URL.
 * @param {string} name - Nama parameter (contoh: 'id').
 * @returns {string|null} Nilai parameter atau null.
 */
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// =======================================================
// FUNGSI UTAMA: FETCH DATA PROFIL
// =======================================================

/**
 * Mengambil data profil pengguna (publik) dari backend.
 * @param {string} userId - ID pengguna yang akan diambil.
 */
async function fetchUserProfile(userId) {
    loadingState.style.display = 'block';
    profileContent.style.display = 'none';
    errorState.style.display = 'none';
    
    // Asumsi: Endpoint publik untuk mengambil profil pengguna lain
    const url = `${API_USERS_URL}/${userId}`; 
    
    try {
        const res = await fetch(url, { method: 'GET' });
        
        if (res.status === 404) {
             throw new Error("Profil pengguna tidak ditemukan.");
        }
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.msg || 'Gagal memuat profil.');
        }

        const userData = await res.json();
        targetUserId = userData._id; // Set ID pengguna yang berhasil dimuat
        renderUserProfile(userData);
        // Lanjutkan untuk memuat resepnya
        await fetchUserRecipes(targetUserId, true);

    } catch (error) {
        console.error('Error saat mengambil profil:', error);
        renderErrorState(error.message);
    } finally {
        loadingState.style.display = 'none';
    }
}

/**
 * Merender data profil ke dalam DOM.
 * @param {object} user - Objek data pengguna.
 */
function renderUserProfile(user) {
    // 1. Update Title
    document.title = `${user.username}'s Profil - SajiLe`;
    
    // 2. Update Header
    profileUsernameEl.textContent = user.username;
    profileBioEl.textContent = user.bio || 'Bio pengguna ini masih kosong atau tidak disediakan.';
    recipesOwnerNameEl.textContent = user.username;
    
    // 3. Update Avatar
    let imageUrl = user.profilePictureUrl || '../assets/default-avatar.png';
    // Gunakan PUBLIC_BACKEND_URL jika URL relatif
    if (imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
        imageUrl = `${PUBLIC_BACKEND_URL}${imageUrl}`;
    }
    profileAvatarImg.src = imageUrl;

    // 4. Update Stats & Details
    statRecipesEl.textContent = user.recipeCount || 0; // Asumsi API mengembalikan field ini
    statLikesEl.textContent = user.totalLikes || 0; // Asumsi API mengembalikan field ini
    
    const joinedDate = user.date ? new Date(user.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    statJoinedDateEl.textContent = joinedDate;

    detailEmailEl.textContent = user.email;
    
    const isVerified = user.isVerified;
    detailVerifiedEl.innerHTML = isVerified 
        ? `<span class="verified-status-badge status-verified">Terverifikasi</span>` 
        : `<span class="verified-status-badge status-unverified">Belum Terverifikasi</span>`;

    // Cek apakah profil yang dilihat adalah profil pengguna yang sedang login
    const loggedInUser = getAuthUser();
    if (loggedInUser && loggedInUser._id === user._id) {
        // Tampilkan tombol edit jika ini adalah profil sendiri
        editProfileBtn.style.display = 'inline-flex';
        editProfileBtn.onclick = () => {
            // Arahkan ke halaman edit profil (asumsi ada)
            window.location.href = 'edit_profil.html'; 
        };
        // Perbarui tautan Profil Saya di navbar agar mengarah ke profil ini
        const myProfileLink = document.getElementById('my-profile-link');
        if (myProfileLink) myProfileLink.href = `lihat_profil.html?id=${loggedInUser._id}`;
    } else {
        editProfileBtn.style.display = 'none';
    }
    
    profileContent.style.display = 'block';
}

/**
 * Menampilkan status error.
 * @param {string} message - Pesan error.
 */
function renderErrorState(message) {
    loadingState.style.display = 'none';
    profileContent.style.display = 'none';
    errorState.style.display = 'block';
    errorMessageEl.textContent = message;
}


// =======================================================
// FUNGSI UTAMA: FETCH RESEP PENGGUNA
// =======================================================

/**
 * Mengambil resep publik milik pengguna.
 * @param {string} userId - ID pengguna yang resepnya akan diambil.
 * @param {boolean} reset - Jika true, hapus konten container sebelum merender.
 */
async function fetchUserRecipes(userId, reset = false) {
    if (isLoadingRecipes) return;

    if (reset) {
        currentPage = 1;
        userRecipesListEl.innerHTML = `<div class="loading-recipes-state"><i class="fas fa-spinner fa-spin"></i> Memuat resep publik...</div>`;
        loadMoreBtn.style.display = 'none';
    }

    isLoadingRecipes = true;
    
    const offset = (currentPage - 1) * RECIPES_PER_PAGE; 
    const url = `${API_RECIPES_BY_USER_URL}/${userId}?limit=${RECIPES_PER_PAGE}&offset=${offset}`;

    if (loadMoreBtn && !reset) loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
    
    try {
        const res = await fetch(url, { method: 'GET' });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.msg || 'Gagal memuat resep pengguna.');
        }

        const data = await res.json();
        const recipes = data.recipes || [];
        const totalRecipes = data.total || 0;
        
        if (reset) {
            userRecipesListEl.innerHTML = ''; 
        }

        renderUserRecipes(recipes);

        // Perbarui state halaman
        currentPage++;
        
        const hasMore = data.hasMore;
        updatePaginationControls(hasMore, totalRecipes);

    } catch (error) {
        console.error('Error saat mengambil resep pengguna:', error);
        if (reset) {
             userRecipesListEl.innerHTML = `<div class="loading-recipes-state">Gagal memuat resep: ${error.message}</div>`;
        }
        loadMoreBtn.style.display = 'none';
    } finally {
        isLoadingRecipes = false;
        if (loadMoreBtn) loadMoreBtn.textContent = 'Muat Lebih Banyak Resep';
    }
}

/**
 * Membuat dan merender card resep (menggunakan asumsi dari resep.js).
 */
function createRecipeCard(recipe) {
    const timeTotal = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    const categoryDisplay = recipe.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    let imageUrl = recipe.imageUrl || 'https://via.placeholder.com/400x300?text=Resep';
    
    if (imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
        imageUrl = `${PUBLIC_BACKEND_URL}${imageUrl}`;
    }

    // Menggunakan kelas card resep standar (asumsi ada di main.css atau resep.css)
    return `
        <a href="detail_resep.html?id=${recipe._id}" class="recipe-card">
            <div class="card-image-wrapper">
                <img src="${imageUrl}" alt="${recipe.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Gagal+Muat'">
                <span class="category-badge">${categoryDisplay}</span>
            </div>
            <div class="card-content">
                <h3 class="card-title">${recipe.title}</h3>
                <div class="card-meta">
                    <span class="time"><i class="far fa-clock"></i> ${timeTotal} Menit</span>
                    <span class="likes"><i class="fas fa-heart"></i> ${recipe.likesCount || 0}</span>
                </div>
            </div>
        </a>
    `;
}

function renderUserRecipes(recipesArray) {
    if (recipesArray.length === 0 && currentPage === 1) {
        userRecipesListEl.innerHTML = `<div class="loading-recipes-state">Pengguna ini belum memublikasikan resep apapun.</div>`;
        return;
    }
    
    // Hapus loading state jika ada sebelum menambahkan resep
    if (userRecipesListEl.querySelector('.loading-recipes-state')) {
        userRecipesListEl.innerHTML = '';
    }

    const newRecipeHTML = recipesArray.map(createRecipeCard).join('');
    userRecipesListEl.insertAdjacentHTML('beforeend', newRecipeHTML);
}

function updatePaginationControls(hasMore, totalRecipes) {
    if (totalRecipes === 0) {
        loadMoreBtnContainer.style.display = 'none';
        return;
    }
    
    if (!hasMore) {
        loadMoreBtnContainer.style.display = 'none'; 
    } else {
        loadMoreBtnContainer.style.display = 'block'; 
        loadMoreBtn.disabled = false;
    }
}


// =======================================================
// INIT & EVENT LISTENERS
// =======================================================

function initApp() {
    // Pastikan Navbar dan Auth UI diperbarui
    updateAuthUI(); 
    
    // --- Ambil ID dari URL ---
    const urlId = getUrlParameter('id');
    const loggedInUser = getAuthUser();
    
    let profileIdToLoad = urlId;

    if (!urlId && loggedInUser) {
        // Jika tidak ada ID di URL, muat profil pengguna yang sedang login
        profileIdToLoad = loggedInUser._id;
        // Juga pastikan link "Profil Saya" di navbar terarah dengan benar
        const myProfileLink = document.getElementById('my-profile-link');
        if (myProfileLink) myProfileLink.href = `lihat_profil.html?id=${profileIdToLoad}`;
    } else if (!urlId && !loggedInUser) {
        // Jika tidak ada ID di URL DAN tidak ada user yang login
        renderErrorState("Anda belum masuk dan tidak ada profil yang ditentukan untuk dilihat. Silakan <a href='daftar_atau_login.html'>Masuk</a>.");
        loadingState.style.display = 'none';
        return;
    }
    
    // 1. Fetch Profil
    if (profileIdToLoad) {
        fetchUserProfile(profileIdToLoad);
    }
    
    // 2. Event Listeners (Navbar Standar SajiLe)
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => { hamburgerBtn.classList.toggle('active'); navMenu.classList.toggle('active'); });
    }

    // B. Dark Mode Toggle
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        // ⭐ Gunakan kunci LS yang konsisten: sajile_theme
        const savedTheme = localStorage.getItem('sajile_theme') || 'light'; 
        
        body.dataset.theme = savedTheme;
        if (icon) {
            icon.classList.toggle('fa-sun', savedTheme === 'dark');
            icon.classList.toggle('fa-moon', savedTheme === 'light');
        }

        themeToggle.addEventListener('click', () => {
            const currentTheme = body.dataset.theme;
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
            body.dataset.theme = newTheme;
            localStorage.setItem('sajile_theme', newTheme);

            if (icon) {
                icon.classList.toggle('fa-moon');
                icon.classList.toggle('fa-sun');
            }
            // Panggil fungsi update gambar setiap kali mode berubah
            updateFeatureImage();
        });
    }

    if (profilePicBtn && profileDropdown) {
        profilePicBtn.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown.classList.toggle('active'); });
        document.addEventListener('click', (e) => { 
            if (profileDropdown && !profileDropdown.contains(e.target) && profilePicBtn && !profilePicBtn.contains(e.target)) {
                 profileDropdown.classList.remove('active'); 
            }
        });
    }
    
    // Logika Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Yakin ingin keluar?")) {
                removeAuthToken(); // Menggunakan fungsi dari authManager
            }
        });
    }
    
    // Logika Load More
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            if (targetUserId) {
                fetchUserRecipes(targetUserId, false); // Muat halaman selanjutnya
            }
        });
    }
}


document.addEventListener('DOMContentLoaded', initApp);

// Blokir seleksi teks via JavaScript (standar)
document.addEventListener('selectstart', function(e) { e.preventDefault(); });
document.addEventListener('dragstart', function(e) { e.preventDefault(); });