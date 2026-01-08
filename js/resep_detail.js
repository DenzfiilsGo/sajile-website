// =======================================================
// P5 Project/js/resep_detail.js (INTEGRATED FINAL VERSION)
// =======================================================

// Blokir seleksi teks via JavaScript
document.addEventListener('selectstart', function(e) {
    e.preventDefault(); // Mencegah aksi default seleksi
});

// Opsional: Blokir drag teks/gambar
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

import { API_BASE_URL, PUBLIC_BACKEND_URL } from '../js/config.js';
import { getAuthToken, getAuthUser, removeAuthToken } from './authManager.js'; 

// --- STATE GLOBAL ---
let currentRecipeId = null;
let selectedRating = 0.0; 
let currentMultiplier = 1;
let originalServingSize = null;

let recipeBaseData = {
    isLoggedIn: false,
    pricePerServing: 25000,
    caloriesPerServing: 450,
    isPremiumUser: false, // Akan diupdate otomatis
    activeMembership: 'free',
    features: {
        cookingMode: false,
        premiumCalculator: false,
        printLimit: 3,
        aiLimit: 5
    }
};

// Helper untuk memetakan benefit berdasarkan paket dari paket_langganan.html
const MEMBERSHIP_BENEFITS = {
    'free':            { cookingMode: false, premiumCalculator: false, printLimit: 3,   aiLimit: 5 },
    'starter_taster':  { cookingMode: true,  premiumCalculator: true,  printLimit: 5,   aiLimit: 10 },
    'starter_pro':     { cookingMode: true,  premiumCalculator: true,  printLimit: 10,  aiLimit: 15 },
    'premium_home':    { cookingMode: true,  premiumCalculator: true,  printLimit: 15,  aiLimit: 25 },
    'premium_elite':   { cookingMode: true,  premiumCalculator: true,  printLimit: 25,  aiLimit: 50 },
    'legend_year':     { cookingMode: true,  premiumCalculator: true,  printLimit: 50,  aiLimit: 120 },
    'legend_eternal':  { cookingMode: true,  premiumCalculator: true,  printLimit: 100, aiLimit: 300 }
};

// =======================================================
// 1. STANDAR WAJIB: NAVIGASI & UI DASAR (Update 2025-11-27)
// =======================================================

async function initStandardUI() {
    const user = getAuthUser(); // Ambil data user dari localStorage/session

    if (user) {
        recipeBaseData.isLoggedIn = true;
        // 1. Tentukan benefit berdasarkan membership user di DB
        const membership = user.membership || 'free';
        const benefits = MEMBERSHIP_BENEFITS[membership] || MEMBERSHIP_BENEFITS['free'];
        
        // 2. Update State Global
        recipeBaseData.activeMembership = membership;
        recipeBaseData.isPremiumUser = membership !== 'free';
        recipeBaseData.features = benefits;

        console.log(`SajiLe Auth: Login sebagai ${user.username} (${membership})`);
        
        // 3. Update UI berdasarkan hak akses
        updateFeatureAccessUI(benefits);
    } else {
        recipeBaseData.isLoggedIn = false;
        updateFeatureAccessUI(MEMBERSHIP_BENEFITS['free']);
    }

    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const navMenu = document.getElementById('nav-menu');
    const logoutBtn = document.getElementById('logout-btn');

    // A. Theme Management
    if (localStorage.getItem('sajile_theme') === 'dark') {
        body.dataset.theme = 'dark';
        if (themeToggle) themeToggle.querySelector('i').className = 'fas fa-sun';
    }

    // A. Dropdown Menu Profil
    if (profilePicBtn && profileDropdown) {
        profilePicBtn.addEventListener('click', (e) => { 
            e.stopPropagation(); // Penting untuk mencegah event close di bawah
            profileDropdown.classList.toggle('active'); 
        });
        
        // Tutup dropdown jika mengklik di luar
        document.addEventListener('click', (e) => { 
            if (profileDropdown && profilePicBtn && 
                !profileDropdown.contains(e.target) && 
                !profilePicBtn.contains(e.target)) 
            {
                profileDropdown.classList.remove('active');
            }
        });
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = body.dataset.theme === 'dark';
            body.dataset.theme = isDark ? 'light' : 'dark';
            localStorage.setItem('sajile_theme', body.dataset.theme);
            themeToggle.querySelector('i').className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        });
    }

    // B. Hamburger & Vertical Menu (Mandatory Standard)
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // C. Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Yakin ingin keluar?")) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
                window.location.reload();
            }
        });
    }

    // D. Profile UI Update
    updateUserProfileUI();
}

// Fungsi pembantu untuk mengaktifkan/menonaktifkan tombol fitur di UI
function updateFeatureAccessUI(benefits) {
    const cookingBtn = document.getElementById('btn-cooking-mode');
    const calculatorPortion = document.querySelector('.portion-calculator-premium'); // Sesuaikan selector
    const aiInfoLabel = document.getElementById('ai-credit-info'); // Jika ada label info kredit

    // Aktifkan Mode Memasak jika punya akses
    if (cookingBtn) {
        if (benefits.cookingMode) {
            cookingBtn.classList.remove('locked-feature');
            cookingBtn.title = "Mode Memasak Aktif";
        } else {
            cookingBtn.classList.add('locked-feature');
            cookingBtn.title = "Hanya untuk paket Starter/Premium/Legend";
        }
    }

    // Tampilkan info limit AI di UI (Opsional)
    if (aiInfoLabel) {
        aiInfoLabel.innerText = `Jatah harian paket Anda: ${benefits.aiLimit} Kredit`;
    }
}

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

// =======================================================
// 2. SISTEM RATING PRESISI (KOORDINAT MOUSE) 🌟
// =======================================================

function initRatingSystem() {
    const ratingContainer = document.querySelector('.rating-input');
    const stars = document.querySelectorAll('.rating-input .star');
    const ratingText = document.getElementById('rating-text');

    if (!ratingContainer) return;

    // Hover Effect
    ratingContainer.addEventListener('mousemove', (e) => {
        let hoverVal = calculateRatingFromMouse(e, stars);
        updateStarsUI(hoverVal, stars);
    });

    // Reset on Leave
    ratingContainer.addEventListener('mouseleave', () => {
        updateStarsUI(selectedRating, stars);
    });

    // Click to Set
    ratingContainer.addEventListener('click', (e) => {
        selectedRating = calculateRatingFromMouse(e, stars);
        updateStarsUI(selectedRating, stars);
        if (ratingText) ratingText.textContent = ` (${selectedRating.toFixed(1)}/5)`;
    });
}

function calculateRatingFromMouse(e, stars) {
    let rating = 0;
    stars.forEach((star, index) => {
        const rect = star.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
            const width = rect.right - rect.left;
            const x = e.clientX - rect.left;
            rating = (x < width / 2) ? index + 0.5 : index + 1;
        } else if (e.clientX > rect.right) {
            rating = index + 1;
        }
    });
    return Math.min(5, rating);
}

function updateStarsUI(val, starsElements) {
    starsElements.forEach(star => {
        const starVal = parseFloat(star.getAttribute('data-rating'));
        const icon = star.querySelector('i');
        icon.className = 'far fa-star'; // Default empty

        if (starVal <= Math.floor(val)) {
            icon.className = 'fas fa-star';
        } else if (starVal === Math.ceil(val) && (val % 1 !== 0)) {
            icon.className = 'fas fa-star-half-alt';
        }
    });
}

// =======================================================
// 3. FITUR DETAIL RESEP & KALKULATOR PORSI (DENGAN PROTEKSI PREMIUM)
// =======================================================

async function fetchRecipeDetails() {
    try {
        // Ambil token untuk mengecek status favorit secara real-time dari backend
        const token = getAuthToken(); 
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_BASE_URL}/recipes/${currentRecipeId}`, {
            method: 'GET',
            headers: headers // Kirim token jika ada
        });

        // --- LOGIKA BARU: PROTEKSI PREMIUM ---
        if (res.status === 403) {
            const result = await res.json();
            if (result.isLocked) {
                // Berikan efek blur pada pembungkus konten utama
                const mainWrapper = document.querySelector('.main-wrapper');
                if (mainWrapper) mainWrapper.style.filter = 'blur(8px)';
                
                showPremiumModal(result.msg, true); // Kirim true agar user balik kanan
                
                // Render preview terbatas (Judul & Gambar saja agar tidak kosong)
                if (result.title) document.querySelector('.recipe-hero h1').textContent = result.title;
                if (result.imageUrl) {
                    let imgPath = result.imageUrl;
                    if (imgPath.startsWith('/')) imgPath = `${PUBLIC_BACKEND_URL}${imgPath}`;
                    document.querySelector('.recipe-image-container img').src = imgPath;
                }
                return; // Stop eksekusi agar bahan & langkah tidak terisi
            }
        }
        // ---------------------------------------

        if (!res.ok) throw new Error("Resep tidak ditemukan");
        const recipe = await res.json();

        // --- TAMBAHKAN BARIS INI ---
        // Simpan data ke state global agar bisa diakses oleh Mode Memasak
        recipeBaseData.currentRecipe = recipe; 
        // ---------------------------

        // Update status premium user
        const user = getAuthUser();
        // PERBAIKAN: Gunakan kriteria yang sama (bukan 'free')
        isPremiumUser = user && user.membership !== 'free';
        recipeBaseData.isPremiumUser = isPremiumUser;

        // Jalankan proteksi hanya jika bukan premium (atau aktifkan selalu jika ingin lebih ketat)
        initAntiCheat();

        // Render Content
        document.title = `${recipe.title} - SajiLe`;
        document.querySelector('.recipe-hero h1').textContent = recipe.title;
        document.querySelector('.recipe-hero p').textContent = recipe.description;
        
        let imgPath = recipe.imageUrl || 'https://via.placeholder.com/800';
        if (imgPath.startsWith('/')) imgPath = `${PUBLIC_BACKEND_URL}${imgPath}`;
        document.querySelector('.recipe-image-container img').src = imgPath;

        // Meta Info
        const meta = document.querySelectorAll('.recipe-meta-bar p span');
        if(meta[0]) meta[0].textContent = recipe.cookTime || '30';
        if(meta[1]) meta[1].textContent = recipe.servingSize || '4';
        originalServingSize = recipe.servingSize || 4;

        // Ingredients with attributes for Calculator
        const ingList = document.getElementById('ingredients-list');
        ingList.innerHTML = recipe.ingredients.map(ing => `
            <li data-qty="${ing.quantity}" data-unit="${ing.unit}">
                <span>${ing.name}</span>
                <span class="qty-val">${ing.quantity} ${ing.unit}</span>
            </li>
        `).join('');

        // 2. Render Tools (Alat) - TAMBAHKAN BAGIAN INI
        const toolsCard = document.getElementById('tools-card');
        const toolsList = document.getElementById('tools-list');

        if (recipe.tools && recipe.tools.length > 0) {
            toolsCard.style.display = 'block';
            
            toolsList.innerHTML = recipe.tools.map(tool => {
                // Cek apakah tool itu object atau string untuk menghindari undefined
                const toolName = typeof tool === 'object' ? tool.name : tool;
                
                return `
                    <li>
                        <i class="fas fa-screwdriver-wrench"></i> 
                        <span>${toolName}</span>
                    </li>
                `;
            }).join('');
        } else {
            // Jika data tools tidak ada di DB, sembunyikan kartunya
            if (toolsCard) toolsCard.style.display = 'none';
        }

        // Steps
        const stepList = document.querySelector('.steps-list');
        stepList.innerHTML = recipe.steps.map((s, i) => `
            <li><span class="step-number">${i+1}</span><p>${s}</p></li>
        `).join('');

        setupServingCalculator();
        initPremiumCalculatorLogic(); 
        setupPremiumAction();
        setupFavoriteButton(recipe.isFavorited);

    } catch (err) {
        console.error(err);
        document.querySelector('.main-wrapper').innerHTML = `<div class="error-msg">Gagal memuat resep.</div>`;
    }
}

function showPremiumModal(message, shouldGoBack = false) {
    Swal.fire({
        title: 'Konten Eksklusif!',
        text: message,
        icon: 'warning',
        iconColor: 'var(--danger-color)',
        showCancelButton: true,
        confirmButtonColor: '#2ecc71',
        cancelButtonColor: '#95a5a6',
        confirmButtonText: '<i class="fas fa-gem"></i> Berlangganan Sekarang',
        cancelButtonText: 'Mungkin Nanti',
        background: document.body.dataset.theme === 'dark' ? '#2c3e50' : '#fff',
        color: document.body.dataset.theme === 'dark' ? '#fff' : '#000',
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'paket_langganan.html';
        } else {
            // Logika Pintar: Hanya kembali jika dipicu oleh proteksi halaman utama
            if (shouldGoBack) {
                window.history.back();
            }
            // Jika false (fitur opsional), SweetAlert akan tertutup otomatis tanpa pindah halaman
        }
    });
}

function setupServingCalculator() {
    const display = document.getElementById('serving-multiplier');
    const sizeDisplay = document.getElementById('serving-size');
    const btnPlus = document.getElementById('increase-serving');
    const btnMinus = document.getElementById('decrease-serving');

    const update = () => {
        // 1. Update teks multiplier
        if (display) display.textContent = `${currentMultiplier}x`;
        
        // 2. Update teks jumlah porsi
        const totalServings = Math.round(originalServingSize * currentMultiplier);
        if (sizeDisplay) sizeDisplay.textContent = totalServings;
        
        // 3. Update daftar bahan-bahan
        document.querySelectorAll('#ingredients-list li').forEach(li => {
            const base = parseFloat(li.dataset.qty);
            const unit = li.dataset.unit;
            if (!isNaN(base)) {
                const total = base * currentMultiplier;
                const formattedQty = total % 1 === 0 ? total : total.toFixed(1);
                const qtyElement = li.querySelector('.qty-val');
                if (qtyElement) qtyElement.textContent = `${formattedQty} ${unit}`;
            }
        });

        // 4. Update Kalkulator Premium
        if (typeof updatePremiumMetrics === 'function') {
            updatePremiumMetrics(currentMultiplier);
        }
    };

    if (btnPlus) {
        btnPlus.onclick = (e) => {
            e.preventDefault();
            
            // --- LOGIKA LIMITASI ---
            const nextMultiplier = currentMultiplier + 0.5;
            const nextTotalServing = Math.round(originalServingSize * nextMultiplier);

            // Jika bukan premium dan porsi berikutnya melebihi 10
            if (!recipeBaseData.isPremiumUser && nextTotalServing > 10) {
                if (!recipeBaseData.isLoggedIn) {
                    Swal.fire({
                        title: 'Batas Porsi Tercapai',
                        text: 'Pengguna gratis hanya dapat menghitung hingga maksimal 10 porsi. Masuk dan berlangganan paket sekarang untuk akses tanpa batas!',
                        icon: 'warning',
                        iconColor: 'var(--danger-color)',
                        showCancelButton: true,
                        confirmButtonText: 'Masuk Sekarang',
                        cancelButtonText: 'Nanti Saja',
                        confirmButtonColor: '#f1c40f',
                        cancelButtonColor: '#95a5a6',
                        background: document.body.dataset.theme === 'dark' ? '#2c3e50' : '#fff',
                        color: document.body.dataset.theme === 'dark' ? '#fff' : '#000'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = 'daftar_atau_login.html';
                        }
                    });
                    return; // Berhenti di sini, porsi tidak bertambah
                }
                Swal.fire({
                    title: 'Batas Porsi Tercapai',
                    text: 'Pengguna gratis hanya dapat menghitung hingga maksimal 10 porsi. Berlangganan paket sekarang untuk akses tanpa batas!',
                    icon: 'warning',
                    iconColor: 'var(--danger-color)',
                    showCancelButton: true,
                    confirmButtonText: '<i class="fas fa-gem"></i> Berlangganan Sekarang',
                    cancelButtonText: 'Nanti Saja',
                    confirmButtonColor: '#f1c40f', // Warna Emas untuk Upgrade
                    cancelButtonColor: '#95a5a6',
                    background: document.body.dataset.theme === 'dark' ? '#2c3e50' : '#fff',
                    color: document.body.dataset.theme === 'dark' ? '#fff' : '#000'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = 'paket_langganan.html';
                    }
                });
                return; // Berhenti di sini, porsi tidak bertambah
            }

            currentMultiplier = nextMultiplier;
            update();
        };
    }

    if (btnMinus) {
        btnMinus.onclick = (e) => {
            e.preventDefault();
            if (currentMultiplier > 0.5) {
                currentMultiplier -= 0.5;
                update();
            }
        };
    }
    
    update();
}

function initPremiumCalculatorLogic() {
    const user = getAuthUser();
    // Perbaikan: Jika bukan 'free', maka dia punya akses premium calculator
    recipeBaseData.isPremiumUser = user && user.membership !== 'free';

    const premiumCard = document.getElementById('premium-calculator-card');
    const staticNutriCard = document.querySelector('.nutrition-static-card');

    if (recipeBaseData.isPremiumUser) {
        if (premiumCard) premiumCard.style.display = 'block';
        if (staticNutriCard) staticNutriCard.style.display = 'none';
        
        // Jalankan update pertama kali
        updatePremiumMetrics(currentMultiplier);
    } else {
        if (premiumCard) premiumCard.style.display = 'none';
        if (staticNutriCard) staticNutriCard.style.display = 'block';
    }
}

// Fungsi untuk menghitung angka premium
function updatePremiumMetrics(multiplier) {
    if (!recipeBaseData.isPremiumUser) return;

    const totalCaloriesVal = document.getElementById('total-calories-val');
    const totalCostVal = document.getElementById('total-cost-val');

    // Kalkulasi sederhana berdasarkan multiplier
    const totalCalories = recipeBaseData.caloriesPerServing * multiplier * (originalServingSize || 1);
    const totalCost = recipeBaseData.pricePerServing * multiplier * (originalServingSize || 1);

    // Update tampilan dengan format mata uang
    if (totalCaloriesVal) {
        totalCaloriesVal.innerText = `${Math.round(totalCalories).toLocaleString('id-ID')} kcal`;
    }
    if (totalCostVal) {
        totalCostVal.innerText = `Rp ${totalCost.toLocaleString('id-ID')}`;
    }
}

function setupPremiumAction() {
    const btnAnalyze = document.getElementById('btn-analyze-premium');
    if (!btnAnalyze) return;

    btnAnalyze.onclick = () => {
        const totalCost = (recipeBaseData.pricePerServing * currentMultiplier * (originalServingSize || 1)).toLocaleString('id-ID');
        
        Swal.fire({
            title: 'Analisis Nutrisi & Biaya',
            html: `
                <div style="text-align: left;">
                    <p><strong>Estimasi Belanja:</strong> Rp ${totalCost}</p>
                    <p><strong>Rincian Nutrisi Total:</strong></p>
                    <ul>
                        <li>Protein: ${35 * currentMultiplier * 6}g</li>
                        <li>Lemak: ${30 * currentMultiplier * 6}g</li>
                        <li>Karbohidrat: ${10 * currentMultiplier * 6}g</li>
                    </ul>
                    <small>*Harga berdasarkan rata-rata pasar saat ini.</small>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Tutup',
            confirmButtonColor: 'var(--primary-color)'
        });
    };
}

// Tambahkan fungsi ini untuk merender statistik rating
function renderRatingStats(comments) {
    const total = comments.length;
    const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    comments.forEach(c => {
        const r = Math.round(c.rating);
        if (stats[r] !== undefined) stats[r]++;
        sum += c.rating;
    });

    const avg = total > 0 ? (sum / total).toFixed(1) : "0.0";

    // Update UI Angka Besar
    document.getElementById('avg-rating-large').textContent = avg;
    document.getElementById('total-reviews-count').textContent = `${total} Ulasan`;
    
    // Update Grafik Batang
    for (let i = 1; i <= 5; i++) {
        const percentage = total > 0 ? (stats[i] / total) * 100 : 0;
        document.getElementById(`bar-${i}`).style.width = `${percentage}%`;
    }

    // Update Bintang Rata-rata
    const avgStarsContainer = document.getElementById('avg-stars-display');
    if (avgStarsContainer) {
        avgStarsContainer.innerHTML = renderStaticStars(parseFloat(avg));
    }
}

// =======================================================
// 4. SISTEM KOMENTAR (CRUD & MODAL EDIT)
// =======================================================

async function fetchComments() {
    const list = document.getElementById('comment-list');
    try {
        const res = await fetch(`${API_BASE_URL}/comments/${currentRecipeId}`);
        const comments = await res.json();

        // --- TAMBAHKAN PEMANGGILAN STATISTIK DI SINI ---
        renderRatingStats(comments);
        
        document.getElementById('comment-count').textContent = comments.length;
        const user = getAuthUser();
        const myId = user ? (user._id || user.id) : null;

        list.innerHTML = comments.map(c => {
            const isMe = c.user && (c.user._id === myId || c.user.id === myId);
            return `
            <div class="comment-item ${isMe ? 'user-comment' : ''}" data-id="${c._id}">
                <div class="comment-avatar">
                    <img src="${c.user.profilePictureUrl || 'https://via.placeholder.com/50'}" alt="Avatar">
                </div>
                <div class="comment-body">
                    <h4>${c.user.username} ${isMe ? '<small>(Anda)</small>' : ''}</h4>
                    <div class="rating-stars-static">${renderStaticStars(c.rating)}</div>
                    <p class="comment-text-content">${c.content}</p>
                    ${isMe ? `
                        <div class="comment-actions">
                            <button class="btn-edit" data-id="${c._id}" data-text="${c.content}" ${c.isEdited ? 'disabled' : ''}>
                                ${c.isEdited ? 'Diedit' : 'Edit'}
                            </button>
                            <button class="btn-delete" data-id="${c._id}">Hapus</button>
                        </div>
                    ` : ''}
                </div>
            </div>`;
        }).join('');
    } catch(e) { console.error(e); }
}

function renderStaticStars(rating) {
    let html = '';
    for(let i=1; i<=5; i++) {
        if(i <= Math.floor(rating)) html += '<i class="fas fa-star"></i>';
        else if(i === Math.ceil(rating) && rating % 1 !== 0) html += '<i class="fas fa-star-half-alt"></i>';
        else html += '<i class="far fa-star"></i>';
    }
    return html;
}

// Handler Submit Komentar Baru
async function submitComment() {
    const text = document.getElementById('comment-textarea').value.trim();
    if (selectedRating === 0) return alert("Pilih rating terlebih dahulu!");
    if (!text) return alert("Tuliskan ulasan Anda!");

    try {
        const res = await fetch(`${API_BASE_URL}/comments`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ recipeId: currentRecipeId, content: text, rating: selectedRating })
        });

        if(res.ok) {
            document.getElementById('comment-textarea').value = '';
            selectedRating = 0;
            initRatingSystem(); // Reset Visual
            fetchComments();
        } else {
            const data = await res.json();
            alert(data.msg || "Gagal mengirim ulasan");
        }
    } catch(e) { console.error(e); }
}

// Handler Edit & Hapus (Delegation)
function initCommentActions() {
    const list = document.getElementById('comment-list');
    const modal = document.getElementById('editCommentModal');
    const editArea = document.getElementById('edit-comment-textarea');
    let activeEditId = null;

    list.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        
        if(e.target.classList.contains('btn-delete')) {
            if(confirm("Hapus ulasan ini?")) {
                const res = await fetch(`${API_BASE_URL}/comments/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
                });
                if(res.ok) fetchComments();
            }
        }

        if(e.target.classList.contains('btn-edit')) {
            activeEditId = id;
            editArea.value = e.target.dataset.text;
            modal.style.display = 'block';
        }
    });

    document.getElementById('save-edit-btn').onclick = async () => {
        const newText = editArea.value.trim();
        if(!newText) return;

        const res = await fetch(`${API_BASE_URL}/comments/${activeEditId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ content: newText })
        });
        if(res.ok) {
            modal.style.display = 'none';
            fetchComments();
        }
    };

    document.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
}

// =======================================================
// 5. TOMBOL FAVORIT & PRINT (FIXED VERSION - SOLUTION B)
// =======================================================

function setupFavoriteButton(isFav) {
    const btn = document.getElementById('btn-save');
    if(!btn) return;

    // Gunakan Boolean() agar truthy value (objek/ID) dari backend terkonversi jadi true murni
    let active = Boolean(isFav); 

    const updateUI = (state) => {
        btn.classList.toggle('active', state);
        btn.innerHTML = state 
            ? `<i class="fas fa-heart"></i> Tersimpan` 
            : `<i class="far fa-heart"></i> Simpan ke Favorit`;
    };

    // Initial load
    updateUI(active);

    btn.onclick = async () => {
        const token = getAuthToken();
        if(!token) return alert("Silakan login dulu!");

        // Simpan status lama untuk rollback jika terjadi error
        const previousState = active;

        // 1. Tentukan Method dan URL berdasarkan status saat ini
        // Jika active = true, berarti user ingin MENGHAPUS (DELETE)
        // Jika active = false, berarti user ingin MENAMBAH (POST)
        const method = active ? 'DELETE' : 'POST';
        const url = active 
            ? `${API_BASE_URL}/favorites/${currentRecipeId}` // DELETE: /api/favorites/ID_RESEP
            : `${API_BASE_URL}/favorites`;                  // POST:   /api/favorites

        // 2. Optimistic Update (Ubah UI dulu agar terasa instan bagi user)
        active = !active;
        updateUI(active);

        try {
            const fetchOptions = {
                method: method,
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                }
            };

            // 3. Hanya tambahkan body jika metodenya POST
            if (method === 'POST') {
                fetchOptions.body = JSON.stringify({ recipeId: currentRecipeId });
            }

            const res = await fetch(url, fetchOptions);
            
            if (!res.ok) {
                // Tangkap error 400 atau 404 dari server
                const errorData = await res.json();
                throw new Error(errorData.msg || "Gagal memperbarui favorit");
            }

            const data = await res.json();
            
            // 4. Sinkronisasi akhir dengan data asli dari backend
            // Backend mengirim { isFavorited: true/false } di kedua endpoint tersebut
            active = Boolean(data.isFavorited);
            updateUI(active);
            
        } catch(e) { 
            console.error("Favorite Error:", e.message);
            // 5. Rollback ke status semula jika request gagal
            active = previousState;
            updateUI(active);
            alert(e.message);
        }
    };
}

// =======================================================
// 5.1 LOGIKA PROTEKSI CETAK & AKSES PAKET (INTEGRATED)
// =======================================================

async function handlePrintFeature() {
    const user = getAuthUser();
    
    // 1. Proteksi jika belum login
    if (!user) {
        Swal.fire({
            title: 'Akses Dibatasi',
            text: 'Fitur Cetak & Unduh Resep hanya tersedia untuk pengguna yang sudah masuk!',
            icon: 'warning',
            iconColor: 'var(--danger-color)',
            showCancelButton: true,
            confirmButtonText: 'Masuk Sekarang',
            cancelButtonText: 'Nanti saja',
            confirmButtonColor: '#2ecc71',
            cancelButtonColor: '#95a5a6',
            background: document.body.dataset.theme === 'dark' ? '#2c3e50' : '#fff',
            color: document.body.dataset.theme === 'dark' ? '#fff' : '#000'    
        }).then((result) => {
            if (result.isConfirmed) window.location.href = 'daftar_atau_login.html';
        });
        return;
    }

    // 2. Deteksi Paket Aktif (Starter, Premium, Legend)
    // Berdasarkan paket_langganan.html, semua paket ini memiliki akses cetak.
    const activeMembership = user.membership || 'free';
    const hasActivePlan = activeMembership !== 'free';

    // Jika user punya paket aktif, langsung cetak tanpa iklan
    if (hasActivePlan) {
        // Tampilkan feedback singkat agar user tahu mereka menggunakan benefit paketnya
        const packageName = activeMembership.replace('_', ' ').toUpperCase();
        
        Swal.fire({
            icon: 'success',
            title: 'Akses Premium Aktif',
            text: `Menyiapkan dokumen untuk paket ${packageName}...`,
            timer: 1500,
            showConfirmButton: false,
            willClose: () => {
                window.print();
            }
        });
        return;
    }

    // 3. Logika untuk Pengguna GRATIS (Free User)
    // Mereka harus menonton iklan untuk mendapatkan "Kredit Cetak"
    const adLimit = 3; // Standar gratis: 3 kredit per hari sesuai html
    const today = new Date().toDateString();
    
    // Ambil data limit harian dari localStorage
    let adData = JSON.parse(localStorage.getItem('sajile_ad_limit')) || { date: today, count: 0 };
    
    // Reset limit jika hari sudah berganti
    if (adData.date !== today) {
        adData = { date: today, count: 0 };
    }

    const remainingAds = adLimit - adData.count;

    Swal.fire({
        title: 'Fitur Terbatas',
        html: `
            <p>Mencetak resep adalah fitur untuk member SajiLe.</p>
            <div style="margin: 15px 0; padding: 15px; background: rgba(46, 204, 113, 0.1); border-radius: 8px; border: 1px solid #2ecc71;">
                <small style="color: var(--text-color);">Sisa jatah cetak gratis (via iklan) hari ini:</small><br>
                <strong style="font-size: 1.2em; color: #27ae60;">${remainingAds} / ${adLimit}</strong>
            </div>
        `,
        icon: 'info',
        iconHtml: '<i class="fas fa-print"></i>',
        iconColor: '#2ecc71',
        showCancelButton: true,
        showDenyButton: remainingAds > 0,
        confirmButtonColor: '#f1c40f', // Warna Emas untuk Upgrade
        denyButtonColor: '#3498db',    // Warna Biru untuk Iklan
        cancelButtonColor: '#95a5a6',
        confirmButtonText: '<i class="fas fa-gem"></i> Berlangganan Sekarang',
        denyButtonText: '<i class="fas fa-ad"></i> Tonton Iklan Sekarang',
        cancelButtonText: 'Batal',
        background: document.body.dataset.theme === 'dark' ? '#2c3e50' : '#fff',
        color: document.body.dataset.theme === 'dark' ? '#fff' : '#000',
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'paket_langganan.html';
        } 
        else if (result.isDenied) {
            if (remainingAds > 0) {
                simulateAdSense(adData);
            } else {
                Swal.fire({
                    title: 'Limit Tercapai',
                    text: 'Jatah cetak gratis Anda hari ini sudah habis. Langganan sekarang untuk cetak dan unduh lebih banyak!',
                    icon: 'warning',
                    confirmButtonText: 'Lihat Paket',
                    showCancelButton: true
                }).then((res) => {
                    if(res.isConfirmed) window.location.href = 'paket_langganan.html';
                });
            }
        }
    });
}

/**
 * Simulasi Integrasi Iklan (Rewarding Ads)
 */
function simulateAdSense(adData) {
    Swal.fire({
        title: 'Memutar Iklan...',
        html: '<div style="margin-bottom:10px;">Iklan selesai dalam <b></b> detik.</div><small>Dukung SajiLe dengan tetap melihat iklan ini.</small>',
        timer: 5000, 
        timerProgressBar: true,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
            const b = Swal.getHtmlContainer().querySelector('b');
            let timerInterval = setInterval(() => {
                const timeLeft = Swal.getTimerLeft();
                if (timeLeft) b.textContent = Math.ceil(timeLeft / 1000);
            }, 100);
        },
        willClose: () => {
            // Update jatah iklan
            adData.count += 1;
            localStorage.setItem('sajile_ad_limit', JSON.stringify(adData));
            
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Kredit cetak diberikan. Menyiapkan dokumen...',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                // Timeout agar UI bersih sebelum dialog print browser muncul
                setTimeout(() => {
                    window.print();
                }, 600);
            });
        }
    });
}

// --- STATE GLOBAL TAMBAHAN ---
let wakeLock = null; // Untuk Mode Memasak (Screen Stay Awake)
let isPremiumUser = false; // Akan diupdate di fetchRecipeDetails

// =======================================================
// 7. PROTEKSI ANTI-CURANG (Screenshot & DevTools)
// =======================================================

function initAntiCheat() {
    // A. Blokir Klik Kanan (Mencegah Inspect Element dasar)
    document.addEventListener('contextmenu', (e) => {
        if (!isPremiumUser) {
            e.preventDefault();
            Swal.fire({
                title: 'Proteksi Konten',
                text: 'Klik kanan dinonaktifkan untuk melindungi resep eksklusif kami.',
                icon: 'warning',
                timer: 2000,
                showConfirmButton: false
            });
        }
    });

    // B. Blokir Shortcut Keyboard (F12, Ctrl+Shift+I, Ctrl+U, PrintScreen)
    document.addEventListener('keydown', (e) => {
        if (isPremiumUser) return;

        // Blokir F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (e.key === "F12" || 
            (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) || 
            (e.ctrlKey && e.key === "U")) {
            e.preventDefault();
            return false;
        }

        // C. Mencegah PrintScreen/Screenshot (Hanya bisa memicu alert setelah kejadian di beberapa browser)
        if (e.key === "PrintScreen") {
            navigator.clipboard.writeText(""); // Kosongkan clipboard
            alert("Screenshot tidak diizinkan untuk menjaga privasi resep!");
        }
    });

    // D. Deteksi Perubahan Ukuran Layar (Indikasi DevTools Terbuka)
    let devtoolsOpen = false;
    const threshold = 160;
    setInterval(() => {
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;
        if (widthDiff || heightDiff) {
            if (!devtoolsOpen && !isPremiumUser) {
                // Beri efek blur parah jika devtools terdeteksi
                document.body.style.filter = "blur(20px)";
                document.body.style.pointerEvents = "none";
                devtoolsOpen = true;
                console.clear();
                console.log("%cSTOP!", "color:red; font-size:40px; font-weight:bold;");
            }
        } else {
            if (devtoolsOpen) {
                document.body.style.filter = "none";
                document.body.style.pointerEvents = "auto";
                devtoolsOpen = false;
            }
        }
    }, 1000);
}

// =======================================================
// 8. MODE MEMASAK (DYNAMIC INTERACTIVE EXPERIENCE) 🍳
// =======================================================

/**
 * STATE MANAGEMENT MODE MEMASAK
 * Menyimpan konfigurasi aktif dan referensi objek API
 */
let cookingState = {
    currentSlide: 0,
    slides: [],
    wakeLock: null,
    autoSlideInterval: null,
    recognition: null,
    isRobotSpeaking: false,
    settings: {
        autoSlide: false,
        timerSeconds: 15,
        voiceEnabled: false,
        readAloud: false,
        orientation: 'landscape' // 'landscape' atau 'portrait'
    }
};

/**
 * FUNGSI UTAMA: Toggle Mode Memasak
 */
async function toggleCookingMode(active) {
    // 1. Proteksi Premium
    // Cek apakah user sudah login
    if (!recipeBaseData.isLoggedIn) {
        return Swal.fire({
            title: 'Akses Dibatasi',
            text: "Fitur Mode Memasak Interaktif hanya tersedia untuk pengguna yang sudah masuk dan berlangganan paket!",
            icon: 'warning',
            iconColor: 'var(--danger-color)',
            showCancelButton: true,
            confirmButtonText: 'Masuk Sekarang',
            cancelButtonText: 'Nanti Saja',
            confirmButtonColor: 'var(--primary-color)',
            cancelButtonColor: '#95a5a6',
            background: document.body.dataset.theme === 'dark' ? '#2c3e50' : '#fff',
            color: document.body.dataset.theme === 'dark' ? '#fff' : '#000',
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = 'daftar_atau_login.html'; // Sesuaikan route login Anda
            }
        });
    }
    if (recipeBaseData.activeMembership === 'free') {
        return Swal.fire({
            title: 'Akses Dibatasi',
            text: "Fitur Mode Memasak Interaktif hanya tersedia untuk pengguna yang sudah berlangganan paket!",
            icon: 'warning',
            iconColor: 'var(--danger-color)',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-gem"></i> Berlangganan Sekarang',
            cancelButtonText: 'Nanti Saja',
            confirmButtonColor: '#f1c40f', // Warna Emas untuk Upgrade
            cancelButtonColor: '#95a5a6',
            background: document.body.dataset.theme === 'dark' ? '#2c3e50' : '#fff',
            color: document.body.dataset.theme === 'dark' ? '#fff' : '#000',
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = 'paket_langganan.html'; // Sesuaikan route login Anda
            }
        });
    }

    const overlay = document.getElementById('cooking-mode-overlay');
    const cookingModeBtn = document.getElementById('btn-cooking-mode'); // Referensi tombol luar
    
    if (active) {
        console.log("SajiLe: Mengaktifkan Mode Memasak...");
        // SINKRONISASI TOMBOL: Pastikan tombol luar menyala
        if(cookingModeBtn) cookingModeBtn.classList.add('active');
        prepareMassiveSlides();
        
        // Inisialisasi Voice Recognition jika didukung browser
        if ('webkitSpeechRecognition' in window && !cookingState.recognition) {
            initVoiceControl();
        }

        renderCookingSlide(0);
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        syncCookingAssistant();

        // Screen Wake Lock API
        if ('wakeLock' in navigator) {
            try {
                cookingState.wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) {
                console.error("Gagal mengaktifkan Wake Lock:", err);
            }
        }
    } else {
        // --- CLEANUP TOTAL (MENCEGAH BUG SPAM) ---
        console.log("SajiLe: Menutup Mode Memasak & Membersihkan Proses...");
        if(cookingModeBtn) cookingModeBtn.classList.remove('active');
        
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // 1. Matikan Timer secara paksa
        if (cookingState.autoSlideInterval) {
            clearInterval(cookingState.autoSlideInterval);
            cookingState.autoSlideInterval = null;
        }
        
        // 2. Matikan Narasi Suara (TTS) secara instan
        window.speechSynthesis.cancel();
        
        // 3. Matikan Mikrofon
        if (cookingState.recognition) {
            cookingState.settings.voiceEnabled = false; 
            try {
                cookingState.recognition.abort(); // Gunakan abort untuk stop instan
            } catch(e) {}
        }

        // 4. Reset UI Status
        const vStatus = document.getElementById('status-voice');
        if (vStatus) {
            vStatus.classList.remove('listening', 'active');
            vStatus.classList.add('muted');
            vStatus.querySelector('span').textContent = "Mikrofon Nonaktif";
        }
        
        // 5. Lepaskan Wake Lock
        if (cookingState.wakeLock) {
            await cookingState.wakeLock.release();
            cookingState.wakeLock = null;
        }

        // 4. Reset UI Status ke Default
        resetStatusBars();
    }
}

/**
 * RESET STATUS BARS: Mengembalikan tampilan ke posisi nonaktif
 */
function resetStatusBars() {
    const vStatus = document.getElementById('status-voice');
    const aStatus = document.getElementById('status-auto');
    
    if (vStatus) {
        vStatus.className = 'status-item muted';
        vStatus.querySelector('span').textContent = "Mikrofon Nonaktif";
    }
    if (aStatus) {
        aStatus.classList.remove('active');
        // Tetap tampilkan teks default di HTML
    }
}

/**
 * PREPARASI SLIDE: Mengubah data resep menjadi struktur HTML visual
 * Terintegrasi dengan sistem proteksi toggle saat asisten berbicara.
 */
function prepareMassiveSlides() {
    const recipe = recipeBaseData.currentRecipe;
    if (!recipe) return;

    const slides = [];

    // Helper untuk proteksi visual toggle
    const isLocked = cookingState.isRobotSpeaking ? 'disabled' : '';
    const lockClass = cookingState.isRobotSpeaking ? 'toggle-locked' : '';

    // Slide 1: Pengenalan (Intro Visual)
    slides.push({
        type: 'intro',
        title: recipe.title,
        text: `Selamat datang di mode memasak terpandu untuk resep ${recipe.title}.`,
        html: `
            <div class="cooking-slide-wrapper">
                <div class="slide-visual">
                    <img src="${PUBLIC_BACKEND_URL}${recipe.imageUrl}" alt="${recipe.title}">
                </div>
                <div class="slide-text">
                    <span class="badge-premium">MODE TERPANDU</span>
                    <h2>${recipe.title}</h2>
                    <p>${recipe.description || 'Mari mulai petualangan memasakmu hari ini!'}</p>
                    <button class="btn-primary" onclick="changeSlide(1)">Mulai Memasak <i class="fas fa-play"></i></button>
                </div>
            </div>`
    });

    // Slide 2: Konfigurasi Asisten (Dengan Proteksi Toggle)
    slides.push({
        type: 'settings',
        title: "Konfigurasi Asisten",
        text: "Pilih konfigurasi asisten memasak Anda.",
        html: `
            <div class="cooking-slide-wrapper full-width">
                <div class="slide-text">
                    <h2>Konfigurasi Asisten</h2>
                    <div class="settings-grid">
                        
                        <div class="toggle-container ${lockClass}">
                            <div class="toggle-info">
                                <i class="fas fa-clock"></i>
                                <div class="toggle-label">
                                    <h3>Slide Otomatis</h3>
                                    <p>${cookingState.settings.timerSeconds} Detik/Langkah</p>
                                </div>
                            </div>
                            <label class="switch">
                                <input type="checkbox" ${cookingState.settings.autoSlide ? 'checked' : ''} 
                                       ${isLocked}
                                       onchange="updateCookingSetting('autoSlide')">
                                <span class="slider-round"></span>
                            </label>
                        </div>

                        <div class="toggle-container ${lockClass}">
                            <div class="toggle-info">
                                <i class="fas fa-volume-up"></i>
                                <div class="toggle-label">
                                    <h3>Bacakan Teks</h3>
                                    <p>Suara narasi otomatis</p>
                                </div>
                            </div>
                            <label class="switch">
                                <input type="checkbox" ${cookingState.settings.readAloud ? 'checked' : ''} 
                                       ${isLocked}
                                       onchange="updateCookingSetting('readAloud')">
                                <span class="slider-round"></span>
                            </label>
                        </div>

                        <div class="toggle-container ${lockClass}">
                            <div class="toggle-info">
                                <i class="fas fa-microphone"></i>
                                <div class="toggle-label">
                                    <h3>Kontrol Suara</h3>
                                    <p>Gunakan perintah suara</p>
                                </div>
                            </div>
                            <label class="switch">
                                <input type="checkbox" ${cookingState.settings.voiceEnabled ? 'checked' : ''} 
                                       ${isLocked}
                                       onchange="updateCookingSetting('voiceEnabled')">
                                <span class="slider-round"></span>
                            </label>
                        </div>

                        <div class="setting-card ${lockClass}" onclick="updateCookingSetting('orientation')" 
                             style="${cookingState.isRobotSpeaking ? 'pointer-events: none;' : ''}">
                            <i class="fas fa-sync-alt"></i>
                            <h3>Orientasi</h3>
                            <p>${cookingState.settings.orientation.toUpperCase()}</p>
                        </div>

                    </div>
                    <button class="btn-primary" onclick="changeSlide(1)" style="margin-top: 20px; width: 100%;">Mulai Masak</button>
                </div>
            </div>`
    });

    // Slide 3: Tabel Gizi
    slides.push({
        type: 'nutrition',
        title: "Nilai Gizi",
        text: "Perhatikan informasi nilai gizi berikut.",
        html: `
            <div class="cooking-slide-wrapper">
                <div class="slide-visual">
                    <div class="nutrition-chart-placeholder">
                        <i class="fas fa-chart-pie"></i>
                    </div>
                </div>
                <div class="slide-text">
                    <h2>Nilai Gizi</h2>
                    <table class="nutrition-table-cooking">
                        <tr><td>Kalori</td><td>${recipe.calories || '450'} kcal</td></tr>
                        <tr><td>Protein</td><td>${recipe.protein || '20'} g</td></tr>
                        <tr><td>Karbohidrat</td><td>${recipe.carbs || '55'} g</td></tr>
                    </table>
                </div>
            </div>`
    });

    // Slide 4: Bahan-Bahan
    slides.push({
        type: 'ingredients',
        title: "Daftar Bahan",
        text: "Siapkan semua bahan yang tertulis di layar.",
        html: `
            <div class="cooking-slide-wrapper">
                <div class="slide-text full-width">
                    <h2>Bahan-Bahan</h2>
                    <ul class="ingredients-grid-cooking">
                        ${recipe.ingredients.map(i => `<li><i class="fas fa-check-circle"></i> ${i.quantity} ${i.unit} ${i.name}</li>`).join('')}
                    </ul>
                </div>
            </div>`
    });

    // Slide 5: Checklist Alat
    if (recipe.tools && recipe.tools.length > 0) {
        slides.push({
            type: 'tools',
            title: "Persiapan Alat",
            text: "Pastikan semua peralatan ini sudah tersedia di meja masak Anda.",
            html: `
                <div class="cooking-slide-wrapper">
                    <div class="slide-text full-width">
                        <span class="badge-premium">CHECKLIST PERSIAPAN</span>
                        <h2>Peralatan Masak</h2>
                        <p>Pastikan alat-alat berikut sudah siap digunakan:</p>
                        <ul class="ingredients-grid-cooking">
                            ${recipe.tools.map(tool => {
                                const toolName = typeof tool === 'object' ? tool.name : tool;
                                return `<li><i class="fas fa-screwdriver-wrench"></i> ${toolName}</li>`;
                            }).join('')}
                        </ul>
                    </div>
                </div>`
        });
    }

    // Slide Langkah-Langkah (Massive Individual Slides dengan Smart Timer)
    recipe.steps.forEach((step, index) => {
        const minuteMatch = step.match(/(\d+)\s*menit/i);
        let timerHtml = '';
        
        if (minuteMatch) {
            const seconds = parseInt(minuteMatch[1]) * 60;
            timerHtml = `
                <div class="step-timer-wrapper">
                    <button class="btn-timer-start" onclick="startStepTimer(${seconds}, 'timer-${index}')">
                        <i class="fas fa-stopwatch"></i> Mulai Timer (<span id="timer-${index}">${minuteMatch[1]}:00</span>)
                    </button>
                </div>`;
        }

        slides.push({
            type: 'step',
            title: `Langkah ${index + 1}`,
            text: `Langkah ${index + 1}. ${step}`,
            html: `
                <div class="cooking-slide-wrapper">
                    <div class="slide-visual">
                        <div class="step-badge-huge">${index + 1}</div>
                    </div>
                    <div class="slide-text">
                        <span class="badge-step">LANGKAH ${index + 1}</span>
                        <h2 style="margin-bottom: 10px;">Instruksi Memasak</h2>
                        <p class="step-description">${step}</p>
                        ${timerHtml}
                    </div>
                </div>`
        });
    });

    cookingState.slides = slides;
}

/**
 * SINKRONISASI ASISTEN: Memastikan suara/timer aktif jika setting bernilai true
 * Dipanggil saat mode memasak pertama kali dibuka atau saat setting berubah.
 */
function syncCookingAssistant() {
    const s = cookingState.settings;

    // 1. Update Visual Status Bar
    const vStatus = document.getElementById('status-voice');
    const aStatus = document.getElementById('status-auto');
    if (vStatus) {
        // HANYA update jika sedang TIDAK dalam mode processing
        if (!vStatus.classList.contains('processing')) {
            vStatus.classList.toggle('active', s.voiceEnabled);
            if (!s.voiceEnabled) {
                vStatus.classList.add('muted');
                vStatus.classList.remove('listening');
                vStatus.querySelector('span').textContent = "Mikrofon Nonaktif";
            } else {
                vStatus.classList.remove('muted');
                vStatus.classList.add('listening');
                vStatus.querySelector('span').textContent = "Mendengarkan...";
            }
        }
    }
    // Sinkronisasi Visual Auto-Slide
    if (aStatus) {
        if (s.autoSlide) {
            aStatus.classList.add('active');
            aStatus.querySelector('span').textContent = "Auto-Slide Aktif";
        } else {
            aStatus.classList.remove('active');
            aStatus.querySelector('span').textContent = "Auto-Slide Mati";
        }
    }

    // 2. Kontrol Suara (Mikrofon)
    if (s.voiceEnabled && cookingState.recognition) {
        try { 
            cookingState.recognition.start(); 
            console.log("SajiLe: Mikrofon otomatis aktif (Proaktif).");
        } catch(e) {
            // Abaikan jika sudah berjalan
        }
    } else {
        if (cookingState.recognition) {
            try { cookingState.recognition.stop(); } catch(e) {}
        }
    }

    // 3. Auto-Slide Timer
    if (s.autoSlide) {
        startAutoSlideTimer();
    }

    // 4. Read Aloud (Hanya untuk slide awal jika aktif)
    if (s.readAloud && !s.autoSlide) {
        const currentSlide = cookingState.slides[cookingState.currentSlide];
        if (currentSlide) speakText(currentSlide.text);
    }
}

/**
 * RENDER ENGINE
 */
function renderCookingSlide(index) {
    const container = document.getElementById('cooking-slider');
    const overlay = document.getElementById('cooking-mode-overlay');

    // STOP SEMUA PROSES SEBELUMNYA (Penting!)
    clearInterval(cookingState.autoSlideInterval);
    cookingState.autoSlideInterval = null; // Pastikan null
    window.speechSynthesis.cancel();

    cookingState.currentSlide = index;
    const slide = cookingState.slides[index];

    // 1. Reset State Per-Slide
    clearInterval(cookingState.autoSlideInterval);
    window.speechSynthesis.cancel();

    // 2. Terapkan Layout Orientasi
    overlay.setAttribute('data-orientation', cookingState.settings.orientation);

    // 3. Injeksi Konten
    container.innerHTML = slide.html;

    // 4. Update UI Navigasi
    document.getElementById('current-slide-num').textContent = (index + 1).toString().padStart(2, '0');
    document.getElementById('total-slide-num').textContent = cookingState.slides.length.toString().padStart(2, '0');
    
    const progressPerc = ((index + 1) / cookingState.slides.length) * 100;
    document.getElementById('cooking-progress-bar').style.width = `${progressPerc}%`;

    document.getElementById('prev-slide').style.visibility = index === 0 ? 'hidden' : 'visible';

    // LOGIKA EKSEKUSI: Pilih salah satu asisten saja
    if (cookingState.settings.autoSlide) {
        console.log("SajiLe: Auto-Slide aktif, menjalankan timer.");
        startAutoSlideTimer();
    } else if (cookingState.settings.readAloud) {
        console.log("SajiLe: Read Aloud aktif, membacakan teks.");
        speakText(slide.text);
    }
}

/**
 * UPDATE SETTINGS (Logic Eksklusivitas & Toggle)
 */
function updateCookingSetting(key) {
    const s = cookingState.settings;

    if (key === 'autoSlide') {
        // PROTEKSI TOTAL: Jika robot sedang bicara, kunci fitur ini (tidak bisa ON maupun OFF)
        if (cookingState.isRobotSpeaking) {
            console.warn("SajiLe: Pengaturan Kontrol Suara dikunci saat asisten berbicara.");
            
            // Opsional: Berikan feedback visual agar user tahu kenapa tidak bisa diklik
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                target: document.getElementById('cooking-mode-overlay'),
                title: 'Tunggu asisten selesai bicara...',
                showConfirmButton: false,
                timer: 2000
            });
            return; 
        }

        // Jika tidak sedang bicara, lanjutkan toggle seperti biasa
        s.autoSlide = !s.autoSlide;

        if (s.autoSlide) {
            s.readAloud = false; // Matikan suara jika timer nyala
            s.voiceEnabled = false;
            if (cookingState.recognition) cookingState.recognition.stop();
            window.speechSynthesis.cancel();
        }
    }
    else if (key === 'readAloud') {
        // PROTEKSI TOTAL: Jika robot sedang bicara, kunci fitur ini (tidak bisa ON maupun OFF)
        if (cookingState.isRobotSpeaking) {
            console.warn("SajiLe: Pengaturan Kontrol Suara dikunci saat asisten berbicara.");
            
            // Opsional: Berikan feedback visual agar user tahu kenapa tidak bisa diklik
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                target: document.getElementById('cooking-mode-overlay'),
                title: 'Tunggu asisten selesai bicara...',
                showConfirmButton: false,
                timer: 2000
            });
            return; 
        }

        // Jika tidak sedang bicara, lanjutkan toggle seperti biasa
        s.readAloud = !s.readAloud;
        if (s.readAloud) {
            s.autoSlide = false; // Matikan timer jika suara nyala
            clearInterval(cookingState.autoSlideInterval);
        }
    }
    else if (key === 'voiceEnabled') {
        // PROTEKSI TOTAL: Jika robot sedang bicara, kunci fitur ini (tidak bisa ON maupun OFF)
        if (cookingState.isRobotSpeaking) {
            console.warn("SajiLe: Pengaturan Kontrol Suara dikunci saat asisten berbicara.");
            
            // Opsional: Berikan feedback visual agar user tahu kenapa tidak bisa diklik
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                target: document.getElementById('cooking-mode-overlay'),
                title: 'Tunggu asisten selesai bicara...',
                showConfirmButton: false,
                timer: 2000
            });
            return; 
        }

        // Jika tidak sedang bicara, lanjutkan toggle seperti biasa
        s.voiceEnabled = !s.voiceEnabled;
        
        if (s.voiceEnabled) {
            s.autoSlide = false;
            s.readAloud = false; // Tambahan: Matikan readAloud agar tidak bentrok
            clearInterval(cookingState.autoSlideInterval);
            initVoiceControl();
        } else {
            if (cookingState.recognition) {
                try { cookingState.recognition.abort(); } catch(e) {}
            }
        }
    }
    else if (key === 'orientation') {
        // PROTEKSI TOTAL: Jika robot sedang bicara, kunci fitur ini (tidak bisa ON maupun OFF)
        if (cookingState.isRobotSpeaking) {
            console.warn("SajiLe: Pengaturan Kontrol Suara dikunci saat asisten berbicara.");
            
            // Opsional: Berikan feedback visual agar user tahu kenapa tidak bisa diklik
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                target: document.getElementById('cooking-mode-overlay'),
                title: 'Tunggu asisten selesai bicara...',
                showConfirmButton: false,
                timer: 2000
            });
            return; 
        }
        // Jika tidak sedang bicara, lanjutkan toggle seperti biasa
        s.orientation = s.orientation === 'landscape' ? 'portrait' : 'landscape';
    }

    // Re-render slide untuk memperbarui visual toggle
    prepareMassiveSlides();
    renderCookingSlide(cookingState.currentSlide);
    // Sinkronkan fungsi asisten
    syncCookingAssistant();
}

/**
 * VOICE ENGINE: Teroptimasi untuk kecepatan deteksi dan akurasi perintah
 * Menggunakan interimResults untuk respon instan tanpa menunggu jeda bicara.
 */
function initVoiceControl() {
    if (!('webkitSpeechRecognition' in window)) return;
    
    if (!cookingState.recognition) {
        cookingState.recognition = new webkitSpeechRecognition();
        cookingState.recognition.continuous = true;
        // INTERIM TRUE: Mendeteksi kata saat Anda masih berbicara (sangat responsif)
        cookingState.recognition.interimResults = true; 
        cookingState.recognition.lang = 'id-ID';
    }

    // Helper untuk memperbarui tampilan status mikrofon di UI
    const updateVoiceUI = (status, message) => {
        const vStatus = document.getElementById('status-voice');
        if (!vStatus) return;
        const text = vStatus.querySelector('span');

        vStatus.classList.remove('listening', 'muted', 'processing');
        
        if (status === 'listening') {
            vStatus.classList.add('listening');
            text.textContent = message || "Mendengarkan...";
        } else if (status === 'processing') {
            vStatus.classList.add('processing'); 
            text.textContent = message || "Memproses...";
        } else {
            vStatus.classList.add('muted');
            text.textContent = message || "Mikrofon Mati";
        }
    };

    cookingState.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        // Mengambil data transkrip secara real-time
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        // Gabungkan transkrip dan bersihkan karakter khusus
        const rawCommand = (finalTranscript || interimTranscript).toLowerCase().trim();
        const cleanCommand = rawCommand.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        
        console.log("SajiLe Live Detection:", cleanCommand);

        // DAFTAR KEYWORD CERDAS & LUAS
        const nextKeywords = ['lanjut', 'berikutnya', 'selanjutnya', 'terus', 'next', 'ok', 'oke', 'siap'];
        const prevKeywords = ['kembali', 'sebelumnya', 'back', 'mundur', 'sebelum'];
        const repeatKeywords = ['ulangi', 'baca lagi', 'ulangi langkah', 'apa tadi', 'tadi apa'];
        const exitKeywords = ['keluar', 'berhenti', 'stop', 'selesai', 'tutup'];

        // LOGIKA EKSEKUSI INSTAN
        if (nextKeywords.some(key => cleanCommand.includes(key))) {
            updateVoiceUI('processing', 'Lanjut...');
            cookingState.recognition.abort(); // Hentikan agar tidak trigger berkali-kali
            window.changeSlide(1);
        } 
        else if (prevKeywords.some(key => cleanCommand.includes(key))) {
            updateVoiceUI('processing', 'Kembali...');
            cookingState.recognition.abort();
            window.changeSlide(-1);
        } 
        else if (repeatKeywords.some(key => cleanCommand.includes(key))) {
            updateVoiceUI('processing', 'Membacakan ulang...');
            const currentText = cookingState.slides[cookingState.currentSlide].text;
            speakText(currentText);
        } 
        else if (exitKeywords.some(key => cleanCommand.includes(key))) {
            toggleCookingMode(false);
        }
    };

    cookingState.recognition.onstart = () => {
        updateVoiceUI('listening');
    };

    cookingState.recognition.onend = () => {
        const overlay = document.getElementById('cooking-mode-overlay');
        const isVisible = overlay && overlay.classList.contains('active');

        // SYARAT MUTLAK RESTART
        if (cookingState.settings.voiceEnabled && isVisible && !cookingState.isRobotSpeaking) {
            console.log("SajiLe: Mic restart aman.");
            try { cookingState.recognition.start(); } catch(e) {}
        } else {
            console.log("SajiLe: Mic tetap mati (Gembok aktif atau Setting mati).");
        }
    };

    cookingState.recognition.onerror = (e) => {
        console.warn("Voice Error:", e.error);
        if (e.error === 'network') {
            updateVoiceUI('muted', "Koneksi Bermasalah");
        } else if (e.error === 'not-allowed') {
            updateVoiceUI('muted', "Akses Mic Ditolak");
            cookingState.settings.voiceEnabled = false;
        }
    };
}

/**
 * SPEECH SYNTHESIS: Mengubah teks menjadi suara
 * Terintegrasi dengan Voice Control untuk mencegah echo feedback.
 */
function speakText(text) {
    if (!text || !('speechSynthesis' in window)) return;
    
    // 1. PASANG GEMBOK SEGERA
    cookingState.isRobotSpeaking = true;

    // --- TAMBAHAN: Blokir semua toggle di UI saat ini secara instan ---
    const allToggles = document.querySelectorAll('.toggle-container');
    const allInputs = document.querySelectorAll('.toggle-container input');
    
    allToggles.forEach(t => t.classList.add('toggle-locked'));
    allInputs.forEach(i => i.disabled = true);
    // -----------------------------------------------------------------

    // 2. Update UI secara eksplisit ke mode bicara
    //updateVoiceUI('muted', "Asisten sedang bicara...");

    // 2. Matikan Mic segera
    if (cookingState.recognition) {
        try { 
            cookingState.recognition.abort(); // Gunakan abort agar lebih paksa dibanding stop()
        } catch(e) {}
    }

    // Batalkan narasi sebelumnya agar tidak tumpang tindih
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.1; // Kecepatan ideal untuk instruksi masak
    utterance.pitch = 1.0;

    utterance.onstart = () => {
        // LOCK: Tandai bahwa robot sedang bicara
        cookingState.isRobotSpeaking = true; 
        
        if (cookingState.recognition) {
            try { 
                // Gunakan stop() agar event onend dipicu secara normal namun tertahan lock
                cookingState.recognition.stop(); 
            } catch(e) {}
        }
        
        // Update UI Visual
        const vStatus = document.getElementById('status-voice');
        if (vStatus) {
            vStatus.classList.remove('listening', 'processing');
            vStatus.classList.add('muted');
            vStatus.querySelector('span').textContent = "Asisten sedang bicara...";
        }
    };

    utterance.onend = () => {
        // 3. BUKA GEMBOK
        cookingState.isRobotSpeaking = false;

        if (cookingState.settings.voiceEnabled) {
            // Beri jeda sedikit lebih lama agar suara robot benar-benar hilang dari udara
            setTimeout(() => {
                // Pastikan gembok masih terbuka (tidak ada interupsi suara baru)
                if (!cookingState.isRobotSpeaking) {
                    try { cookingState.recognition.start(); } catch(e) {}
                }
            }, 0); // Jeda sedikit lebih lama agar echo benar-benar hilang
        }

        // --- TAMBAHAN: Buka kembali semua toggle setelah bicara selesai ---
        allToggles.forEach(t => t.classList.remove('toggle-locked'));
        allInputs.forEach(i => i.disabled = false);
        // ------------------------------------------------------------------
    };

    window.speechSynthesis.speak(utterance);
}

/**
 * TIMER ENGINE: Dilengkapi proteksi pengecekan overlay aktif
 */
function startAutoSlideTimer() {
    // Bersihkan interval lama jika ada
    if (cookingState.autoSlideInterval) clearInterval(cookingState.autoSlideInterval);

    let timeLeft = cookingState.settings.timerSeconds;
    console.log(`SajiLe: Auto-slide dimulai (${timeLeft} detik)`);

    cookingState.autoSlideInterval = setInterval(() => {
        const overlay = document.getElementById('cooking-mode-overlay');
        
        // PROTEKSI: Jika overlay sudah ditutup, matikan interval ini selamanya
        if (!overlay || !overlay.classList.contains('active')) {
            clearInterval(cookingState.autoSlideInterval);
            cookingState.autoSlideInterval = null;
            return;
        }

        timeLeft--;
        
        if (timeLeft <= 0) {
            clearInterval(cookingState.autoSlideInterval);
            cookingState.autoSlideInterval = null;
            
            // Pindah slide hanya jika bukan slide terakhir
            if (cookingState.currentSlide < cookingState.slides.length - 1) {
                changeSlide(1);
            } else {
                // Jika sudah slide terakhir, jangan spam, cukup tutup mode
                handleCookingFinished();
            }
        }
    }, 1000);
}

/**
 * LOGIKA: SMART KITCHEN TIMER (Spesifik per langkah)
 */
function startStepTimer(seconds, elementId) {
    if (cookingState.activeTimer) clearInterval(cookingState.activeTimer);
    
    let timeRemaining = seconds;
    const timerDisplay = document.getElementById(elementId);
    const btn = timerDisplay.parentElement;

    btn.disabled = true; // Kunci tombol saat berjalan
    
    cookingState.activeTimer = setInterval(() => {
        timeRemaining--;
        
        // Format mm:ss
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        if (timeRemaining <= 0) {
            clearInterval(cookingState.activeTimer);
            cookingState.activeTimer = null;
            timerDisplay.textContent = "Selesai!";
            btn.classList.add('timer-finished');
            
            // Efek suara notifikasi pendek jika tersedia
            const beep = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            beep.play().catch(() => {}); 
            
            // Opsional: Beritahu pengguna lewat suara
            if (cookingState.settings.readAloud) {
                speakText("Waktu memasak untuk langkah ini sudah selesai.");
            }
        }
    }, 1000);
}

/**
 * HELPER: Navigasi Slide
 */
function changeSlide(direction) {
    const pilihanJudulSelesai = [
    'Selamat!',
    'Luar Biasa!',
    'Kerja Bagus!',
    'Mantap!',
    'Resep Selesai!'
    ];
    const judulSelesaiAcak = pilihanJudulSelesai[Math.floor(Math.random() * pilihanJudulSelesai.length)];
    const nextIdx = cookingState.currentSlide + direction;
    if (nextIdx >= 0 && nextIdx < cookingState.slides.length) {
        renderCookingSlide(nextIdx);
    } else if (nextIdx >= cookingState.slides.length) {
        toggleCookingMode(false);
        Swal.fire({
            title: judulSelesaiAcak,
            text: 'Anda telah menyelesaikan resep ini.',
            icon: 'success',
            confirmButtonColor: 'var(--primary-color)'
        });
    }
}

/**
 * FINISH HANDLER: Menangani akhir resep tanpa spam
 */
function handleCookingFinished() {
    const pilihanJudulSelesai = [
    'Selamat!',
    'Luar Biasa!',
    'Kerja Bagus!',
    'Mantap!',
    'Resep Selesai!'
    ];
    const judulSelesaiAcak = pilihanJudulSelesai[Math.floor(Math.random() * pilihanJudulSelesai.length)];
    toggleCookingMode(false);
    Swal.fire({
        title: judulSelesaiAcak,
        text: 'Anda telah menyelesaikan resep ini.',
        icon: 'success',
        confirmButtonColor: 'var(--primary-color)'
    });
}

/**
 * LOGIKA: SMART EXIT (Proteksi Progres)
 */
function handleSmartExit() {
    const total = cookingState.slides.length;
    const current = cookingState.currentSlide;
    const progressPerc = (current / total) * 100;

    // Jika user sudah berjalan lebih dari 20% slide dan bukan di slide terakhir
    if (progressPerc > 20 && current < total - 1) {
        Swal.fire({
            title: 'Berhenti Memasak?',
            text: "Progres Anda sudah sampai Langkah " + (current - 3) + ". Keluar sekarang?",
            icon: 'warning',
            target: document.getElementById('cooking-mode-overlay'),
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#95a5a6',
            confirmButtonText: 'Ya, Berhenti',
            cancelButtonText: 'Lanjutkan Masak'
        }).then((result) => {
            if (result.isConfirmed) {
                toggleCookingMode(false);
            }
        });
    } else {
        // Jika masih di awal, langsung keluar saja
        toggleCookingMode(false);
    }
}

// Bind Global Navigation
document.getElementById('next-slide').onclick = () => changeSlide(1);
document.getElementById('prev-slide').onclick = () => changeSlide(-1);
// Update binding tombol close di bagian bawah file:
document.getElementById('close-cooking').onclick = (e) => {
    e.preventDefault();
    handleSmartExit();
};

// =======================================================
// 6. INITIALIZATION LOADER
// =======================================================

async function startApp() {
    const params = new URLSearchParams(window.location.search);
    currentRecipeId = params.get('id');

    if (!currentRecipeId) {
        window.location.href = 'daftar_makanan.html';
        return;
    }

    // Bagian dalam function startApp()
    const cookingModeBtn = document.getElementById('btn-cooking-mode');
    if (cookingModeBtn) {
        cookingModeBtn.onclick = (e) => {
            e.preventDefault();
            // Cek status berdasarkan kehadiran kelas 'active'
            const isCurrentlyActive = cookingModeBtn.classList.contains('active');
            
            // Panggil fungsi utama (toggleCookingMode akan menangani penambahan/penghapusan class .active)
            toggleCookingMode(!isCurrentlyActive);
        };
    }

    initStandardUI();
    await fetchRecipeDetails();
    await fetchComments();
    
    // Bind interaction logic
    initRatingSystem();
    initCommentActions();
    
    const submitBtn = document.getElementById('submit-comment');
    if(submitBtn) submitBtn.onclick = (e) => { e.preventDefault(); submitComment(); };

    // Dan pada input Enter:
    const commentInput = document.getElementById('comment-textarea');
    commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if(!submitBtn.disabled) submitComment(); // Gunakan handleSendMessage
        }
    });
    
    // Update Event Listener untuk tombol Print
    const printBtn = document.getElementById('btn-print');
    if (printBtn) {
        printBtn.onclick = (e) => {
            e.preventDefault();
            handlePrintFeature(); // Panggil logika proteksi baru
        };
    }

    // Animasi Fade In
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

// Jalankan saat config siap
if (API_BASE_URL) {
    startApp();
} else {
    window.addEventListener('backend-url-changed', startApp);
}

// Tambahkan ini di bagian paling bawah resep_detail.js
window.changeSlide = changeSlide;
window.updateCookingSetting = updateCookingSetting;
window.toggleCookingMode = toggleCookingMode;