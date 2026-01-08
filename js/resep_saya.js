// P5 Project/js/resep_saya.js

// =======================================================
// GLOBAL EVENT LISTENERS
// =======================================================

// Blokir seleksi teks via JavaScript
document.addEventListener('selectstart', function(e) {
    e.preventDefault(); // Mencegah aksi default seleksi
});

// Opsional: Blokir drag teks/gambar
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

// ⭐ IMPORT API URL DAN AUTH MANAGER DARI FILE CONFIG.JS/AUTHMANAGER.JS ⭐
import { backendUrlReady, PUBLIC_BACKEND_URL, API_BASE_URL } from './config.js'; 
import { getAuthToken, removeAuthToken, updateAuthUI } from './authManager.js'; // Menggunakan authManager

// Tunggu sampai config selesai memuat URL
await backendUrlReady;

// Asumsi API untuk resep pengguna
//const API_MY_RECIPES_URL = `${API_BASE_URL}/recipes/my`; 
const API_RECIPES_URL = `${API_BASE_URL}/recipes`; // Untuk Delete

const RECIPES_PER_PAGE = 10;

// --- Elemen DOM ---
const body = document.body;
const hamburgerBtn = document.getElementById('hamburger-btn');
const navMenu = document.getElementById('nav-menu');
const themeToggle = document.getElementById('theme-toggle');
const profilePicBtn = document.getElementById('profile-pic-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const navAuthLinks = document.querySelector('.nav-auth-links');
const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper');
const logoutBtn = document.getElementById('logout-btn');

const recipeListContainer = document.getElementById('my-recipe-list');
const recipeCountDisplay = document.getElementById('recipe-count-display');
const loadMoreBtnContainer = document.getElementById('load-more-container');
const loadMoreBtn = document.getElementById('load-more-btn');

let currentPage = 1;
let totalRecipes = 0;
let isLoading = false;
let currentFilter = 'all'; // 'all', 'published', 'draft'

// =======================================================
// FUNGSI UTAMA: UPDATE UI PROFIL (FOTO, NAMA, EMAIL)
// =======================================================

/**
 * Mengambil data pengguna dari localStorage dan memperbarui
 * foto profil, username, dan email pada navbar dropdown.
 */
function updateUserProfileUI() {
    const userDataJSON = localStorage.getItem('authUser');
    if (!userDataJSON) return;

    try {
        const userData = JSON.parse(userDataJSON);
        const profileImages = document.querySelectorAll('.profile-pic img, .dropdown-header img');
        
        // Pastikan URL Google menggunakan HTTPS
        let photoUrl = userData.profilePictureUrl;
        if (photoUrl && photoUrl.startsWith('http://')) {
            photoUrl = photoUrl.replace('http://', 'https://');
        }

        profileImages.forEach(img => {
            // Hindari reload gambar jika src sudah sama
            if (img.src === photoUrl) return;

            if (photoUrl) {
                // Gunakan crossOrigin anonymous untuk menghindari blokir CORS/CORB pada gambar
                img.crossOrigin = "anonymous"; 
                img.src = photoUrl;
            } else {
                img.src = `https://placehold.co/40x40/2ecc71/fff?text=${userData.username.charAt(0)}`;
            }

            img.onerror = () => {
                // Jika Google memblokir (429/CORB), gunakan inisial sebagai fallback terakhir
                img.src = `https://placehold.co/40x40/2ecc71/fff?text=${userData.username.charAt(0)}`;
                img.onerror = null; // Hentikan loop onerror
            };
        })
            
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

async function checkLoginState(navAuthLinks, profileDropdownWrapper, body) {
    const token = getAuthToken();
    const userDataJSON = localStorage.getItem('authUser');
    
    // REDIRECT JIKA TIDAK LOGIN
    if (!token || !userDataJSON) {
        alert("Anda harus masuk untuk mengakses halaman ini.");
        // Redirect ke halaman login
        window.location.href = 'daftar_atau_login.html'; 
        return false;
    }

    // TAMPILKAN UI LOGIN
    if (navAuthLinks) navAuthLinks.style.display = 'none';
    if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'flex';
    if (body) body.dataset.loggedIn = 'true';
    
    updateUserProfileUI();
    return true;
}

// =======================================================
// FUNGSI UTAMA: LOGIKA FETCH DAN RENDER
// =======================================================

// --- Helper function untuk penanganan respons API yang aman ---
async function handleApiResponseSecure(response) {
    const responseText = await response.text();
    if (response.status === 401) {
        // Token kadaluarsa atau tidak valid, paksa logout
        removeAuthToken();
        alert('Sesi Anda telah berakhir. Silakan masuk kembali.');
        window.location.href = 'daftar_atau_login.html';
        return { ok: false, data: { msg: 'Token tidak valid' } };
    }
    
    if (!response.ok) {
        try {
            const errorData = JSON.parse(responseText);
            return { ok: false, data: errorData };
        } catch (e) {
            return { ok: false, data: { msg: `Kesalahan jaringan atau server: ${response.status}` } };
        }
    }
    
    try {
        const jsonData = JSON.parse(responseText);
        return { ok: true, data: jsonData };
    } catch (e) {
        console.error("Gagal parse JSON. Respons teks:", responseText);
        return { ok: false, data: { msg: 'Kesalahan format respons dari server' } };
    }
}


/**
 * Mengambil resep milik pengguna dari backend
 * @param {boolean} reset - Jika true, hapus konten container sebelum merender
 */
async function fetchMyRecipes(reset = false) {
    if (isLoading) return;

    if (reset) {
        currentPage = 1;
        recipeListContainer.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Memuat resep Anda...</div>`;
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }

    isLoading = true;
    
    const token = getAuthToken();
    if (!token) {
        // Seharusnya sudah ditangani oleh checkLoginState
        isLoading = false;
        return;
    }
    
    // ⭐ PERBAIKAN: Definisikan URL di dalam fungsi agar mendapat nilai API_BASE_URL terbaru
    // Pastikan API_BASE_URL sudah terisi (import dari config.js)
    const API_MY_RECIPES_URL = `${API_BASE_URL}/recipes/my`;

    const offset = (currentPage - 1) * RECIPES_PER_PAGE; 
    let url = `${API_MY_RECIPES_URL}?limit=${RECIPES_PER_PAGE}&offset=${offset}`;

    if (currentFilter !== 'all') {
        // Tambahkan filter status (misalnya status=draft atau status=published)
        url += `&status=${currentFilter}`; 
    }

    if (loadMoreBtn && !reset) loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
    
    console.log('Fetching My Recipes:', url);

    try {
        const res = await fetch(url, { 
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Kirim token untuk otorisasi
                'x-auth-token': token 
            },
            cache: 'no-cache',
            credentials: 'include'
        });

        const result = await handleApiResponseSecure(res);

        if (!result.ok) {
            throw new Error(result.data.msg || 'Gagal memuat resep saya.');
        }

        const data = result.data;
        const recipes = data.recipes || [];
        totalRecipes = data.total || 0;
        
        if (reset) {
            recipeListContainer.innerHTML = ''; // Kosongkan saat reset
        }

        renderMyRecipes(recipes);

        // Perbarui state halaman
        currentPage++;
        
        // Cek apakah masih ada resep untuk dimuat
        const hasMore = data.hasMore;
        
        updatePaginationControls(hasMore);

    } catch (error) {
        console.error('Error saat mengambil resep saya:', error);
        recipeListContainer.innerHTML = `<div class="empty-state">Gagal memuat resep: ${error.message}</div>`;
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    } finally {
        isLoading = false;
    }
}

// Fungsi untuk membuat markup HTML card resep milik pengguna
function createMyRecipeCard(recipe) {
    const timeTotal = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    const categoryDisplay = recipe.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Status (Asumsi: 'published' jika isPublished=true, 'draft' jika false)
    const status = recipe.isPublished ? 'published' : 'draft';
    const statusText = recipe.isPublished ? 'Dipublikasikan' : 'Draft';
    
    let imageUrl = recipe.imageUrl || 'https://via.placeholder.com/150x100?text=Resep+Saya';
    
    if (imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
        imageUrl = `${PUBLIC_BACKEND_URL}${imageUrl}`;
    }

    return `
        <div class="my-recipe-card" data-id="${recipe._id}">
            <div class="card-image-small">
                <img src="${imageUrl}" alt="${recipe.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/150x100?text=Gagal+Muat'">
            </div>
            <div class="card-content">
                <h3>${recipe.title}</h3>
                <div class="meta">
                    <span><i class="far fa-clock"></i> ${timeTotal} Menit</span>
                    <span><i class="fas fa-tag"></i> ${categoryDisplay}</span>
                    <span class="status-badge status-${status}">${statusText}</span>
                </div>
            </div>
            <div class="card-actions">
                <a href="buat_resep.html?id=${recipe._id}" class="btn-action btn-edit"><i class="fas fa-edit"></i>&nbsp;&nbsp;Edit</a>
                <a class="btn-action btn-delete" data-recipe-id="${recipe._id}"><i class="fas fa-trash-alt"></i>&nbsp;&nbsp;Hapus</a>
            </div>
        </div>
    `;
}

// Fungsi untuk merender HTML card resep
function renderMyRecipes(recipesArray) {
    if (!recipesArray || recipesArray.length === 0) {
        if (currentPage === 1 && recipeListContainer.children.length === 0) { 
            recipeListContainer.innerHTML = `<div class="empty-state">Anda belum memiliki resep. Ayo <a href="buat_resep.html">buat yang pertama</a>!</div>`;
        }
        return;
    }

    const newRecipeHTML = recipesArray.map(createMyRecipeCard).join('');
    recipeListContainer.insertAdjacentHTML('beforeend', newRecipeHTML);
    
    // Tambahkan event listener untuk tombol hapus
    recipesArray.forEach(recipe => {
        const deleteBtn = recipeListContainer.querySelector(`.btn-delete[data-recipe-id="${recipe._id}"]`);
        if (deleteBtn) {
            deleteBtn.addEventListener('click', handleDeleteRecipe);
        }
    });
}

// Fungsi untuk mengupdate tombol Load More dan hitungan resep
function updatePaginationControls(hasMore) {
    const loadedCount = (currentPage - 1) * RECIPES_PER_PAGE + recipeListContainer.children.length;

    if (recipeCountDisplay) {
        recipeCountDisplay.textContent = `Menampilkan ${Math.min(loadedCount, totalRecipes)} dari ${totalRecipes} Resep`;
    }

    if (loadMoreBtnContainer && loadMoreBtn) {
        if (!hasMore || loadedCount >= totalRecipes) {
            loadMoreBtnContainer.style.display = 'none'; 
        } else {
            loadMoreBtnContainer.style.display = 'flex'; 
            loadMoreBtn.textContent = 'Muat Lebih Banyak Resep';
            loadMoreBtn.disabled = false;
        }
    }
}


// =======================================================
// FUNGSI UTAMA: HAPUS RESEP
// =======================================================

// 1. HAPUS variabel ini dari level global (baris 22-ish)
// const API_RECIPES_URL = `${API_BASE_URL}/recipes`; 

// 2. REVISI fungsi handleDeleteRecipe
async function handleDeleteRecipe(e) {
    e.preventDefault();
    
    // Tunggu sampai config selesai memuat URL
    await backendUrlReady;

    // Ambil elemen tombol dengan benar
    const btn = e.currentTarget;
    const recipeId = btn.dataset.recipeId;
    const recipeCard = btn.closest('.my-recipe-card');

    if (!confirm("Apakah Anda yakin ingin menghapus resep ini?")) {
        return;
    }

    const token = getAuthToken();
    if (!token) return;

    // Simpan konten asli tombol untuk fallback jika gagal
    const originalContent = btn.innerHTML;

    // Tampilkan indikator loading
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.style.pointerEvents = 'none'; // Mencegah klik ganda

    try {
        // ⭐ SOLUSI RACE CONDITION: Bangun URL di sini saat tombol diklik
        const deleteUrl = `${API_BASE_URL}/recipes/${recipeId}`;
        
        console.log(`Menghapus resep ke: ${deleteUrl}`);

        const res = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'x-auth-token': token 
            }
        });

        const result = await handleApiResponseSecure(res);

        if (!result.ok) {
            throw new Error(result.data.msg || 'Gagal menghapus resep.');
        }

        // Animasi hapus dari DOM
        if (recipeCard) {
            recipeCard.style.opacity = '0';
            recipeCard.style.transform = 'scale(0.9)';
            setTimeout(() => {
                recipeCard.remove();
                alert('Resep berhasil dihapus!');
                // Pastikan fungsi initApp(true) ada dan bekerja
                initApp(true); 
            }, 300);
        }

    } catch (error) {
        console.error('Error saat menghapus resep:', error);
        alert(`Gagal menghapus resep: ${error.message}`);
        
        // Kembalikan ke konten asli jika gagal (Aman dari null error)
        if (btn) {
            btn.innerHTML = originalContent;
            btn.style.pointerEvents = 'auto';
        }
    }
}


// =======================================================
// INIT & EVENT LISTENERS
// =======================================================

function initApp(reset = false) {
    // 1. Cek Status Login (Wajib)
    checkLoginState(navAuthLinks, profileDropdownWrapper, body).then(isLoggedIn => {
        if (isLoggedIn) {
            // 2. Fetch resep jika sudah login
            fetchMyRecipes(reset);
        }
    });

    // --- Navbar & Dark Mode (Standar SajiLe) ---
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => { hamburgerBtn.classList.toggle('active'); navMenu.classList.toggle('active'); });
    }
    if (profilePicBtn && profileDropdown) {
        profilePicBtn.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown.classList.toggle('active'); });
        document.addEventListener('click', (e) => { 
            if (profileDropdown && !profileDropdown.contains(e.target) && profilePicBtn && !profilePicBtn.contains(e.target)) {
                 profileDropdown.classList.remove('active'); 
            }
        });
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
        });
    }

    // Logika Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Yakin ingin keluar?")) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
                window.location.href = '../index.html';
            }
        });
    }

    // Logika Load More
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            fetchMyRecipes(false);
        });
    }

    // Logika Filter
    document.querySelectorAll('.filter-controls .btn-icon').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentFilter = e.currentTarget.dataset.filter;
            document.querySelectorAll('.filter-controls .btn-icon').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            initApp(true); // Reset dan muat ulang resep dengan filter baru
        });
    });
}

// --- LOGIKA STARTUP YANG MENUNGGU URL BACKEND SIAP ---
// Baris ini memastikan tidak ada request ke localhost:8000 secara tidak sengaja
if (API_BASE_URL) {
    console.log("⚡ [ResepSaya] URL Ready, initializing...");
    initApp();
} else {
    window.addEventListener('backend-url-changed', () => {
        console.log("⚡ [ResepSaya] URL Received from config, initializing...");
        initApp();
    }, { once: true });
}