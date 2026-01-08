document.addEventListener('selectstart', function(e) {
    e.preventDefault(); // Mencegah aksi default seleksi
});

document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

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

const courseData = [
    {
        id: "c1",
        title: "Teknik Pisau Dasar untuk Pemula",
        instructor: "Chef Juna",
        duration: "15:20",
        category: "dasar",
        thumbnail: "https://img.youtube.com/vi/G-Fg7l7G1zw/maxresdefault.jpg",
        videoId: "G-Fg7l7G1zw",
        source: "youtube",
        desc: "Pelajari cara memegang pisau yang benar dan berbagai jenis potongan sayuran standar profesional."
    },
    {
        id: "c2",
        title: "Rahasia Rendang Daging Empuk",
        instructor: "Ibu Fatmah",
        duration: "25:45",
        category: "nusantara",
        thumbnail: "https://img.youtube.com/vi/qP9_S7N5A0c/maxresdefault.jpg",
        videoId: "qP9_S7N5A0c",
        source: "youtube",
        desc: "Tips mengolah rempah dan teknik memasak lambat (slow cooking) untuk hasil rendang yang hitam dan gurih."
    }
];

function initCourseApp() {
    renderCourses('all');
    setupFilters();
    updateUserProfileUI(); // Standar SajiLe
}

function renderCourses(filter) {
    const container = document.getElementById('course-container');
    container.innerHTML = '';

    const filtered = filter === 'all' ? courseData : courseData.filter(c => c.category === filter);

    filtered.forEach(course => {
        const card = document.createElement('div');
        card.className = 'course-card';
        card.onclick = () => openVideoPlayer(course);

        card.innerHTML = `
            <div class="thumbnail-box">
                <img src="${course.thumbnail}" alt="${course.title}">
                <div class="play-btn-overlay"><i class="fas fa-play"></i></div>
                ${course.source === 'youtube' ? `
                    <a href="https://youtube.com/watch?v=${course.videoId}" 
                        target="_blank" class="yt-direct-link" 
                        onclick="event.stopPropagation()">
                        <i class="fab fa-youtube"></i>
                    </a>
                ` : ''}
            </div>
            <div class="course-info">
                <h3>${course.title}</h3>
                <div class="course-meta">
                    <span><i class="fas fa-user-tie"></i> ${course.instructor}</span>
                    <span><i class="fas fa-clock"></i> ${course.duration}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function openVideoPlayer(course) {
    const modal = document.getElementById('video-modal');
    const playerFrame = document.getElementById('player-frame');
    
    document.getElementById('modal-video-title').innerText = course.title;
    document.getElementById('modal-video-desc').innerText = course.desc;

    // Embed logic berdasarkan source
    if(course.source === 'youtube') {
        playerFrame.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${course.videoId}?autoplay=1" 
                    frameborder="0" allowfullscreen allow="autoplay"></iframe>`;
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Lock scroll
}

function closeVideoPlayer() {
    const modal = document.getElementById('video-modal');
    const playerFrame = document.getElementById('player-frame');
    
    modal.style.display = 'none';
    playerFrame.innerHTML = ''; // Stop video
    document.body.style.overflow = 'auto';
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderCourses(e.target.dataset.filter);
        });
    });
}

// Jalankan aplikasi
document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. DEKLARASI VARIABEL DOM UTAMA ---
    const body = document.body;
    const sajile_theme = localStorage.getItem('sajile_theme');
    const navAuthLinks = document.querySelector('.nav-auth-links'); // Container tombol Masuk
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper'); // Container Profil
    const logoutBtn = document.getElementById('logout-btn');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    // Navbar Elements
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = navMenu ? navMenu.querySelectorAll('.nav-links a') : []; 
    const themeToggle = document.getElementById('theme-toggle');

    initCourseApp();
    // --- 2. Cek Status Login Saat Halaman Dimuat ---
    checkLoginState(navAuthLinks, profileDropdownWrapper, body);

    // --- 3. Logika Logout ---
    // Logika Logout
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

    // =======================================================
    // 4. STANDAR WAJIB: LOGIKA NAVBAR & DARK MODE
    // =======================================================

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

    // B. Dark Mode Toggle
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        const savedTheme = localStorage.getItem('sajile_theme') || 'light'; 
        
        // Inisialisasi awal
        body.dataset.theme = savedTheme;
        //updateFeatureImage(); // Pastikan gambar sesuai saat pertama kali load

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
            
            // Sekarang ini akan bekerja karena mengambil data terbaru dari body.dataset
            //updateFeatureImage();
        });
    }

    // C. Hamburger Menu Logic (Vertikal Dropdown)
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
                
            const isExpanded = navMenu.classList.contains('active');
            hamburgerBtn.setAttribute('aria-expanded', isExpanded);
            
            // Kontrol overflow body
            if (isExpanded) {
                 if (window.innerWidth <= 768) { // Asumsi breakpoint mobile
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

    // =======================================================
    // 5. ANIMASI FADE IN (STANDAR WAJIB)
    // =======================================================
    const observerOptions = { threshold: 0.15 };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
});