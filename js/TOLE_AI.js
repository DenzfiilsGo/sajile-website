// File: js/TOLE_AI.js

// =======================================================
// 1. DATA MAKANAN (DATABASE PENGETAHUAN)
// =======================================================
const foodDatabase = {
    "ayamgoreng": {
        "nama": "Ayam Goreng",
        "deskripsi": "Hidangan ayam berbumbu rempah yang digoreng hingga kulitnya renyah namun dagingnya tetap empuk. Menu andalan keluarga Indonesia.",
        "asal": "Indonesia",
        "bahan": ["Ayam segar", "Bawang putih", "Ketumbar", "Garam secukupnya", "Air untuk merebus", "Minyak goreng"],
        "cara": "1. Lumuri potongan ayam dengan bumbu halus hingga merata.<br>2. Ungkep (rebus dengan sedikit air) hingga bumbu meresap sempurna.<br>3. Panaskan minyak goreng dalam jumlah banyak.<br>4. Goreng ayam hingga berwarna kuning keemasan.<br>5. Angkat, tiriskan, dan sajikan selagi hangat."
    },
    "tempegoreng": {
        "nama": "Tempe Goreng",
        "deskripsi": "Sajian sederhana berbahan dasar kedelai fermentasi yang digoreng garing. Kaya protein dan sangat terjangkau.",
        "asal": "Indonesia",
        "bahan": ["Tempe papan", "Garam", "Ketumbar bubuk", "Air sedikit", "Minyak goreng"],
        "cara": "1. Iris tempe sesuai ketebalan yang diinginkan.<br>2. Rendam sebentar dalam larutan air garam dan ketumbar.<br>3. Panaskan minyak di wajan.<br>4. Goreng tempe hingga matang kecokelatan.<br>5. Sajikan sebagai lauk atau camilan."
    },
    "tumisbayam": {
        "nama": "Tumis Bayam",
        "deskripsi": "Masakan sayur praktis yang menyehatkan, dimasak cepat untuk menjaga nutrisi alaminya.",
        "asal": "Indonesia",
        "bahan": ["Ikat bayam segar", "Bawang putih cincang", "Bawang merah iris", "Garam & Gula", "Sedikit minyak"],
        "cara": "1. Petik daun bayam dan cuci bersih di air mengalir.<br>2. Tumis bawang merah dan bawang putih hingga harum.<br>3. Masukkan bayam, aduk cepat agar tidak layu berlebihan.<br>4. Tambahkan garam dan gula secukupnya.<br>5. Angkat segera agar tetap hijau segar."
    },
    "sayurbeningbayam": {
        "nama": "Sayur Bening Bayam",
        "deskripsi": "Sup bening yang menyegarkan dengan aroma khas temu kunci, sangat cocok untuk menghangatkan tubuh.",
        "asal": "Indonesia (Jawa)",
        "bahan": ["Bayam", "Jagung manis (opsional)", "Bawang merah", "Temu kunci", "Garam & Gula", "Air"],
        "cara": "1. Didihkan air dalam panci.<br>2. Masukkan irisan bawang merah dan temu kunci geprek.<br>3. Masukkan jagung (jika ada), masak hingga empuk.<br>4. Masukkan bayam, beri garam dan gula.<br>5. Masak sebentar saja, lalu matikan api."
    },
    "nasiuduk": {
        "nama": "Nasi Uduk",
        "deskripsi": "Nasi gurih yang dimasak dengan santan dan aneka rempah, menciptakan aroma harum yang menggugah selera sarapan.",
        "asal": "Indonesia (Betawi)",
        "bahan": ["Beras putih", "Santan kelapa", "Daun salam & serai", "Garam", "Pandan"],
        "cara": "1. Cuci beras hingga bersih.<br>2. Masak beras bersama santan dan semua rempah di rice cooker atau panci.<br>3. Aduk sesekali agar santan tidak mengendap.<br>4. Setelah matang, aduk rata agar pulen.<br>5. Sajikan dengan taburan bawang goreng."
    },
    "rendang": {
        "nama": "Rendang Sapi",
        "deskripsi": "Mahakarya kuliner Minangkabau berupa daging sapi yang dimasak perlahan dalam santan dan rempah hingga kering dan berwarna gelap.",
        "asal": "Sumatera Barat, Indonesia",
        "bahan": ["Daging sapi", "Santan kental", "Cabai merah", "Bawang merah & putih", "Lengkuas, Serai, Daun Jeruk", "Rempah rendang"],
        "cara": "1. Haluskan semua bumbu rempah.<br>2. Masak santan bersama bumbu hingga mendidih dan berminyak.<br>3. Masukkan potongan daging sapi.<br>4. Masak dengan api kecil sambil terus diaduk perlahan hingga kuah mengering dan daging empuk (proses ini bisa memakan waktu berjam-jam).<br>5. Rendang siap disajikan dan tahan lama."
    },
    "sotobetawi": {
        "nama": "Soto Betawi",
        "deskripsi": "Soto khas Jakarta dengan kuah creamy dari campuran santan dan susu, berisi potongan daging sapi dan jeroan.",
        "asal": "Jakarta, Indonesia",
        "bahan": ["Daging sapi/jeroan", "Santan & Susu cair", "Bawang merah & putih", "Kayu manis & cengkeh", "Tomat & Kentang goreng"],
        "cara": "1. Rebus daging hingga empuk, potong dadu.<br>2. Tumis bumbu halus hingga harum, masukkan ke air rebusan daging.<br>3. Tuang santan dan susu, aduk rata agar tidak pecah.<br>4. Masukkan rempah-rempah pelengkap.<br>5. Sajikan panas dengan emping dan acar."
    },
    "pempek": {
        "nama": "Pempek Palembang",
        "deskripsi": "Olahan ikan tenggiri dan tepung sagu yang kenyal, disajikan dengan kuah cuko yang pedas, asam, dan manis.",
        "asal": "Palembang, Indonesia",
        "bahan": ["Ikan tenggiri giling", "Tepung sagu tani", "Air es", "Garam & Penyedap", "Bahan Cuko (Gula merah, asam, cabai)"],
        "cara": "1. Campur ikan, air es, dan garam hingga adonan lengket.<br>2. Masukkan tepung sagu sedikit demi sedikit, aduk rata.<br>3. Bentuk adonan sesuai selera (lenjer/kapal selam).<br>4. Rebus dalam air mendidih hingga mengapung, lalu goreng.<br>5. Sajikan dengan kuah cuko."
    },
    "nasigoreng": {
        "nama": "Nasi Goreng Spesial",
        "deskripsi": "Hidangan nasi yang digoreng dengan kecap manis dan bumbu sederhana, solusi lezat untuk mengolah nasi sisa semalam.",
        "asal": "Indonesia",
        "bahan": ["Nasi putih dingin", "Bawang merah & putih", "Cabai (sesuai selera)", "Kecap manis", "Telur & Ayam suwir"],
        "cara": "1. Panaskan sedikit minyak, tumis bumbu halus hingga harum.<br>2. Masukkan telur, buat orak-arik.<br>3. Masukkan nasi putih, aduk rata.<br>4. Tambahkan kecap manis, garam, dan penyedap.<br>5. Masak dengan api besar sebentar agar aroma keluar, lalu sajikan."
    },
    "sateayam": {
        "nama": "Sate Ayam Madura",
        "deskripsi": "Potongan daging ayam yang ditusuk lidi, dibakar di atas arang, dan disiram saus kacang yang legit.",
        "asal": "Indonesia (Madura)",
        "bahan": ["Daging ayam fillet", "Kacang tanah goreng", "Kecap manis", "Bawang merah & putih", "Jeruk nipis"],
        "cara": "1. Potong dadu daging ayam, tusuk dengan tusuk sate.<br>2. Haluskan kacang tanah, masak dengan air, kecap, dan bumbu hingga kental.<br>3. Lumuri sate dengan sedikit bumbu kacang.<br>4. Bakar hingga matang dan harum.<br>5. Sajikan dengan sisa bumbu kacang dan lontong."
    },
    "bakso": {
        "nama": "Bakso Sapi Kuah",
        "deskripsi": "Bola-bola daging kenyal yang disajikan dalam kuah kaldu sapi bening yang gurih dan hangat.",
        "asal": "Indonesia (dipengaruhi Tiongkok)",
        "bahan": ["Daging sapi giling", "Tepung tapioka", "Es batu", "Bawang putih goreng", "Tulang sapi (untuk kuah)"],
        "cara": "1. Giling daging sapi dengan es batu dan bumbu hingga halus.<br>2. Campur dengan tepung tapioka, bentuk bulat-bulat.<br>3. Rebus dalam air panas hingga mengapung.<br>4. Buat kuah dengan merebus tulang sapi dan bumbu.<br>5. Sajikan bakso dengan kuah dan pelengkap."
    },
    "esjeruk": {
        "nama": "Es Jeruk Segar",
        "deskripsi": "Minuman klasik dari perasan jeruk asli, memberikan kesegaran instan dan asupan vitamin C.",
        "asal": "Indonesia",
        "bahan": ["Jeruk peras manis", "Gula pasir (cairkan)", "Air matang", "Es batu"],
        "cara": "1. Belah jeruk dan peras airnya.<br>2. Saring bijinya agar tidak pahit.<br>3. Campur air jeruk dengan air gula dan air matang.<br>4. Tambahkan es batu secukupnya.<br>5. Siap diminum untuk melepas dahaga."
    },
    "estehmanis": {
        "nama": "Es Teh Manis",
        "deskripsi": "Minuman sejuta umat di Indonesia. Teh wangi melati yang diseduh pekat dan diberi gula serta es batu.",
        "asal": "Indonesia",
        "bahan": ["Teh celup/tubruk", "Gula pasir", "Air panas", "Es batu"],
        "cara": "1. Seduh teh dengan air panas hingga warnanya pekat.<br>2. Tambahkan gula pasir, aduk hingga larut.<br>3. Tambahkan air dingin secukupnya.<br>4. Masukkan es batu yang banyak.<br>5. Nikmati kesegarannya."
    }
};

import { API_BASE_URL, backendUrlReady } from './config.js';
import { getAuthToken, getAuthUser } from './authManager.js';

// =======================================================
// 2. LOGIKA UTAMA SAJILE (NAVBAR, AUTH, DARK MODE)
// =======================================================

document.addEventListener('selectstart', function(e) {
    e.preventDefault(); // Mencegah aksi default seleksi
});

document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

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

function checkLoginState() {
    const token = localStorage.getItem('authToken');
    const body = document.body;
    const navAuthLinks = document.querySelector('.nav-auth-links');
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper');

    if (token) {
        if(navAuthLinks) navAuthLinks.style.display = 'none';
        if(profileDropdownWrapper) profileDropdownWrapper.style.display = 'flex';
        body.dataset.loggedIn = 'true';
        updateUserProfileUI();
    } else {
        if(navAuthLinks) navAuthLinks.style.display = 'flex';
        if(profileDropdownWrapper) profileDropdownWrapper.style.display = 'none';
        body.dataset.loggedIn = 'false';
    }
}

// =======================================================
// 3. LOGIKA TOLE AI CHAT (INTELLIGENT RESPONSE SYSTEM)
// =======================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Init Standard SajiLe UI
    // 1. Tunggu URL Backend siap
    await backendUrlReady;
    // 2. Ambil sesi dari server (ini akan memanggil renderHistoryList secara otomatis)
    fetchSessions();
    // 3. Pasang event listener tombol
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
        newChatBtn.onclick = startNewChat;
    }

    checkLoginState();
    document.getElementById('new-chat-btn').addEventListener('click', startNewChat);
    
    // Navbar Toggles
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profilePicBtn && profileDropdown) {
        profilePicBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if(!profileDropdown.contains(e.target) && !profilePicBtn.contains(e.target)){
                profileDropdown.classList.remove('active');
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
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

    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    // B. Dark Mode Toggle
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        const savedTheme = localStorage.getItem('sajile_theme') || 'light'; 
        
        // Inisialisasi awal
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

    // --- CHAT INTERFACE LOGIC ---
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const typingIndicator = document.getElementById('typing-indicator');
    const chatWindow = document.getElementById('chat-window');
    
    // Sidebar Mobile Toggle
    const sidebar = document.getElementById('ai-sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');

    let userKredit = 0;
    const user = getAuthUser();

    syncKreditOnLoad();
    initCreditSystem();

    /**
     * Sinkronisasi Kredit AI dengan Database saat halaman dimuat/di-refresh
     * Gunakan ini untuk memicu reset otomatis 00.00 tanpa harus kirim pesan
     */
    async function syncKreditOnLoad() {
        try {
            const authData = JSON.parse(localStorage.getItem('authUser'));
            if (!authData || !authData._id) return;

            // Ambil data terbaru langsung dari server (proaktif)
            const response = await fetch(`${API_BASE_URL}/users/${authData._id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            const updatedUser = await response.json();

            if (response.ok) {
                userKredit = updatedUser.aiCredits;
                
                // Update Local Storage agar sinkron dengan Database hasil Cron Job
                const currentAuthUser = JSON.parse(localStorage.getItem('authUser'));
                currentAuthUser.aiCredits = updatedUser.aiCredits;
                currentAuthUser.membership = updatedUser.membership;
                localStorage.setItem('authUser', JSON.stringify(currentAuthUser));
                
                updateUIKredit();
                console.log("[Sync] Kredit diperbarui dari server:", userKredit);
            }
        } catch (err) {
            console.error("[Sync] Gagal:", err);
            // Fallback: gunakan data lokal jika server offline
            userKredit = user ? user.aiCredits : 0;
            updateUIKredit();
        }
    }

    // 1. Inisialisasi Kredit Berdasarkan Paket
    function initCreditSystem() {
        if (!user) {
            userKredit = 5; 
        } else {
            // AMBIL DARI USER OBJECT, JANGAN DI-RESET KE DEFAULT MAP
            // Jika aiCredits tidak ada (undefined), baru gunakan default paket
            const membership = user.membership || 'free';
            const creditMap = { 'free': 5, 'starter': 20, 'premium': 50, 'legend': 120 };
            
            // Gunakan nilai dari database (user.aiCredits)
            userKredit = (user.aiCredits !== undefined) ? user.aiCredits : (creditMap[membership] || 5);
        }
        console.log(`[System] Kredit dimuat: ${userKredit}`);
        updateUIKredit();
    }

    // 2. Fungsi Update UI & Lock Input
    function updateUIKredit(showAlert = false) {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const inputContainer = document.querySelector('.input-container');
        const currentMembership = user ? user.membership : 'free';

        if (userKredit <= 0) {
            chatInput.disabled = true;
            chatInput.value = "";
            
            const messages = {
                'free': "Kredit harian habis. Kembali besok!",
                'starter_taster': "Kredit harian habis. Kembali besok!",
                'starter_pro': "Kredit harian habis. Kembali besok!",
                'premium_home': "Kredit harian habis. Kembali besok!",
                'premium_elite': "Kredit harian habis. Kembali besok!",
                'legend_year': "Kredit harian habis. Kembali besok!",
                'legend_eternal': "Kredit harian habis. Kembali besok!"
            };

            chatInput.placeholder = messages[currentMembership] || "Kredit habis. Kembali besok!";
            sendBtn.style.display = 'none';
            if (inputContainer) inputContainer.classList.add('locked-state');
            if (showAlert) tampilkanNotifikasiHabis(currentMembership);
        } else {
            chatInput.disabled = false;
            chatInput.placeholder = "Tanya TOLE AI...";
            sendBtn.style.display = 'flex';
            if (inputContainer) inputContainer.classList.remove('locked-state');
        }
    }

    function tampilkanNotifikasiHabis(membership) {
        let paketTawaran = "Icip";
        let keuntungan = "Dapatkan 20 kredit setiap hari!";

        if (membership === 'free') {
            paketTawaran = "Paket Icip";
            keuntungan = "Dapatkan 20 kredit setiap hari!";
        } else if (membership === 'starter') {
            paketTawaran = "Chef Premium";
            keuntungan = "Dapatkan 50 kredit setiap hari!";
        } else if (membership === 'premium') {
            paketTawaran = "Legend Lifetime";
            keuntungan = "Akses 120 kredit/hari selamanya!";
        }

        Swal.fire({
            title: 'Oops! Kredit Habis',
            text: `Kredit harian Anda telah habis. ${keuntungan}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#2ecc71',
            cancelButtonColor: '#666',
            confirmButtonText: `<i class="fas fa-crown"></i> Upgrade ke ${paketTawaran}`,
            cancelButtonText: 'Kembali Besok',
            background: document.body.classList.contains('dark-theme') ? '#222' : '#fff',
            color: document.body.classList.contains('dark-theme') ? '#fff' : '#333'
        }).then((result) => {
            if (result.isConfirmed) {
                // Arahkan ke halaman langganan (Sesuaikan URL Anda)
                window.location.href = '/subscription'; 
            }
        });
    }

    if(sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.add('active'));
    }
    if(closeSidebarBtn && sidebar) {
        closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('active'));
    }

    // Auto-resize Textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if(this.value.trim() === '') {
            this.style.height = 'auto';
            sendBtn.disabled = true;
        } else {
            sendBtn.disabled = false;
        }
    });

    sendBtn.addEventListener('click', handleSendMessage);

    // Dan pada input Enter:
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if(!sendBtn.disabled) handleSendMessage(); // Gunakan handleSendMessage
        }
    });

    // Global Function untuk Suggestion Cards
    window.fillInput = function(text) {
        // VALIDASI: Jangan isi teks jika input sedang di-disable (kredit habis)
        if (chatInput.disabled) {
            console.warn("Input diblokir: Kredit habis.");
            return; 
        }
        chatInput.value = text;
        chatInput.focus();
        sendBtn.disabled = false;
        // Trigger auto resize event
        const event = new Event('input', { bubbles: true });
        chatInput.dispatchEvent(event);
    };


    // Awal dari fungsi-fungsi yang dipindahkan
    let currentSessionId = null;

    // =======================================================
    // 1. FUNGSI FETCH BACKEND
    // =======================================================

    // A. Ambil Daftar Sesi dari Server
    async function fetchSessions() {
        await backendUrlReady;
        const token = getAuthToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/chats`, {
                headers: { 'x-auth-token': token }
            });
            const sessions = await res.json();
            renderHistoryList(sessions);
        } catch (err) {
            console.error("Gagal memuat riwayat:", err);
        }
    }

    // B. Simpan Pesan ke Server
    async function saveMessageToBackend(role, content) {
        const token = getAuthToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/chats/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    sessionId: currentSessionId, // null jika chat baru
                    role: role,
                    content: content
                })
            });

            const data = await res.json();
            
            // JIKA AWALNYA NULL, SEKARANG ISI DENGAN ID DARI DATABASE
            if (!currentSessionId && data._id) {
                currentSessionId = data._id;
                console.log("Sesi baru tercipta:", currentSessionId);
            }
        } catch (err) {
            console.error("Gagal sinkronisasi ke cloud:", err);
        }
    }

    // C. Hapus Sesi dari Server
    async function deleteSession(id, event) {
        event.stopPropagation(); // Agar tidak memicu loadChat
        if (!confirm("Hapus percakapan ini secara permanen?")) return;

        const token = getAuthToken();
        try {
            await fetch(`${API_BASE_URL}/chats/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            
            if (currentSessionId === id) startNewChat();
            fetchSessions();
        } catch (err) {
            alert("Gagal menghapus.");
        }
    }

    // =======================================================
    // 2. LOGIKA UI & RENDER
    // =======================================================

    function renderHistoryList(sessions = []) { // <-- Tambahkan = [] di sini
        const container = document.getElementById('history-list');
        // Proteksi tambahan jika elemen tidak ditemukan
        if (!container) return;
        container.innerHTML = '<p class="history-label">Riwayat Percakapan</p>';
        // Proteksi jika sessions bukan array
        if (!Array.isArray(sessions)) {
            console.error("Data sessions bukan array:", sessions);
            return;
        }

        sessions.forEach(chat => {
            const btn = document.createElement('div');
            btn.className = `history-item ${chat._id === currentSessionId ? 'active' : ''}`;
            btn.onclick = () => loadFullChat(chat._id);

            //btn.innerHTML = `
            //    <span><i class="far fa-message"></i> ${chat.title}</span>
            //    <button class="delete-history-btn" title="Hapus Chat">
            //        <i class="fas fa-trash-alt"></i>
            //    </button>
            //`;

            // PERUBAHAN DI SINI:
            // Pindahkan Ikon ke luar <span> atau biarkan di dalam, 
            // tapi pastikan teks judul chat dibungkus elemen yang bisa "flex: 1"
            btn.innerHTML = `
                <i class="far fa-message"></i> 
                <span class="chat-title" title="${chat.title}">${chat.title}</span>
                <button class="delete-history-btn">
                    <i class="fas fa-trash-alt" title="Hapus Chat"></i>
                </button>
            `;

            // Pasang event delete
            btn.querySelector('.delete-history-btn i').onclick = (e) => {
                e.stopPropagation(); // Mencegah loadFullChat terpanggil saat klik hapus
                deleteSession(chat._id, e);
            };
            container.appendChild(btn);
        });
    }

    async function loadFullChat(id) {
        currentSessionId = id;
        const token = getAuthToken();
        
        // Tampilkan loading/kosongkan window
        document.getElementById('messages-container').innerHTML = '';
        document.getElementById('welcome-screen').style.display = 'none';
        document.getElementById('messages-container').style.display = 'block';

        try {
            // Ambil data detail chat dari backend (kita asumsikan endpoint ini ada di controller)
            const res = await fetch(`${API_BASE_URL}/chats/${id}`, {
                headers: { 'x-auth-token': token }
            });
            const chatData = await res.json();
            
            chatData.messages.forEach(msg => {
                //appendMessageToUI(msg.role, msg.content); // Fungsi display UI Anda
                // Gunakan addMessage, bukan appendMessageToUI
                addMessage(msg.content, msg.role);
            });
            fetchSessions(); // Update status 'active' di sidebar
        } catch (err) {
            console.error("Gagal memuat detail chat.");
        }
    }

    function addMessage(content, sender) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('message-wrapper', sender);

        let avatarHTML = '';
        if (sender === 'ai') {
            avatarHTML = `<div class="chat-avatar ai"><i class="fas fa-robot"></i></div>`;
        } else {
            const userData = JSON.parse(localStorage.getItem('authUser') || '{}');
            const userImg = userData.profilePictureUrl || 'https://placehold.co/40x40/3498db/fff?text=U';
            avatarHTML = `<div class="chat-avatar user"><img src="${userImg}" alt="User"></div>`;
        }

        // FORMATTING RESPON AI
        let formattedContent;
        if (typeof content === 'object') {
            // Jika konten adalah objek (Resep ditemukan)
            // Kita buat formatnya seperti percakapan natural
            const sapaan = getRandomGreeting();
            formattedContent = `
                ${sapaan} Berikut adalah informasi mengenai <strong>${content.nama}</strong> yang Anda cari.<br><br>
                <em>${content.deskripsi}</em><br><br>
                <strong>🌍 Asal Masakan:</strong> ${content.asal}<br><br>
                <strong>🛒 Bahan-bahan yang Diperlukan:</strong>
                <ul>${content.bahan.map(b => `<li>${b}</li>`).join('')}</ul>
                <strong>👨‍🍳 Cara Memasak:</strong><br>
                ${content.cara}<br><br>
                Selamat mencoba memasak! Apakah ada resep lain yang ingin Anda tanyakan?
            `;
        } else {
            // Jika string biasa (Teks percakapan)
            formattedContent = content.replace(/\n/g, '<br>');
        }

        wrapper.innerHTML = `
            ${avatarHTML}
            <div class="message-content">${formattedContent}</div>
        `;

        messagesContainer.appendChild(wrapper);
    }

    function startNewChat() {
        currentSessionId = null;
        document.getElementById('messages-container').innerHTML = '';
        document.getElementById('messages-container').style.display = 'none';
        document.getElementById('welcome-screen').style.display = 'block';
        fetchSessions();
    }

    /**
     * 3. Fungsi Utama Pengiriman Pesan
     * Dimodifikasi untuk sinkronisasi kredit otomatis (Reset 00.00 via Lazy Loading)
     */
    async function handleSendMessage() {
        const text = chatInput.value.trim();
        if (!text || sendBtn.disabled) return;

        // Optimistic UI
        addMessage(text, 'user');
        chatInput.value = '';
        sendBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/users/deduct-credit`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                userKredit = data.aiCredits;
                updateUIKredit();
                
                // Simpan pesan & Proses AI
                await saveMessageToBackend('user', text);
                showTyping();
                
                setTimeout(async () => {
                    hideTyping();
                    const aiResponse = generateIntelligentResponse(text);
                    addMessage(aiResponse, 'ai');
                    await saveMessageToBackend('ai', (typeof aiResponse === 'object' ? aiResponse.nama : aiResponse));
                    fetchSessions();
                }, 1000);

            } else {
                userKredit = 0;
                updateUIKredit(true);
            }
        } catch (err) {
            console.error("Chat Error:", err);
        }
    }

    // Inisialisasi
    document.addEventListener('DOMContentLoaded', () => {
        fetchSessions();
        document.getElementById('new-chat-btn').onclick = startNewChat;
    });
    // Akhir dari fungsi-fungsi baru yang dipindahkan

    function showTyping() { typingIndicator.style.display = 'flex'; }
    function hideTyping() { typingIndicator.style.display = 'none'; }
    function scrollToBottom() { chatWindow.scrollTop = chatWindow.scrollHeight; }

    // ===================================================
    // 4. INTELLIGENT LOGIC & NATURAL LANGUAGE PROCESSING
    // ===================================================

    // Variasi Sapaan agar tidak monoton
    function getRandomGreeting() {
        const greetings = ["Tentu!", "Baiklah,", "Siap,", "Dengan senang hati,", "Oke, ini dia."];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    function getRandomFallback() {
        const fallbacks = [
            "Hmm, saya belum menemukan resep dengan nama persis seperti itu di catatan saya. Mungkin ada nama lain atau coba periksa ejaannya?",
            "Maaf, saya belum mempelajari resep tersebut. Namun, saya terus belajar! Coba tanyakan resep populer lainnya seperti 'Rendang' atau 'Nasi Goreng'.",
            "Waduh, sepertinya resep itu belum ada di database saya. Apakah Anda bermaksud menanyakan masakan lain?",
            "Saya kurang yakin dengan masakan itu. Bisakah Anda memberikan nama yang lebih spesifik atau mencoba menu lain?"
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    function normalizeInput(text) {
        return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim(); // Hanya huruf, angka, spasi
    }

    // Algoritma Levenshtein Distance (Fuzzy Matching)
    function getSimilarity(s1, s2) {
        var longer = s1;
        var shorter = s2;
        if (s1.length < s2.length) { longer = s2; shorter = s1; }
        var longerLength = longer.length;
        if (longerLength == 0) { return 1.0; }
        return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
    }

    function editDistance(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        var costs = new Array();
        for (var i = 0; i <= s1.length; i++) {
            var lastValue = i;
            for (var j = 0; j <= s2.length; j++) {
                if (i == 0) costs[j] = j;
                else {
                    if (j > 0) {
                        var newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }

    // 🧠 FUNGSI OTAK UTAMA (PENALARAN SEDERHANA)
    function generateIntelligentResponse(input) {
        const rawInput = input;
        const normalizedInput = normalizeInput(input);
        
        // 1. Deteksi Salam & Sapaan (Small Talk)
        const greetings = ["halo", "hai", "hi", "selamat pagi", "selamat siang", "selamat malam", "assalamualaikum", "pagi", "siang", "malam"];
        if (greetings.some(word => normalizedInput.startsWith(word))) {
            return `Halo! Saya TOLE AI, asisten dapur pintar Anda. Ada yang bisa saya bantu? Silakan sebutkan nama masakan yang ingin Anda ketahui resepnya.`;
        }

        const thanks = ["terima kasih", "makasih", "thanks", "tq", "thank you"];
        if (thanks.some(word => normalizedInput.includes(word))) {
            return "Sama-sama! Senang bisa membantu Anda di dapur. Jangan ragu bertanya lagi jika butuh inspirasi masak!";
        }

        const whoAreYou = ["kamu siapa", "siapa kamu", "tole ai", "tole itu apa"];
        if (whoAreYou.some(word => normalizedInput.includes(word))) {
            return "Saya adalah TOLE AI, asisten virtual yang dikembangkan oleh SajiLe. Tugas saya adalah membantu Anda menemukan resep masakan, tips dapur, dan inspirasi kuliner dengan cepat dan mudah.";
        }

        // 2. Deteksi Topik di Luar Makanan (Context Guardrail)
        const invalidTopics = ["politik", "presiden", "bola", "cuaca", "saham", "crypto", "pacar", "cinta", "matematika", "sejarah"];
        if (invalidTopics.some(topic => normalizedInput.includes(topic))) {
            return "Maaf, sebagai asisten dapur, kapabilitas saya terbatas pada dunia kuliner dan masakan. Mari kita kembali membicarakan makanan enak! 🍳";
        }

        // 3. Logika Pencarian Resep (Inti)
        // Kita coba cari kecocokan di database
        let bestMatch = null;
        let highestScore = 0;

        for (const key in foodDatabase) {
            // Cek Substring (Prioritas Tinggi)
            // Hapus spasi dari key database untuk pencocokan lebih fleksibel (e.g. "ayamgoreng")
            const cleanKey = key.replace(/\s/g, ''); 
            const cleanInput = normalizedInput.replace(/\s/g, '');

            if (cleanInput.includes(cleanKey)) {
                // Jika input user mengandung nama makanan (misal: "resep ayam goreng dong")
                return foodDatabase[key]; // Langsung kembalikan objek
            }
            
            // Cek Fuzzy Logic (Untuk Typo)
            const similarity = getSimilarity(cleanInput, cleanKey);
            if (similarity > highestScore) {
                highestScore = similarity;
                bestMatch = key;
            }
        }

        // Ambang batas kemiripan (0.6 cukup moderat untuk menangani typo ringan)
        if (highestScore > 0.6 && bestMatch) {
            // Konfirmasi jika skor tidak sempurna tapi cukup tinggi
            if (highestScore < 0.85) {
                // Kembalikan objek tapi dengan catatan di dalam addMessage (perlu modifikasi addMessage jika ingin custom text, 
                // tapi di sini kita langsung kembalikan objek agar formatnya konsisten)
                return foodDatabase[bestMatch]; 
            }
            return foodDatabase[bestMatch];
        }

        // 4. Respon Default (Jika tidak paham sama sekali)
        return getRandomFallback();
    }
});