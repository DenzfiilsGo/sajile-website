document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Dark Mode Toggle ---
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const icon = themeToggle.querySelector('i');

    // Cek preferensi tersimpan saat memuat halaman
    if(localStorage.getItem('theme') === 'dark') {
        body.setAttribute('data-theme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }

    // Event listener untuk tombol toggle
    themeToggle.addEventListener('click', () => {
        if (body.getAttribute('data-theme') === 'dark') {
            // Ubah ke mode terang
            body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            // Ubah ke mode gelap
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    });

    // --- 2. Scroll Animation (Fade In) ---
    const observerOptions = {
        threshold: 0.15 // Elemen muncul saat 15% terlihat
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
    
    // --- 3. Filter Logic (Contoh Sederhana) ---
    const filterTags = document.querySelectorAll('.filter-tags .tag');
    filterTags.forEach(tag => {
        tag.addEventListener('click', function() {
            // Hapus 'active' dari semua tag
            filterTags.forEach(t => t.classList.remove('active'));
            // Tambahkan 'active' ke tag yang diklik
            this.classList.add('active');
            
            // Logika filtering resep seolah-olah dilakukan di sini
            console.log(`Filter aktif: Mencari resep kategori: ${this.textContent}`);
            
            // Di lingkungan nyata, di sini akan ada fungsi AJAX/fetch data untuk memuat resep baru
        });
    });

    // --- 4. Load More Button (Contoh Sederhana) ---
    const loadMoreBtn = document.querySelector('.load-more-btn-container .btn-primary');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            console.log("Memuat lebih banyak resep...");
            // Di lingkungan nyata, di sini akan ada fungsi AJAX/fetch data untuk memuat resep tambahan
            // Tampilkan pesan sukses sebentar
            loadMoreBtn.textContent = "Resep dimuat!";
            setTimeout(() => {
                loadMoreBtn.textContent = "Muat Lebih Banyak Resep";
            }, 1500);
        });
    }

});