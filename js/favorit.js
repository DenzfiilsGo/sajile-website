document.addEventListener('DOMContentLoaded', () => {
    
    // VARIABEL SIMULASI PENTING (Bisa diubah untuk testing UI)
    const isLoggedIn = true; // Ganti ke false untuk melihat pesan login/daftar
    const hasFavorites = true; // Ganti ke false untuk melihat empty state (jika isLoggedIn = true)

    // --- 1. Dark Mode Toggle (Copy dari resep.js) ---
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const icon = themeToggle.querySelector('i');

    if(localStorage.getItem('theme') === 'dark') {
        body.setAttribute('data-theme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }

    themeToggle.addEventListener('click', () => {
        if (body.getAttribute('data-theme') === 'dark') {
            body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    });

    // --- 2. Kontrol Tampilan Konten Berdasarkan Status ---
    const contentSection = document.getElementById('favorit-content');
    const emptyStateSection = document.getElementById('empty-state');

    // Default: Sembunyikan semua
    if (contentSection) contentSection.style.display = 'none';
    if (emptyStateSection) emptyStateSection.style.display = 'none';

    if (!isLoggedIn) {
        // Kasus 1: Belum Login
        if (emptyStateSection) {
            emptyStateSection.style.display = 'flex';
            emptyStateSection.innerHTML = `
                <div class="empty-message fade-in visible">
                    <i class="fas fa-lock icon-large"></i>
                    <h2>Akses Dibatasi</h2>
                    <p>Silakan masuk atau daftar untuk melihat daftar resep favoritmu.</p>
                    <a href="daftar_atau_login.html" class="btn-primary">Masuk / Daftar Sekarang</a>
                </div>
            `;
        }
    } else if (isLoggedIn && !hasFavorites) {
        // Kasus 2: Sudah Login, Tapi Belum Ada Favorit
        if (emptyStateSection) {
            emptyStateSection.style.display = 'flex';
            emptyStateSection.innerHTML = `
                <div class="empty-message fade-in visible">
                    <i class="far fa-heart icon-large"></i>
                    <h2>Favoritmu Masih Kosong</h2>
                    <p>Belum ada resep yang kamu simpan. Yuk, jelajahi ribuan resep lezat SajiLe!</p>
                    <a href="resep.html" class="btn-primary">Cari Resep</a>
                </div>
            `;
        }
    } else {
        // Kasus 3: Sudah Login dan Ada Favorit
        if (contentSection) {
            contentSection.style.display = 'block';

            // --- 3. Scroll Animation (Fade In) ---
            const observerOptions = {
                threshold: 0.15 
            };

            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                });
            }, observerOptions);

            const fadeElements = document.querySelectorAll('.fade-in');
            fadeElements.forEach(el => observer.observe(el));
            
            // Logika menghapus favorit
            const removeBtns = document.querySelectorAll('.btn-remove-fav');
            removeBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault(); // Mencegah pindah halaman
                    const card = btn.closest('.recipe-card');
                    if (card) {
                        // Tampilkan notifikasi (ganti dengan modal custom di versi nyata)
                        console.log(`Resep '${card.querySelector('h3').textContent}' berhasil dihapus dari Favorit!`);
                        
                        // Hapus elemen dari DOM untuk simulasi
                        card.style.opacity = 0;
                        setTimeout(() => card.remove(), 300);
                    }
                });
            });
        }
    }
});