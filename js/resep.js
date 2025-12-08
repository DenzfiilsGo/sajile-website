// Blokir seleksi teks via JavaScript
document.addEventListener('selectstart', function(e) {
    e.preventDefault(); // Mencegah aksi default seleksi
});

// Opsional: Blokir drag teks/gambar
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

document.addEventListener('DOMContentLoaded', async () => {
    
    // =======================================================
    // 1. LOGIKA CEK LOGIN
    // =======================================================
    // Ambil URL backend dari /backend_url.json (fallback ke localhost)
    async function loadBackendBaseUrl() {
        const DEFAULT = 'http://localhost:5000'; // fallback lokal
        try {
            const res = await fetch('/backend_url.json', { cache: 'no-cache' });
            if (!res.ok) return DEFAULT;
            const data = await res.json();
            if (!data || !data.url) return DEFAULT;
            // pastikan tidak ada trailing slash
            return data.url.replace(/\/$/, '');
        } catch (err) {
            console.warn('Gagal memuat backend_url.json, gunakan fallback:', err);
            return DEFAULT;
        }
    }

    const BACKEND_BASE_URL = await loadBackendBaseUrl();
    console.log('Menggunakan backend base URL:', BACKEND_BASE_URL);
    const API_RECIPES_URL = `https://metallographical-unoverpaid-omer.ngrok-free.dev/api/recipes`;
    const RECIPES_PER_PAGE = 9;
    
    // --- Elemen DOM ---
    const body = document.body;
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = navMenu ? navMenu.querySelectorAll('.nav-links a') : []; 
    const themeToggle = document.getElementById('theme-toggle');
    const filterTags = document.querySelectorAll('.filter-tags .tag');
    const recipeGrid = document.getElementById('recipe-grid'); // Elemen untuk menampung resep
    const recipeCountDisplay = document.getElementById('recipe-count-display'); // Misalnya untuk "Menampilkan X Resep"

    let currentPage = 0; // Mulai dari halaman 0 (offset 0)
    let totalRecipes = 0;
    let isLoading = false;
    let currentFilter = 'Semua';
    
    
    const recipeContainer = document.getElementById('recipe-container');
    const loadMoreBtnContainer = document.querySelector('.load-more-btn-container');
    const loadMoreBtn = loadMoreBtnContainer ? loadMoreBtnContainer.querySelector('.btn-primary') : null;

    // ... (Setelah deklarasi elemen DOM di baris 16) ...
    
    // ========================================================
    // LOGIKA CEK STATUS LOGIN (NAVBAR UI) - TAMBAHAN BARU
    // ========================================================
    const navAuthLinks = document.querySelector('.nav-auth-links'); // Container tombol Masuk
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper'); // Container Profil
    const logoutBtn = document.getElementById('logout-btn');

    function checkLoginState() {
        const token = localStorage.getItem('authToken'); // Gunakan 'authToken'

        if (token) {
            // User Login: Sembunyikan tombol masuk, Tampilkan profil
            if (navAuthLinks) navAuthLinks.style.display = 'none';
            if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'block';
        } else {
            // User Belum Login: Tampilkan tombol masuk, Sembunyikan profil
            if (navAuthLinks) navAuthLinks.style.display = 'block';
            if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'none';
        }
    }

    // Panggil saat halaman dimuat
    checkLoginState();

    // Logika Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Yakin ingin keluar?")) {
                localStorage.removeItem('authToken');
                window.location.reload(); // Refresh untuk update UI
            }
        });
    }

    // Toggle Dropdown Profil (Untuk Desktop)
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (profilePicBtn && profileDropdown) {
        profilePicBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!profileDropdown.contains(e.target) && !profilePicBtn.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    }
    
    // --- 3. Scroll Animation (Fade In) (Dibiarkan, namun dire-observe setelah render) ---
    const observerOptions = { threshold: 0.15 }; 

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(el => observer.observe(el));

    // ... (Lanjutkan ke kode fetchRecipes dst) ...

    // ========================================================
    // FUNGSI UTAMA UNTUK MENGAMBIL DATA RESEP
    // ========================================================
    
    /**
     * Mengambil resep dari API berdasarkan filter, pencarian, dan pagination.
     * @param {string} filter Kategori filter yang aktif.
     * @param {number} page Halaman yang diminta (untuk offset).
     * @param {boolean} append Jika true, tambahkan ke grid; jika false, hapus grid lama.
     */

    async function fetchRecipes() {
        if (isLoading) return; // Cegah double-click
        isLoading = true;
        
        // Hitung offset: (halaman saat ini) * (resep per halaman)
        const offset = currentPage * RECIPES_PER_PAGE; 
        
        // Tampilkan indikator loading (opsional)
        if (loadMoreBtn) loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';

        try {
            const url = `${API_RECIPES_URL}?limit=${RECIPES_PER_PAGE}&offset=${offset}`;
            console.log('Fetching:', url);
            
            const res = await fetch(url, { cache: 'no-cache' });

            if (!res.ok) {
                // Coba ambil pesan error dari body respons (asumsi backend kirim JSON 500)
                let errorMsg = `Gagal memuat resep: ${res.status} ${res.statusText}`;
                try {
                    const errorData = await res.json();
                    if (errorData.msg) {
                        errorMsg = errorData.msg; // Gunakan pesan error dari backend
                    } else if (errorData.error) {
                        errorMsg = errorData.error; // Atau detail error
                    }
                } catch (jsonError) {
                    // Jika gagal parsing JSON (artinya responsnya adalah HTML!)
                    console.error('Respon API bukan JSON:', await res.text()); 
                    errorMsg = 'Kesalahan server tidak dikenal. API tidak merespons JSON.';
                }
                throw new Error(errorMsg); // Lempar error yang lebih spesifik
            }

            const data = await res.json();
            const recipes = data.recipes || [];
            totalRecipes = data.total || 0;
            
            // 1. Render resep baru
            renderRecipes(recipes);

            // 2. Perbarui state halaman
            currentPage++;

            // 3. Cek apakah masih ada resep untuk dimuat (data.hasMore atau perbandingan)
            const hasMore = data.hasMore; 
            
            if (loadMoreBtnContainer) {
                if (!hasMore) {
                    loadMoreBtnContainer.style.display = 'none'; // Sembunyikan tombol
                    console.log('Semua resep telah dimuat.');
                } else {
                    loadMoreBtnContainer.style.display = 'flex'; // Pastikan terlihat
                    if (loadMoreBtn) loadMoreBtn.textContent = 'Muat Lebih Banyak Resep';
                }
            }

        } catch (error) {
            console.error('Error saat mengambil resep:', error);
            alert('Gagal memuat resep. Silakan coba lagi nanti.');
            if (loadMoreBtn) loadMoreBtn.textContent = 'Gagal Memuat Resep';
        } finally {
            isLoading = false;
            // Panggil kembali observer untuk animasi fade-in pada card baru
            document.querySelectorAll('.recipe-card:not(.visible)').forEach(el => observer.observe(el));
        }
    }
    
    // Pemuatan resep pertama saat halaman dimuat
    await fetchRecipes();

    // Event Listener untuk tombol "Muat Lebih Banyak Resep"
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fetchRecipes();
        });
    }

    // Fungsi untuk merender HTML card resep
    function renderRecipes(recipesArray, append = false) {
        if (!recipesArray || recipesArray.length === 0) {
            if (currentPage === 1) {
                recipeGrid.innerHTML = `<div class="empty-state">Tidak ada resep untuk filter ini.</div>`;
            }
            return;
        }

        const newRecipeHTML = recipesArray.map(recipe => {
            const ratingValue = recipe.avgRating || 0;
            const starHTML = createRatingStarsHTML(ratingValue);
            const shortDesc = recipe.description.length > 100 
                ? recipe.description.substring(0, 100) + '...' 
                : recipe.description;
            
            return `
                <div class="recipe-card fade-in" onclick="window.location.href='resep_detail.html?id=${recipe._id}'" style="cursor:pointer;">
                    <img src="${recipe.imageUrl || 'https://via.placeholder.com/300x200?text=Resep'}" 
                        alt="${recipe.title}" 
                        onerror="this.src='https://via.placeholder.com/300x200?text=Resep'">
                    <div class="card-content">
                        <h3>${recipe.title}</h3>
                        <p class="description">${shortDesc}</p>
                        <div class="rating-display">
                            ${starHTML} (${ratingValue.toFixed(1)})
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        if (append) {
            recipeGrid.insertAdjacentHTML('beforeend', newRecipeHTML);
        } else {
            recipeGrid.innerHTML = newRecipeHTML;
        }
        
        const newlyAddedElements = recipeGrid.querySelectorAll('.recipe-card:not(.visible)');
        newlyAddedElements.forEach(el => observer.observe(el));
    }
    
    // File: resep.js

    // Fungsi untuk membuat markup HTML untuk satu resep
    function createRecipeCard(recipe) {
        const timeTotal = (recipe.prepTime || 0) + (recipe.cookTime || 0);
        const categoryDisplay = recipe.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        return `
            <div class="recipe-card fade-in">
                <a href="detail_resep.html?id=${recipe._id}" class="recipe-link">
                    <div class="recipe-image-container">
                        <img src="${recipe.imageUrl || 'https://via.placeholder.com/800x450?text=Resep+SajiLe'}" alt="${recipe.title}" loading="lazy">
                        <span class="recipe-badge">${categoryDisplay}</span>
                        <button class="btn-fav" aria-label="Tambahkan ke Favorit"><i class="far fa-heart"></i></button>
                    </div>
                    <div class="recipe-info">
                        <h3>${recipe.title}</h3>
                        <div class="recipe-meta">
                            <span class="rating"><i class="fas fa-star"></i> ${recipe.avgRating.toFixed(1)}</span>
                            <span class="time"><i class="far fa-clock"></i> ${timeTotal} menit</span>
                        </div>
                    </div>
                </a>
            </div>
        `;
    }

    // Fungsi untuk menambahkan resep ke kontainer
    function renderRecipes(recipes) {
        const html = recipes.map(createRecipeCard).join('');
        recipeContainer.insertAdjacentHTML('beforeend', html);
    }

    // Fungsi untuk mengupdate tombol Load More
    function updatePaginationControls() {
        if (loadMoreBtn) loadMoreBtn.disabled = false;
        
        const loadedCount = currentPage * RECIPES_PER_PAGE;
        const remainingCount = totalRecipes - loadedCount;
        
        if (recipeCountDisplay) {
            recipeCountDisplay.textContent = `Menampilkan ${Math.min(loadedCount, totalRecipes)} dari ${totalRecipes} Resep`;
        }

        if (loadMoreBtn) {
            if (loadedCount >= totalRecipes) {
                // Sembunyikan atau nonaktifkan jika semua sudah dimuat
                loadMoreBtn.style.display = 'none'; 
            } else {
                // Tampilkan kembali
                loadMoreBtn.style.display = 'block'; 
                loadMoreBtn.textContent = `Muat ${Math.min(remainingCount, RECIPES_PER_PAGE)} Resep Lagi`;
            }
        }
    }
    
    // Fungsi untuk membuat HTML bintang rating (disalin dari resep_detail.js)
    function createRatingStarsHTML(ratingValue) {
        let starsHTML = '';
        const fullStars = Math.floor(ratingValue);
        const hasHalfStar = (Math.round(ratingValue * 10) % 10) === 5; 

        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                starsHTML += '<i class="fas fa-star"></i>';
            } else if (hasHalfStar && i === fullStars + 1) {
                starsHTML += '<i class="fas fa-star-half-alt"></i>';
            } else {
                starsHTML += '<i class="far fa-star"></i>';
            }
        }
        return starsHTML;
    }


    // ========================================================
    // 4. Filter Logic (REAL - Memanggil API)
    // ========================================================
    
    filterTags.forEach(tag => {
        tag.addEventListener('click', function() {
            // Hapus 'active' dari semua tag dan tambahkan ke tag yang diklik
            filterTags.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const newFilter = this.getAttribute('data-filter') || this.textContent.trim();
            
            // Panggil API untuk memuat ulang resep dari Halaman 1 dengan filter baru
            fetchRecipes(newFilter, 1, false); 
        });
    });

    // ========================================================
    // 5. Load More Button (REAL - Pagination)
    // ========================================================
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            const nextPage = currentPage + 1;
            loadMoreBtn.textContent = "Memuat...";
            // Panggil API untuk memuat halaman berikutnya dan tambahkan (append = true)
            fetchRecipes(currentFilter, nextPage, true);
        });
    }


    // ========================================================
    // START UP LOGIC
    // ========================================================
    
    // Muat resep pertama saat halaman dimuat
    fetchRecipes(currentFilter, 1, false); 


    // --- 1. Navbar Toggle Logic (STANDAR WAJIB) ---
    // Memastikan desain navbar dan dropdown vertical menu sesuai standar wajib [2025-11-27]
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');

            if (navMenu.classList.contains('active')) {
                if (window.innerWidth <= 1024) {
                    document.body.style.overflow = 'hidden'; 
                }
            } else {
                document.body.style.overflow = ''; 
            }
        });
    }

    // Tutup menu jika link di dalam dropdown diklik
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            setTimeout(() => {
                if(hamburgerBtn) hamburgerBtn.classList.remove('active');
                if(navMenu) navMenu.classList.remove('active');
                document.body.style.overflow = '';
            }, 300);
        });
    });


    // --- 2. Dark Mode Toggle (Perbaiki nama LS key agar konsisten) ---
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
            const newTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
            body.dataset.theme = newTheme;
            localStorage.setItem('sajile_theme', newTheme);

            if (icon) {
                icon.classList.toggle('fa-moon');
                icon.classList.toggle('fa-sun');
            }
        });
    }
}); // Akhir DOMContentLoaded