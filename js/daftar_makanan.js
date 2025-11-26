document.addEventListener('DOMContentLoaded', () => {

    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const foodItems = document.querySelectorAll('.category-makanan');
    const drinkItems = document.querySelectorAll('.category-minuman');

    // --- Logika Filter Makanan/Minuman ---
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 1. Ubah style tombol aktif
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 2. Ambil kategori yang dipilih (makanan / minuman)
            const filter = btn.getAttribute('data-filter');

            // 3. Logika Tampil/Sembunyi
            if (filter === 'makanan') {
                // Tampilkan Makanan
                foodItems.forEach(item => {
                    item.style.display = 'block';
                    // Reset animasi supaya "fresh"
                    item.style.animation = 'none';
                    item.offsetHeight; /* trigger reflow */
                    item.style.animation = 'fadeIn 0.5s ease-in-out';
                });
                // Sembunyikan Minuman
                drinkItems.forEach(item => item.style.display = 'none');
            } else {
                // Tampilkan Minuman
                drinkItems.forEach(item => {
                    item.style.display = 'block';
                    item.style.animation = 'none';
                    item.offsetHeight; 
                    item.style.animation = 'fadeIn 0.5s ease-in-out';
                });
                // Sembunyikan Makanan
                foodItems.forEach(item => item.style.display = 'none');
            }
        });
    });

    // --- Logika Dark Mode ---
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const icon = themeToggle.querySelector('i');

    // Cek preferensi saat halaman dimuat (dari local storage)
    if(localStorage.getItem('theme') === 'dark') {
        body.setAttribute('data-theme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }

    // Event listener saat tombol diklik
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
});