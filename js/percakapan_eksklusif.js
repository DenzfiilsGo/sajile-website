/**
 * SajiLe | Exclusive Chef Lounge Logic
 * Fokus: Real-time Communication & Security Gatekeeper
 */

// Proteksi klik kanan dan drag (Opsional, sesuai permintaan Anda)
document.addEventListener('selectstart', (e) => e.preventDefault());
document.addEventListener('dragstart', (e) => e.preventDefault());

import { getAuthUser, getAuthToken } from './authManager.js';
import { backendUrlReady, PUBLIC_BACKEND_URL, API_BASE_URL } from './config.js';

// Pastikan URL Backend sudah siap sebelum inisialisasi
await backendUrlReady;

class ExclusiveChatApp {
    constructor() {
        const savedUser = JSON.parse(localStorage.getItem('authUser'));
        this.user = savedUser || getAuthUser();
        this.token = getAuthToken();
        this.overlay = document.getElementById('protection-overlay');
        this.searchQuery = '';
        this.peers = {}; // Menyimpan semua koneksi user lain
        this.localStream = null;
        this.callTimer = null;
        this.callStartTime = 0;
        this.isMicActive = true;
        this.isCamActive = true;
        this.messagesContainer = document.getElementById('messages-feed');
        this.replyToId = null; // Menyimpan ID pesan yang akan dibalas
        this.isSpreadMode = false;
        this.selectedSpreadIds = [];
        this.spreadData = [];
        this.savedSpreadOptions = null; // Menyimpan config dari modal
        this.currentSpreadIndex = 0;
        this.lastRenderedBatchId = null;
        this.input = document.getElementById('message-input');
        this.emojiPicker = null;
        this.isPickerInitialized = false;
        this.pendingFiles = []; // Diubah menjadi Array
        this.maxFiles = 10;
        this.maxFileSize = 25 * 1024 * 1024; // 25 MB
        this.currentRoomId = 'general_lounge';
        this.lastRenderedDate = null;
        this.sharedMedia = []; // Array untuk menyimpan semua media objek {type, url, name, size}
        this.roomMembers = new Map(); // Menggunakan Map agar lebih mudah mengelola objek unik
        this.archiveFilter = 'semua';
        this.isArchiveLoading = false;
        this.setupArchiveScroll();
        this.setupMidnightWatcher(); // Panggil pemantau waktu
        this.getActualRoomId = (id) => {
            if (id === 'concierge') return `concierge-${this.user._id}`;
            return id;
        };
        this.rooms = {
            'announcements': { name: 'Official Broadcast', icon: 'fa-bullhorn', type: 'broadcast' },
            'events': { name: 'Executive Events', icon: 'fa-calendar', type: 'group' },
            'general_lounge': { name: 'General Lounge', icon: 'fa-comments', type: 'group' },
            'concierge': { name: 'SajiLe Concierge', icon: 'fa-user-tie', type: 'private' }
        };
        this.socket = io(`${PUBLIC_BACKEND_URL}`, {
            auth: { token: this.token }
        });
        // Allowed Packages (Gatekeeper Access)
        this.allowedPackages = ['legend_year', 'legend_eternal', 'starter_taster']; 
        this.init();
    }

    async init() {
        // Cek akses sebelum mengizinkan UI muncul
        if (await this.checkAccess()) {
            this.setupUI();
            await this.loadChatHistory(); // TAMBAHKAN INI: Ambil data lama dari DB
            this.setupSocketListeners();
            this.setupEventListeners();
            this.scrollToBottom();
        }
    }

    // ==========================================
    // HELPER: Mengubah nama file menjadi URL Lengkap
    // ==========================================
    resolveUrl(filename) {
        if (!filename) return '';
        // Jika sudah ada http (data lama), biarkan. Jika belum (data baru), gabungkan.
        if (filename.startsWith('http') || filename.startsWith('data:')) return filename;
        return `${PUBLIC_BACKEND_URL}/uploads/lounge/${filename}`;
    }

    // ==========================================
    // LOGIKA PENANDA TANGGAL (DATE SEPARATOR)
    // ==========================================

    formatDateSeparator(date) {
        const today = new Date();
        const messageDate = new Date(date);
        
        // Reset jam ke 0 untuk perbandingan tanggal murni
        today.setHours(0, 0, 0, 0);
        const compareDate = new Date(messageDate);
        compareDate.setHours(0, 0, 0, 0);

        const diffTime = today - compareDate;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hari Ini';
        if (diffDays === 1) return 'Kemarin';
        if (diffDays === 2) return 'Kemarin Lusa';
        
        return messageDate.toLocaleDateString('id-ID', { 
            day: 'numeric', month: 'long', year: 'numeric' 
        });
    }

    // ==========================================
    // LOGIKA PENANDA TANGGAL (UPDATED)
    // ==========================================

    insertDateSeparator(timestamp) {
        const dateLabel = this.formatDateSeparator(timestamp);
        const dateObj = new Date(timestamp);
        // Buat ID unik berdasarkan tanggal: sep-YYYY-MM-DD
        const dateId = `sep-${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
        
        // VALIDASI DOM: Cek apakah ID tanggal ini sudah ada
        const existingSeparator = document.getElementById(dateId);
        if (existingSeparator) return; 

        const dateDiv = document.createElement('div');
        dateDiv.id = dateId; // Berikan ID unik
        dateDiv.className = 'date-separator';
        // Tambahkan class data-date-group untuk memudahkan seleksi nanti
        dateDiv.setAttribute('data-date-group', dateId); 
        dateDiv.innerHTML = `<span>${dateLabel}</span>`;
        
        this.messagesContainer.appendChild(dateDiv);
    }

    cleanupEmptyDateSeparator(dateGroupId) {
        // Cari semua pesan yang memiliki data-parent-group yang sama dengan ID separator
        const messagesInGroup = this.messagesContainer.querySelectorAll(`.msg-row[data-parent-group="${dateGroupId}"]`);
        
        // Jika tidak ada lagi pesan (length === 0), hapus separatornya
        if (messagesInGroup.length === 0) {
            const separator = document.getElementById(dateGroupId);
            if (separator) {
                console.log(`[System] Membersihkan separator kosong: ${dateGroupId}`);
                separator.remove();
                
                // Opsional: Reset lastRenderedDate jika separator yang dihapus adalah yang terakhir
                // agar jika ada pesan baru masuk di hari yang sama, separator muncul lagi.
                this.lastRenderedDate = null;
            }
        }
    }

    // ==========================================
    // LOGIKA MEMUAT SEJARAH PESAN (HISTORY)
    // ==========================================

    async loadChatHistory(roomId = this.currentRoomId) {
        try {
            const response = await fetch(`${API_BASE_URL}/lounge/history?roomId=${roomId}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const history = await response.json();
            
            // 1. Reset Total sebelum render ulang
            this.messagesContainer.innerHTML = ''; 
            this.lastRenderedDate = null; // Reset tracker tanggal memori
            this.lastRenderedBatchId = null; // Reset tracker batch memori
            
            // 2. Pastikan history terurut secara kronologis (dari paling lama ke terbaru)
            const sortedHistory = history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            sortedHistory.forEach(msg => {
                const msgDate = new Date(msg.timestamp).toDateString();

                // 3. Sisipkan separator jika tanggal berubah
                if (msgDate !== this.lastRenderedDate) {
                    this.insertDateSeparator(msg.timestamp);
                    this.lastRenderedDate = msgDate;
                }

                const msgSenderId = msg.sender._id || msg.sender;
                this.renderMessage({
                    id: msg._id,
                    timestamp: msg.timestamp,
                    text: msg.content,
                    time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isMe: String(msgSenderId) === String(this.user._id),
                    sender: msg.sender, // Objek sender utuh
                    senderName: msg.sender.username || msg.senderName,
                    email: msg.sender.email,
                    type: msg.messageType,
                    parentMessage: msg.parentMessage,
                    mediaUrls: msg.mediaUrls,
                    attachments: msg.attachments,
                    fileName: msg.fileName,
                    spreadBatchId: msg.spreadBatchId || null
                }, true); // Tandai sebagai history
            });

            // Handle Scroll setelah gambar termuat
            const images = this.messagesContainer.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
            }));

            setTimeout(() => this.scrollToBottom(), 100);

        } catch (err) {
            console.error("Gagal memuat sejarah:", err);
        }
    }

    // ========================
    // SOCKET LISTENERS (REAL-TIME)
    // ========================
    setupSocketListeners() {
        this.socket = io(PUBLIC_BACKEND_URL, {
            auth: { token: this.token } // Ini harus ada agar socket.user di server tidak undefined
        });

        console.log(`[Socket] Menghubungkan ke room: ${this.currentRoomId}`);
        this.socket.emit('joinRoom', this.currentRoomId);

        // Mendengarkan pesan masuk
        this.socket.on('receiveLoungeMessage', (data) => {
            console.log("=== DEBUG FRONTEND: TERIMA DARI SERVER ===");
            console.log("Data Pesan Masuk:", data);

            if (data.parentMessage) {
                console.log("Pesan ini adalah BALASAN ke:", data.parentMessage);
                console.log("Nama Pengirim yang dibalas:", data.parentMessage.sender?.username);
            } else {
                console.log("Pesan ini adalah pesan biasa (bukan balasan).");
            }

            // PROTEKSI: Cek apakah roomId cocok
            if (data.roomId !== this.currentRoomId) {
                console.warn(`[Socket] Pesan diabaikan. Room mismatch: ${data.roomId} vs ${this.currentRoomId}`);
                return;
            }
            const senderId = (data.sender && data.sender._id) ? data.sender._id : (data.userId || data.senderId);
            const isMe = String(senderId) === String(this.user._id);

            // Ambil Nama secara aman
            const senderName = (data.sender && data.sender.username) ? data.sender.username : (data.username || data.senderName || "Unknown Chef");

            this.renderMessage({
                id: data._id,
                timestamp: data.timestamp,
                text: data.content,
                time: new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMe: String(senderId) === String(this.user._id), 
                sender: data.sender,
                senderEmail: (data.sender && data.sender.email) ? data.sender.email : (data.email || ''),
                type: data.messageType,
                parentMessage: data.parentMessage,
                mediaUrls: data.mediaUrls, 
                attachments: data.attachments,
                fileName: data.fileName,
                spreadBatchId: data.spreadBatchId
            });
            this.scrollToBottom();
        });

        // Listener Edit Pesan
        this.socket.on('messageEdited', (data) => {
            const contentEl = document.getElementById(`msg-content-${data.messageId}`);
            if (contentEl) {
                contentEl.innerText = data.newContent;
                // Tambahkan tanda (diedit) jika belum ada
                const metaDiv = contentEl.closest('.msg-bubble').querySelector('.msg-meta');
                if (metaDiv && !metaDiv.querySelector('.edited-mark')) {
                    const mark = document.createElement('span');
                    mark.className = 'edited-mark';
                    mark.innerText = '(diedit)';
                    metaDiv.prepend(mark);
                }
            }
        });

        // Listener Hapus Pesan
        this.socket.on('messageDeleted', (data) => {
            const msgId = typeof data === 'object' ? data.messageId : data;
            const row = document.getElementById(`msg-row-${msgId}`);
            if (row) {
                const groupId = row.getAttribute('data-parent-group');
                row.style.transition = 'opacity 0.3s, height 0.3s';
                row.style.opacity = '0';
                setTimeout(() => {
                    row.remove();
                    if(groupId) this.cleanupEmptyDateSeparator(groupId);
                }, 300);
            }
        });

        // Error handling socket
        this.socket.on('connect_error', (err) => {
            console.error("Socket Connection Error:", err.message);
        });
    }

    // ========================
    // 1. GATEKEEPER LOGIC
    // ========================
    async checkAccess() {
        if (!this.user || !this.token) {
            window.location.href = 'daftar_atau_login.html';
            return false;
        }

        console.log(`[Gatekeeper] Authenticating: ${this.user.username}`);

        if (!this.allowedPackages.includes(this.user.membership)) {
            if (this.overlay) this.overlay.style.display = 'none';
            
            await Swal.fire({
                icon: 'warning',
                title: 'Restricted Access',
                background: '#121212',
                color: '#fff',
                html: `<div style="color:#d4af37">Area ini khusus untuk pemegang kartu Legend.</div>`,
                confirmButtonText: 'Upgrade Membership',
                confirmButtonColor: '#d4af37',
                allowOutsideClick: false
            }).then(() => window.location.href = 'paket_langganan.html');
            return false;
        }

        // Efek loading mewah
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.opacity = '0';
                setTimeout(() => this.overlay.remove(), 800);
            }
        }, 1500);

        return true;
    }

    // ========================
    // 2. UI SETUP
    // ========================
    setupUI() {
        // Set Profile Data di Sidebar
        const profileImg = document.getElementById('current-user-img');
        const profileName = document.getElementById('current-user-name');
        const profileRank = document.getElementById('current-user-rank');

        if(profileImg) {
            // Gunakan fallback jika URL google tidak bisa dimuat
            profileImg.src = this.user.profilePictureUrl || 'https://placehold.co/40x40/3498db/fff?text=U';
            profileImg.onerror = () => profileImg.src = 'https://placehold.co/40x40/3498db/fff?text=U';
        }
        if(profileName) profileName.textContent = this.user.username;
        if(profileRank) profileRank.textContent = this.formatRank(this.user.membership);

        // --- TAMBAHKAN BAGIAN INI UNTUK SYNC HEADER DEFAULT ---
        const headerTitle = document.getElementById('active-room-name');
        const defaultRoom = this.rooms[this.currentRoomId]; // Mengambil data 'general_lounge'
        if (headerTitle && defaultRoom) {
            headerTitle.textContent = defaultRoom.name;
        }

        this.renderChatList();
    }

    setupMidnightWatcher() {
        const now = new Date();
        const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const msToMidnight = tonight - now;

        // Pasang timer untuk tepat jam 00:00
        setTimeout(() => {
            console.log("[System] Pergantian hari terdeteksi. Mereset pelacak tanggal...");
            
            // 1. Reset pelacak agar pesan berikutnya memicu penanda baru
            this.lastRenderedDate = null; 

            // 2. (Opsional) Jika ingin penanda "Hari Ini" muncul tanpa menunggu pesan masuk:
            this.insertDateSeparator(Date.now());
            this.lastRenderedDate = new Date().toDateString();

            // 3. Pasang kembali watcher untuk besok malam
            this.setupMidnightWatcher();
        }, msToMidnight);
    }

    renderChatList() {
        const listContainer = document.getElementById('chat-list-container');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        Object.entries(this.rooms).forEach(([id, room]) => {
            const roomName = room.name.toLowerCase();
            const query = this.searchQuery.toLowerCase();
            if (!roomName.includes(query)) return;
            const li = document.createElement('li');
            const isActive = this.currentRoomId.startsWith(id);
            li.className = `chat-item ${isActive ? 'active' : ''}`;
            li.innerHTML = `
                <div class="chat-item-icon">
                    <i class="fas ${room.icon}"></i>
                </div>
                <div class="chat-item-info">
                    <div class="chat-item-title">${room.name}</div>
                    <div class="chat-item-preview">${this.getRoomPreview(id)}</div>
                </div>
                ${id === 'concierge' ? '<span class="private-badge">PRIVATE</span>' : ''}
            `;
            li.onclick = () => this.switchRoom(id);
            listContainer.appendChild(li);
        });

        // Tampilkan pesan jika tidak ada hasil
        if (listContainer.innerHTML === '') {
            listContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Percakapan tidak ditemukan</p>
                </div>`;
        }
    }

    getRoomPreview(roomId) {
        // Anda bisa mengembangkan ini untuk mengambil pesan terakhir dari DB per room
        const previews = {
            'announcements': 'Informasi resmi dari SajiLe...',
            'events': 'Jadwal event eksklusif...',
            'general_lounge': 'Ngobrol santai antar Chef...',
            'concierge': 'Hubungi tim bantuan kami.'
        };
        return previews[roomId] || 'Klik untuk melihat pesan';
    }

    // ==========================================
    // LOGIKA PERPINDAHAN RUANGAN (SWITCH ROOM)
    // ==========================================

    async switchRoom(roomId) {
        const actualRoomId = this.getActualRoomId(roomId);
        if (this.currentRoomId === actualRoomId) return;

        this.socket.emit('leaveRoom', this.currentRoomId);
        this.currentRoomId = actualRoomId;

        // RESET KRITIKAL: Bersihkan tracker tanggal agar tidak terbawa ke room baru
        this.lastRenderedDate = null;
        this.lastRenderedBatchId = null; // Reset tracker batch juga

        const room = this.rooms[roomId];
        const headerTitle = document.getElementById('active-room-name');
        if (headerTitle) headerTitle.textContent = room.name;
        
        document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
        this.renderChatList();

        // Tampilkan Loader
        this.messagesContainer.innerHTML = `
            <div class="chat-loader-container">
                <div class="chat-luxury-spinner">
                    <div class="gold-ring"></div>
                    <img src="../assets/sajile_icon.jpg" class="logo-mini" alt="SajiLe">
                </div>
                <div class="loader-text">Menyajikan Pesan...</div>
            </div>`;
        
        this.socket.emit('joinRoom', actualRoomId);
        await this.loadChatHistory(actualRoomId);
    }

    formatRank(rank) {
        const ranks = {
            'legend_eternal': 'Eternal Legend',
            'legend_year': 'Mastery Year',
            'starter_taster': 'Taster (Guest)'
        };
        return ranks[rank] || 'Member';
    }

    // ========================
    // 3. EVENT LISTENERS
    // ========================
    setupEventListeners() {
        const searchInput = document.querySelector('.glass-search input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.renderChatList(); // Gambar ulang daftar setiap kali user mengetik
            });
        }

        const voiceCallBtn = document.getElementById('make-voice-call');
        const videoCallBtn = document.getElementById('make-video-call');

        if (voiceCallBtn) {
            voiceCallBtn.onclick = () => this.initiateCall('voice');
        }
        if (videoCallBtn) {
            videoCallBtn.onclick = () => this.initiateCall('video');
        }

        // Di dalam setupEventListeners()
        const toggleMicBtn = document.getElementById('toggle-mic');
        const toggleCamBtn = document.getElementById('toggle-camera');

        if (toggleMicBtn) {
            toggleMicBtn.onclick = () => this.toggleMic();
        }
        if (toggleCamBtn) {
            toggleCamBtn.onclick = () => this.toggleCamera();
        }

        // SESUAIKAN ID dengan HTML
        const terminateBtn = document.getElementById('terminate-call'); 
        if (terminateBtn) {
            terminateBtn.onclick = () => this.terminateCall();
        }

        // Listener untuk Panggilan Masuk
        this.socket.on('incoming-call', async (data) => {
            this.handleIncomingCall(data);
        });

        // Listener untuk Sinyal WebRTC (SDP & ICE)
        this.socket.on('webrtc-signal', async (data) => {
            this.handleWebRTCSignal(data);
        });

        this.socket.on('user-left-call', (userId) => {
            this.removeRemoteVideo(userId);
        });
        
        const fileInput = document.getElementById('media-upload-input');
        const attachBtn = document.querySelector('.attach-btn');

        if (attachBtn && fileInput) {
            attachBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                // Ambil semua file yang dipilih
                const files = Array.from(e.target.files);
                this.handleMultipleFiles(files);
                fileInput.value = ''; // Reset input agar bisa pilih file yang sama lagi
            };
        }

        const emojiBtn = document.querySelector('.emoji-btn');
        const pickerContainer = document.getElementById('emoji-picker-container');

        if (emojiBtn && pickerContainer) {
            // Inisialisasi diam-diam setelah UI utama siap (bukan nunggu diklik)
            setTimeout(() => this.initEmojiPicker(), 2000); 

            emojiBtn.onclick = (e) => {
                e.stopPropagation();
                pickerContainer.classList.toggle('hidden');
                // Fokus ke search bar emoji mart agar user bisa langsung ngetik
                if (!pickerContainer.classList.contains('hidden')) {
                    const searchInput = pickerContainer.querySelector('em-emoji-picker')?.shadowRoot?.querySelector('input');
                    searchInput?.focus();
                }
            };
        }

        // Tutup picker jika klik di luar (Global Listener)
        document.addEventListener('click', (e) => {
            if (!pickerContainer.contains(e.target) && !emojiBtn.contains(e.target)) {
                pickerContainer.classList.add('hidden');
            }
        });

        // Send Button Click
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.onclick = () => this.handleSendMessage();
        }
        
        // Enter Key to Send
        if (this.input) {
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });

            // Auto Resize Textarea
            this.input.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }

        // Tambahkan ini di dalam setupEventListeners()
        document.addEventListener('click', (e) => {
            // Jika yang diklik BUKAN bagian dari .message-options, tutup semua menu
            if (!e.target.closest('.message-options')) {
                document.querySelectorAll('.message-action-popup').forEach(el => el.classList.add('hidden'));
            }
        });

        const infoBtn = document.getElementById('toggle-info'); // Pastikan ID ini ada di tombol header
        const infoPanel = document.getElementById('info-panel');
        const closeInfo = document.getElementById('close-info');

        if (infoBtn && infoPanel) {
            infoBtn.addEventListener('click', () => infoPanel.classList.toggle('active'));
        }
        if (closeInfo) {
            closeInfo.addEventListener('click', () => infoPanel.classList.remove('active'));
        }

        // Navigation & Sidebar Toggles
        this.setupNavigationListeners();
    }

    setupNavigationListeners() {
        // Sidebar & Info Panel Toggle Logic
        const sidebar = document.getElementById('sidebar');
        const infoPanel = document.getElementById('info-panel');

        document.getElementById('toggle-sidebar').onclick = () => sidebar?.classList.add('active');
        document.getElementById('close-sidebar').onclick = () => sidebar?.classList.remove('active');
        
        document.getElementById('toggle-info').onclick = () => {
            if (window.innerWidth <= 1024) {
                infoPanel?.classList.toggle('active');
            } else {
                const appLayout = document.querySelector('.app-layout');
                const isHidden = infoPanel.style.display === 'none';
                infoPanel.style.display = isHidden ? 'flex' : 'none';
                if(appLayout) appLayout.style.gridTemplateColumns = isHidden ? '320px 1fr 300px' : '320px 1fr 0px';
            }
        };

        // Logout
        document.getElementById('logout-btn').onclick = () => {
            Swal.fire({
                title: 'Keluar Lounge?',
                text: "Anda akan kembali ke halaman utama.",
                icon: 'question',
                background: '#121212',
                color: '#fff',
                showCancelButton: true,
                confirmButtonColor: '#d4af37',
                confirmButtonText: 'Ya, Keluar'
            }).then((result) => {
                if (result.isConfirmed) window.location.href = '../index.html';
            });
        };
    }

    // --- LOGIKA UTAMA PANGGILAN ---
    async initiateCall(type) {
        const callInterface = document.getElementById('call-interface');
        const videoGrid = document.getElementById('video-grid');
        const localVideoEl = document.getElementById('local-video');
        const timerDisplay = document.getElementById('call-duration'); // Pastikan ID ini ada di HTML

        if (!callInterface || !videoGrid) {
            console.error("UI Panggilan tidak ditemukan!");
            return;
        }

        // 1. Bersihkan grid sepenuhnya setiap kali panggilan baru dimulai
        videoGrid.innerHTML = '';

        callInterface.classList.remove('hidden');
        this.isCallActive = true;

        // --- SINKRONISASI STATUS AWAL ---
        // Jika type adalah 'voice', maka kamera otomatis nonaktif sejak awal
        this.isCamActive = (type === 'video');
        this.isMicActive = true; // Mic biasanya aktif default di kedua tipe

        // Update UI Button secara instan agar sinkron
        this.updateCallUIButtons();
        
        try {
            // Ambil Stream sesuai tipe
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: this.isCamActive, // Gunakan variabel status
                audio: this.isMicActive
            });

            // Buat Kartu Lokal
            const localVideoEl = this.createCallCard(
                this.user.id, 
                this.user.username, 
                this.user.profilePictureUrl, 
                this.isCamActive, // Sinkronkan dengan tampilan video/avatar
                true
            );

            if (this.isCamActive && localVideoEl) {
                localVideoEl.srcObject = this.localStream;
            }

            this.startCallTimer(timerDisplay);

            this.socket.emit('start-group-call', {
                roomId: this.currentRoomId,
                type: type
            });

        } catch (err) {
            console.error("Akses media gagal:", err);
            Swal.fire('Gagal', 'Tidak dapat mengakses kamera/mikrofon', 'error');
            this.terminateCall();
        }
    }

    createCallCard(userId, userName, userAvatar, isVideo = true, isLocal = false) {
        const videoGrid = document.getElementById('video-grid');
        if (!videoGrid) return;

        if (document.getElementById(`card-${userId}`)) return;

        const card = document.createElement('div');
        card.id = `card-${userId}`;
        // Gunakan class video-box untuk konsistensi layout grid
        card.className = 'video-box'; 
        if (isLocal) card.classList.add('local-video');

        // Layer 1: Avatar Placeholder (Selalu ada di belakang video)
        const avatarWrapper = document.createElement('div');
        avatarWrapper.className = 'avatar-placeholder';
        avatarWrapper.innerHTML = `
            <img src="${userAvatar || '../assets/sajile_icon.jpg'}" 
                onerror="this.src='../assets/sajile_icon.jpg'" 
                class="call-avatar-img">
        `;
        card.appendChild(avatarWrapper);

        // Layer 2: Video Element
        const video = document.createElement('video');
        video.id = isLocal ? 'local-video' : `remote-video-${userId}`;
        video.autoplay = true;
        video.playsInline = true;
        if (isLocal) video.muted = true;
        
        // Jika panggilan suara (bukan video), sembunyikan elemen video
        if (!isVideo) video.classList.add('hidden');
        
        card.appendChild(video);

        // Layer 3: Label Nama
        const label = document.createElement('div');
        label.className = 'user-label';
        label.innerHTML = `<i class="fas fa-circle status-dot"></i> ${isLocal ? 'Anda' : userName}`;
        card.appendChild(label);

        videoGrid.appendChild(card);
        return isLocal ? video : video; 
    }

    updateCallUIButtons() {
        const micBtn = document.getElementById('toggle-mic');
        const camBtn = document.getElementById('toggle-camera');

        if (micBtn) {
            micBtn.innerHTML = this.isMicActive ? 
                '<i class="fas fa-microphone"></i>' : 
                '<i class="fas fa-microphone-slash"></i>';
            micBtn.style.color = this.isMicActive ? '' : '#e74c3c';
        }

        if (camBtn) {
            camBtn.innerHTML = this.isCamActive ? 
                '<i class="fas fa-video"></i>' : 
                '<i class="fas fa-video-slash"></i>';
            camBtn.style.color = this.isCamActive ? '' : '#e74c3c';
        }
    }

    // Logika Timer 00:00
    startCallTimer(displayElement) {
        this.stopCallTimer(); // Reset jika ada timer lama
        this.callStartTime = Date.now();
        
        this.callTimer = setInterval(() => {
            const now = Date.now();
            const diff = Math.floor((now - this.callStartTime) / 1000);
            
            const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
            const seconds = (diff % 60).toString().padStart(2, '0');
            
            if (displayElement) {
                displayElement.textContent = `${minutes}:${seconds}`;
            }
        }, 1000);
    }

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
        const timerDisplay = document.getElementById('call-duration');
        if (timerDisplay) timerDisplay.textContent = "00:00";
    }

    async toggleMic() {
        if (!this.localStream) return;

        this.isMicActive = !this.isMicActive;
        
        if (this.isMicActive) {
            // Jika dinyalakan kembali, kita harus ambil stream audio baru
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const newTrack = newStream.getAudioTracks()[0];
            
            // Ganti track lama di localStream
            this.localStream.getAudioTracks().forEach(track => {
                track.stop();
                this.localStream.removeTrack(track);
            });
            this.localStream.addTrack(newTrack);

            // Beritahu semua koneksi peer untuk mengganti track audio mereka (Penting untuk WebRTC)
            Object.values(this.peers).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track.kind === 'audio');
                if (sender) sender.replaceTrack(newTrack);
            });
        } else {
            // Benar-benar matikan akses hardware
            this.localStream.getAudioTracks().forEach(track => track.stop());
        }

        // Cukup panggil helper untuk update icon dan warna
        this.updateCallUIButtons();
    }

    async toggleCamera() {
        if (!this.localStream) return;

        this.isCamActive = !this.isCamActive;

        if (this.isCamActive) {
            // Ambil akses hardware kamera kembali
            const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const newTrack = newStream.getVideoTracks()[0];

            this.localStream.getVideoTracks().forEach(track => {
                track.stop();
                this.localStream.removeTrack(track);
            });
            this.localStream.addTrack(newTrack);

            // Update tampilan video lokal
            const localVideoEl = document.getElementById('local-video');
            if (localVideoEl) {
                localVideoEl.srcObject = this.localStream;
                localVideoEl.classList.remove('hidden');
            }

            // Update track di sisi lawan bicara (WebRTC)
            Object.values(this.peers).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track.kind === 'video');
                if (sender) sender.replaceTrack(newTrack);
            });
        } else {
            // BENAR-BENAR MATIKAN: Lampu kamera akan mati
            this.localStream.getVideoTracks().forEach(track => track.stop());
            
            const localVideoEl = document.getElementById('local-video');
            if (localVideoEl) localVideoEl.classList.add('hidden');
        }

        // Cukup panggil helper untuk update icon dan warna
        this.updateCallUIButtons();
    }

    handleIncomingCall(data) {
        const toast = document.getElementById('incoming-call-toast');
        document.getElementById('incoming-caller-name').textContent = data.callerName;
        toast.classList.remove('hidden');

        document.getElementById('accept-call').onclick = async () => {
            toast.classList.add('hidden');
            await this.initiateCall(data.type);
        };
        document.getElementById('reject-call').onclick = () => toast.classList.add('hidden');
    }

    // Logika Pertukaran Sinyal (Standard WebRTC)
    async handleWebRTCSignal(data) {
        const { from, signal } = data;

        if (signal.sdp) {
            let pc = this.getOrCreatePeer(from);
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            if (signal.sdp.type === 'offer') {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.socket.emit('webrtc-signal', { to: from, signal: { sdp: pc.localDescription } });
            }
        } else if (signal.candidate) {
            let pc = this.getOrCreatePeer(from);
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    }

    getOrCreatePeer(userId) {
        if (this.peers[userId]) return this.peers[userId];

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // Tambahkan track lokal ke koneksi baru
        this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('webrtc-signal', { to: userId, signal: { candidate: event.candidate } });
            }
        };

        pc.ontrack = (event) => {
            this.renderRemoteVideo(userId, event.streams[0]);
        };

        this.peers[userId] = pc;
        return pc;
    }

    renderRemoteVideo(userId, stream) {
        // Cek apakah kartu untuk user ini sudah ada
        if (document.getElementById(`card-${userId}`)) {
            const videoEl = document.getElementById(`remote-video-${userId}`);
            if (videoEl && videoEl.srcObject !== stream) {
                videoEl.srcObject = stream;
            }
            return;
        }

        /**
         * Menggunakan createCallCard untuk konsistensi UI.
         * parameter: userId, userName, userAvatar, isVideo, isLocal
         * Catatan: Untuk 'Chef Partner' & avatar default, 
         * ini akan diperbarui otomatis saat data user sinkron via socket.
         */
        this.createCallCard(userId, "Chef Partner", "../assets/sajile_icon.jpg", true, false);
        
        const videoEl = document.getElementById(`remote-video-${userId}`);
        if (videoEl) {
            videoEl.srcObject = stream;
        }
    }

    removeRemoteVideo(userId) {
        // 1. Hapus elemen video dari grid
        const videoCard = document.getElementById(`card-${userId}`);
        if (videoCard) {
            videoCard.remove();
        }

        // 2. Tutup koneksi peer jika ada
        if (this.peers[userId]) {
            this.peers[userId].close();
            delete this.peers[userId];
        }

        // 3. Jika tidak ada lagi remote video (hanya sisa lokal), bisa opsional matikan interface
        // const remoteVideos = document.querySelectorAll('.video-box:not(.local-video)');
        // if (remoteVideos.length === 0) this.terminateCall(); 
    }

    terminateCall() {
        // 1. Matikan Track Media
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // 2. Tutup Semua Peer Connection
        Object.values(this.peers).forEach(pc => pc.close());
        this.peers = {};

        // 3. Reset Timer
        this.stopCallTimer();

        // 4. Bersihkan UI
        // Bersihkan semua kartu dan tutup interface
        const videoGrid = document.getElementById('video-grid');
        if (videoGrid) videoGrid.innerHTML = '';
        
        const callInterface = document.getElementById('call-interface');
        if (callInterface) callInterface.classList.add('hidden');

        this.isCallActive = false;
        this.stopCallTimer();

        // Reset status hardware ke default
        this.isMicActive = true;
        this.isCamActive = true;

        // Reset Icon di UI ke semula
        const micBtn = document.getElementById('toggle-mic');
        const camBtn = document.getElementById('toggle-camera');
        if(micBtn) {
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            micBtn.style.color = '';
        }
        if(camBtn) {
            camBtn.innerHTML = '<i class="fas fa-video"></i>';
            camBtn.style.color = '';
        }

        this.socket.emit('leave-call', { roomId: this.currentRoomId });
    }

    // ==========================================
    // LOGIKA RENDER PESAN (CORE)
    // ==========================================

    renderMessage(data, isHistory = false) {
        try {
            const msgTimestamp = data.timestamp || Date.now();
            const msgDateObject = new Date(msgTimestamp);
            const msgDateString = msgDateObject.toDateString();

            // 1. Logika Date Separator
            if (!isHistory && msgDateString !== this.lastRenderedDate) {
                this.insertDateSeparator(msgTimestamp);
                this.lastRenderedDate = msgDateString;
                // Jika tanggal ganti, batch harus putus
                this.lastRenderedBatchId = null; 
            }

            const { text, time, isMe, type, mediaUrls, attachments, spreadBatchId } = data;
            const msgId = data.id || data._id;
            // === DEBUG START ===
            if (spreadBatchId) {
                console.groupCollapsed(`[Render] Msg ID: ${data.id || data._id}`);
                console.log("Current Batch ID:", spreadBatchId);
                console.log("Last Rendered Batch:", this.lastRenderedBatchId);
                console.log("Is Continuation?", spreadBatchId === this.lastRenderedBatchId);
                console.log("Parent Message Data:", data.parentMessage); // Cek apakah ini Objek atau String ID
                console.groupEnd();
            }
            // === DEBUG END ===

            // =======================
            // BUILD MEDIA HTML (WAJIB DI ATAS)
            // =======================
            let mediaHtml = '';

            // --- RENDER LOGIC (Images/Docs) --- 
            // (Kode bagian mediaHtml SAMA SEPERTI SEBELUMNYA, tidak perlu diubah)
            if (type === 'image_group' && mediaUrls) {
                const count = mediaUrls.length;
                const displayCount = Math.min(count, 4);
                const gridClass = `grid-${displayCount}`;
                const resolvedUrls = mediaUrls.map(u => this.resolveUrl(u));
                const urlsParam = encodeURIComponent(JSON.stringify(resolvedUrls));
                mediaHtml = `<div class="media-grid-container ${gridClass}">`;
                for (let i = 0; i < displayCount; i++) {
                    const isLast = i === 3 && count > 4;
                    mediaHtml += `<div class="media-grid-item" onclick="window.app.openGallery('${urlsParam}', ${i})"><img src="${resolvedUrls[i]}" loading="eager">${isLast ? `<div class="more-overlay">+${count - 3}</div>` : ''}</div>`;
                }
                mediaHtml += `</div>`;
            } else if (type === 'doc_group' && attachments) {
                mediaHtml = `<div class="attachment-list">`;
                attachments.forEach(file => {
                    const fullUrl = this.resolveUrl(file.url);
                    const isAudio = file.fileName.match(/\.(mp3|wav|ogg|m4a|webm)$/i);
                    const isVideo = file.fileName.match(/\.(mp4|mov|avi|webm|mkv)$/i);
                    let icon = isAudio ? 'fa-play-circle' : (isVideo ? 'fa-video' : 'fa-file-alt');
                    let action = (isAudio || isVideo) ? `window.app.openMedia('${fullUrl}', '${isAudio?'audio':'video'}', this)` : `window.open('${fullUrl}')`;
                    mediaHtml += `<div class="file-bubble-container"><div class="file-bubble" onclick="${action}"><i class="fas ${icon} gold-icon"></i><div class="file-info-text"><span class="file-name">${file.fileName}</span><span class="file-size">${file.fileSize || 'Dokumen'}</span></div></div></div>`;
                });
                mediaHtml += `</div>`;
            }

            const contentText = text ? `<div class="msg-text" id="msg-content-${msgId}">${text}</div>` : '';
            const editedMark = data.isEdited ? `<span class="edited-mark">(diedit)</span>` : '';

            // =======================
            // BUILD REPLY HTML (WAJIB DI ATAS)
            // =======================
            let replyHtml = '';

            // Validasi: Pastikan parentMessage ada DAN berbentuk Objek (sudah di-populate)
            if (data.parentMessage && typeof data.parentMessage === 'object') {
                const p = data.parentMessage;
                // Fallback yang aman jika sender sudah dihapus user-nya
                const pSender = p.sender?.username || p.senderName || 'Unknown Chef'; 
                
                let replyIcons = '';
                let replyPreview = '';
                let thumbHtml = '';

                // Logika Preview Gambar
                if (p.messageType === 'image_group') {
                    const imgs = p.mediaUrls || [];
                    replyIcons = `<i class="fas fa-image gold-icon"></i> <span class="reply-multiplier">x${imgs.length}</span>`;
                    replyPreview = p.content ? p.content.substring(0, 40) + (p.content.length > 40 ? '...' : '') : 'Gambar';
                    
                    if (imgs.length) {
                        thumbHtml = `
                            <div class="reply-image-strip">
                                ${imgs.map(u => `<img src="${this.resolveUrl(u)}" class="reply-image-thumb" loading="lazy">`).join('')}
                            </div>`;
                    }
                }

                // Logika Preview Dokumen
                else if (p.messageType === 'doc_group' && Array.isArray(p.attachments)) {
                    // ... (Kode logika counter dokumen Anda tetap sama, paste di sini) ...
                    const c = { audio: 0, video: 0, doc: 0 };
                    p.attachments.forEach(f => {
                        if (/\.(mp3|wav|ogg|m4a|webm)$/i.test(f.fileName)) c.audio++;
                        else if (/\.(mp4|mov|avi|webm|mkv)$/i.test(f.fileName)) c.video++;
                        else c.doc++;
                    });
                    // ... (Susun icon c.video, c.audio, dll seperti kode lama) ...
                    if (c.video) replyIcons += `<i class="fas fa-video gold-icon"></i><span class="reply-multiplier">x${c.video}</span>`;
                    if (c.audio) replyIcons += `<i class="fas fa-play-circle gold-icon"></i><span class="reply-multiplier">x${c.audio}</span>`;
                    if (c.doc) replyIcons += `<i class="fas fa-file-alt gold-icon"></i><span class="reply-multiplier">x${c.doc}</span>`;

                    replyPreview = p.content ? p.content : 'Lampiran';
                }

                // Logika Preview Teks Biasa
            else {
                replyPreview = p.content ? p.content.substring(0, 50) + "..." : 'Pesan';
            }

            replyHtml = `
                <div class="msg-reply-bubble">
                    <div class="reply-bar"></div>
                    <div class="reply-content">
                        <small class="gold-text">${pSender}</small>
                        <div class="reply-inline">
                            ${replyIcons}
                            <span>${replyPreview}</span>
                        </div>
                        ${thumbHtml}
                    </div>
                </div>`;
            }

            // 2. Logika Grouping Visual (Family Batch) - DIPERBAIKI
            // Syarat batching:
            // a. Punya spreadBatchId valid
            // b. Sama dengan pesan sebelumnya
            // c. Pengirimnya SAMA (Penting! Agar tidak gabung dengan balasan orang lain di tengah jalan)
            
            const isBatch = Boolean(spreadBatchId);
            const isBatchContinuation = isBatch && spreadBatchId === this.lastRenderedBatchId;

            const displaySender = (data.sender && data.sender.username) ? data.sender.username : (data.senderName || "Unknown Chef");
            const displayEmail = (data.sender && data.sender.email) ? data.sender.email : (data.email || "");

            if (isBatchContinuation) {
                const lastRow = this.messagesContainer.lastElementChild;
                const lastBubble = lastRow?.querySelector('.msg-bubble');

                if (lastBubble) {
                    // 1. Ambil meta lama (jam + read receipt)
                    const meta = lastBubble.querySelector('.msg-meta');
                    if (meta) meta.remove();

                    // 2. Tambahkan batch item
                    lastBubble.insertAdjacentHTML('beforeend', `
                        <div class="batch-item">
                            ${replyHtml}
                            ${text ? `<div class="msg-text">${text}</div>` : ''}
                            ${mediaHtml}
                        </div>
                    `);

                    // 3. PASANG ULANG META DI PALING BAWAH
                    lastBubble.insertAdjacentHTML('beforeend', `
                        <div class="msg-meta">
                            ${data.isEdited ? `<span class="edited-mark">(diedit)</span>` : ''}
                            <span class="time">${time}</span>
                            ${isMe ? '<i class="fas fa-check-double read-receipt read"></i>' : ''}
                        </div>
                    `);

                    this.lastRenderedBatchId = spreadBatchId;
                    return;
                }
            }

            // 3. Buat Container Utama
            const div = document.createElement('div');
            let batchClass = '';

            if (isBatch) {
                batchClass = isBatchContinuation ? 'batch-continue' : 'batch-start';
            }

            div.className = `msg-row ${isMe ? 'me' : 'others'} message-card ${batchClass}`;

            if (msgId) {
                div.id = `msg-row-${msgId}`;
                div.setAttribute('data-id', msgId);
            }
            
            const dateGroupId = `sep-${msgDateObject.getFullYear()}-${msgDateObject.getMonth() + 1}-${msgDateObject.getDate()}`;
            div.setAttribute('data-parent-group', dateGroupId);

            /*// --- LOGIKA TOMBOL OPSI (TITIK TIGA) ---
            let optionsHtml = '';
            if (msgId) {
                // Hitung selisih waktu untuk fitur Edit
                const diffMinutes = (Date.now() - new Date(msgTimestamp).getTime()) / 1000 / 60;
                const canEdit = isMe && diffMinutes < 30;

                optionsHtml = `
                <div class="message-options">
                    <button class="menu-trigger" onclick="app.toggleMessageMenu('${msgId}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    
                    <div id="menu-${msgId}" class="message-action-popup hidden">
                        <div class="menu-item" onclick="app.initiateReply('${msgId}')">
                            <i class="fas fa-reply"></i> Balas
                        </div>

                        ${text ? `
                            <div class="menu-item" onclick="app.copyMessage('${msgId}')">
                                <i class="fas fa-copy"></i> Salin Teks
                            </div>
                        ` : ''}

                        <div class="menu-item" onclick="app.triggerSpreadFromMenu('${msgId}')">
                            <i class="fas fa-share"></i> Sebarkan
                        </div>

                        ${canEdit ? `
                            <div class="menu-item" onclick="app.editMessage('${msgId}')">
                                <i class="fas fa-pen"></i> Edit
                            </div>
                        ` : ''}

                        ${isMe ? `
                            <div class="menu-item delete" onclick="app.deleteMessage('${msgId}')">
                                <i class="fas fa-trash"></i> Hapus
                            </div>
                        ` : ''}
                    </div>
                </div>`;
            }

            // --- STRUKTUR BUBBLE BARU ---
            div.innerHTML = `
                <div class="msg-bubble">
                    <div class="message-header">
                        <div class="sender-info">
                            <span class="sender-label">${isMe ? 'Anda' : displaySender}</span>
                            ${displayEmail ? `<span class="sender-email-tag">${displayEmail}</span>` : ''}
                        </div>
                        ${optionsHtml}
                    </div>

                    ${replyHtml}
                    ${contentText}
                    ${mediaHtml}
                    
                    <div class="msg-meta">
                        ${editedMark}
                        <span class="time">${time}</span>
                        ${isMe ? '<i class="fas fa-check-double read-receipt read"></i>' : ''}
                    </div>
                </div>
            `;*/

            // --- MODIFIKASI HEADER ---
            // Jika ini adalah lanjutan batch (message ke-2, ke-3 dst dalam satu keluarga),
            // KITA SEMBUNYIKAN HEADER (Nama & Avatar) agar terlihat menyatu.
            let headerHtml = '';
            
            if (!isBatchContinuation) {
                // Hanya render header jika ini pesan PERTAMA dalam keluarga (batch-start)
                // Atau pesan biasa tanpa batch
                
                // ... (Logika Options Menu tetap sama) ...
                // Pindahkan logika optionsHtml ke sini
                
                let optionsHtml = '';
                if (msgId) {
                    // ... (Copy logika optionsHtml Anda yang lama ke sini) ...
                    // Code optionsHtml button titik tiga...
                    const diffMinutes = (Date.now() - new Date(data.timestamp).getTime()) / 1000 / 60;
                    const canEdit = isMe && diffMinutes < 30;
                    
                    optionsHtml = `
                        <div class="message-options">
                            <button class="menu-trigger" onclick="app.toggleMessageMenu('${msgId}')">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div id="menu-${msgId}" class="message-action-popup hidden">
                                <div class="menu-item" onclick="app.initiateReply('${msgId}')"><i class="fas fa-reply"></i> Balas</div>
                                ${text ? `<div class="menu-item" onclick="app.copyMessage('${msgId}')"><i class="fas fa-copy"></i> Salin</div>` : ''}
                                <div class="menu-item" onclick="app.triggerSpreadFromMenu('${msgId}')"><i class="fas fa-share"></i> Sebarkan</div>
                                ${isMe ? `<div class="menu-item delete" onclick="app.deleteMessage('${msgId}')"><i class="fas fa-trash"></i> Hapus</div>` : ''}
                            </div>
                        </div>`;
                }

                const displaySender = (data.sender && data.sender.username) ? data.sender.username : (data.senderName || "Unknown Chef");
                const displayEmail = (data.sender && data.sender.email) ? data.sender.email : (data.email || "");

                headerHtml = `
                    <div class="message-header">
                        <div class="sender-info">
                            <span class="sender-label">${isMe ? 'Anda' : displaySender}</span>
                            ${displayEmail ? `<span class="sender-email-tag">${displayEmail}</span>` : ''}
                        </div>
                        ${optionsHtml}
                    </div>`;
            } else {
                headerHtml = ''; // ❗ BENAR-BENAR KOSONG
            }

            console.log(
                '[BATCH]',
                data.spreadBatchId,
                'last:',
                this.lastRenderedBatchId,
                '=>',
                isBatchContinuation
            );

            // --- UPDATE STRUKTUR BUBBLE HTML ---
            div.innerHTML = `
                <div class="msg-bubble">
                    ${headerHtml}
                    ${replyHtml ? replyHtml : ''}
                    ${text ? `<div class="msg-text" id="msg-content-${msgId}">${text}</div>` : ''}
                    ${mediaHtml}
                    
                    <div class="msg-meta">
                        ${data.isEdited ? `<span class="edited-mark">(diedit)</span>` : ''}
                        <span class="time">${time}</span>
                        ${isMe ? '<i class="fas fa-check-double read-receipt read"></i>' : ''}
                    </div>
                </div>
            `;

            this.messageMap = this.messageMap || {};
            this.messageMap[msgId] = data;
            this.messagesContainer.appendChild(div);

            // UPDATE STATE DI SINI (BENAR)
            if (isBatch) {
                this.lastRenderedBatchId = spreadBatchId;
            } else {
                this.lastRenderedBatchId = null;
            }

            // --- TAMBAHAN KHUSUS SCROLL ---
            // Cek apakah di dalam div (kartu pesan) ada gambar
            const imagesInCard = div.querySelectorAll('img');

            if (imagesInCard.length > 0) {
                // Jika ada gambar, tunggu load baru scroll
                let loadedCount = 0;
                imagesInCard.forEach(img => {
                    img.addEventListener('load', () => {
                        loadedCount++;
                        if (loadedCount === imagesInCard.length && !isHistory) {
                            this.scrollToBottom(); // Scroll saat semua gambar di kartu ini siap
                        }
                    });
                    // Handle case gambar sudah di-cache browser
                    if (img.complete) img.dispatchEvent(new Event('load'));
                });
            } else {
                // Jika hanya teks, langsung scroll
                if (!isHistory) this.scrollToBottom();
            }
            if (!isHistory) this.scrollToBottom();
            this.updateInfoPanel(data, isHistory);

        } catch (err) {
            console.error("[Render] Gagal merender pesan:", err);
        }
    }

    // Tambahan fungsi untuk buka galeri (Mockup)
    // Ganti fungsi openGallery lama dengan ini
    openGallery(encodedUrls, selectedIndex = 0) {
        const urls = JSON.parse(decodeURIComponent(encodedUrls));
        this.currentGallery = urls;
        
        // PERBAIKAN: Gunakan index yang diklik pengguna, bukan selalu 0
        this.currentIndex = selectedIndex;

        const overlay = document.getElementById('photo-viewer-overlay');
        overlay.classList.remove('hidden');
        
        this.renderThumbnailsOnce(); 

        requestAnimationFrame(() => {
            this.updateViewerUI(); 
        });

        // Event listener penutup & navigasi (Tetap sama)
        document.getElementById('viewer-close').onclick = () => overlay.classList.add('hidden');
        document.getElementById('next-photo').onclick = () => this.navigateGallery(1);
        document.getElementById('prev-photo').onclick = () => this.navigateGallery(-1);
        
        document.onkeydown = (e) => {
            if (overlay.classList.contains('hidden')) return;
            if (e.key === "Escape") overlay.classList.add('hidden');
            if (e.key === "ArrowRight") this.navigateGallery(1);
            if (e.key === "ArrowLeft") this.navigateGallery(-1);
        };
    }

    // 1. Tambahkan fungsi khusus untuk membuat thumbnail satu kali saja
    renderThumbnailsOnce() {
        const thumbContainer = document.getElementById('viewer-thumbnails');
        thumbContainer.innerHTML = this.currentGallery.map((url, idx) => `
            <img src="${url}" class="thumb-item" 
                onclick="window.app.jumpToImage(${idx})">
        `).join('');
    }

    updateViewerUI() {
        const imgDisplay = document.getElementById('active-full-img');
        const thumbContainer = document.getElementById('viewer-thumbnails');
        const fileNameDisplay = document.getElementById('viewer-filename');
        const currentUrl = this.currentGallery[this.currentIndex];

        // 1. Animasi Transisi Gambar Utama (Fullscreen)
        // Tambahkan class 'changing' untuk memulai fade-out
        imgDisplay.classList.add('changing');

        // Tunggu durasi transisi keluar selesai sebelum ganti SRC
        setTimeout(() => {
            imgDisplay.src = currentUrl;
            
            // Hapus class 'changing' setelah gambar baru mulai dimuat agar fade-in
            imgDisplay.onload = () => {
                imgDisplay.classList.remove('changing');
            };
            
            // Fallback jika onload tidak terpicu (misal gambar sudah di-cache)
            if (imgDisplay.complete) {
                imgDisplay.classList.remove('changing');
            }
        }, 150); 

        // 2. Kelola Class Active pada Thumbnail (Transisi CSS variabel)
        const allThumbs = thumbContainer.querySelectorAll('.thumb-item');
        allThumbs.forEach((thumb, idx) => {
            if (idx === this.currentIndex) {
                // Ini akan memicu transisi transform/opacity/border-color di CSS Anda
                thumb.classList.add('active');
                
                // Scroll otomatis agar thumbnail yang aktif tetap terlihat di strip
                thumb.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest', 
                    inline: 'center' 
                });
            } else {
                thumb.classList.remove('active');
            }
        });

        // 3. Update Nama File di Header
        if (fileNameDisplay) {
            const fileName = currentUrl.split('/').pop().split('?')[0]; 
            fileNameDisplay.textContent = decodeURIComponent(fileName);
        }

        // 4. Update Fungsi Download
        document.getElementById('viewer-download').onclick = (e) => {
            e.preventDefault();
            const link = document.createElement('a');
            link.href = currentUrl;
            link.download = `SajiLe_Gallery_${this.currentIndex + 1}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }


    navigateGallery(step) {
        this.currentIndex = (this.currentIndex + step + this.currentGallery.length) % this.currentGallery.length;
        this.updateViewerUI();
    }

    jumpToImage(index) {
        this.currentIndex = index;
        this.updateViewerUI();
    }

    // Fungsi untuk membuka Media (Video/Audio) dengan Autoplay & Loader
    // Update fungsi openMedia dengan parameter targetEl
    openMedia(url, type, targetEl) {
        const parentBubble = targetEl.closest('.msg-bubble');
        
        // Filter hanya media dengan tipe yang sama di dalam bubble tersebut
        const sameTypeMedia = Array.from(parentBubble.querySelectorAll(`.file-bubble[onclick*="'${type}'"]`));
        
        this.currentMediaGallery = sameTypeMedia.map(el => {
            const onclickAttr = el.getAttribute('onclick');
            const match = onclickAttr.match(/'([^']+)',\s*'([^']+)'/);
            return {
                url: match[1],
                type: match[2],
                fileName: el.querySelector('.file-name').textContent
            };
        });

        this.currentMediaIndex = this.currentMediaGallery.findIndex(m => m.url === url);
        
        const overlay = document.getElementById('media-viewer-overlay');
        overlay.classList.remove('hidden');

        // Gunakan fungsi pembantu untuk tombol
        this.attachMediaPlayerEvents(overlay);

        this.renderMediaThumbnails();
        this.updateMediaViewerUI();
    }

    // Update fungsi render agar lebih bersih jika hanya ada 1 media
    renderMediaThumbnails() {
        const thumbContainer = document.getElementById('media-thumbnails');
        
        // Tetap tampilkan flex, jangan di-none agar konsisten
        thumbContainer.style.display = 'flex';
        
        // Berikan class khusus jika hanya ada satu media untuk styling center
        if (this.currentMediaGallery.length === 1) {
            thumbContainer.classList.add('single-item');
        } else {
            thumbContainer.classList.remove('single-item');
        }

        thumbContainer.innerHTML = this.currentMediaGallery.map((media, idx) => `
            <div class="media-thumb-item ${idx === this.currentMediaIndex ? 'active' : ''}" 
                onclick="window.app.jumpToMedia(${idx})">
                <i class="fas ${media.type === 'video' ? 'fa-video' : 'fa-music'}"></i>
                <div class="thumb-info">
                    <span class="thumb-name">${media.fileName}</span>
                </div>
            </div>
        `).join('');
    }

    updateMediaViewerUI() {
        const media = this.currentMediaGallery[this.currentMediaIndex];
        const videoEl = document.getElementById('active-full-video');
        const audioEl = document.getElementById('active-full-audio');
        const audioContainer = document.getElementById('audio-visualizer-container');
        const fileNameDisplay = document.getElementById('media-viewer-filename');
        const typeIcon = document.getElementById('media-type-icon');

        // 1. Mulai Animasi Transisi (Fade Out)
        videoEl.classList.add('changing');
        audioContainer.classList.add('changing');

        // Tunggu durasi transisi (150ms - 200ms) sebelum ganti konten
        setTimeout(() => {
            // Reset state awal
            [videoEl, audioContainer].forEach(el => el.classList.add('hidden'));
            videoEl.pause(); 
            audioEl.pause();

            // Tentukan target elemen berdasarkan tipe
            const targetEl = media.type === 'video' ? videoEl : audioEl;
            const targetContainer = media.type === 'video' ? videoEl : audioContainer;

            targetEl.src = media.url;
            targetEl.load();

            targetEl.oncanplay = () => {
                // Tampilkan container
                targetContainer.classList.remove('hidden');
                
                // Picu Fade In dengan menghapus class 'changing'
                // Gunakan requestAnimationFrame agar browser sempat merender state 'hidden' tadi
                requestAnimationFrame(() => {
                    targetContainer.classList.remove('changing');
                });

                targetEl.play().catch(() => console.log("Autoplay blocked"));
            };

            // Update Metadata
            fileNameDisplay.textContent = media.fileName;
            typeIcon.className = `fas ${media.type === 'video' ? 'fa-video' : 'fa-music'} gold-icon`;
        }, 150);

        // 2. Update Active Class di Thumbnail (Tanpa Delay untuk responsivitas)
        document.querySelectorAll('.media-thumb-item').forEach((t, i) => {
            t.classList.toggle('active', i === this.currentMediaIndex);
            if(i === this.currentMediaIndex) {
                t.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            }
        });
    }

    navigateMedia(step) {
        this.currentMediaIndex = (this.currentMediaIndex + step + this.currentMediaGallery.length) % this.currentMediaGallery.length;
        this.updateMediaViewerUI();
    }

    jumpToMedia(index) {
        this.currentMediaIndex = index;
        this.updateMediaViewerUI();
    }

    async handleSendMessage() {
        const text = this.input.value.trim();
        if (!text && this.pendingFiles.length === 0) return;

        try {
            // Sebelum socket.emit('sendLoungeMessage', ...)
            console.log("=== DEBUG FRONTEND: MENGIRIM PESAN ===");
            console.log("Isi Pesan:", text);
            console.log("Membalas ID:", this.replyToId); // Pastikan ini tidak null jika sedang membalas

            const imageFiles = this.pendingFiles.filter(f => f.type.startsWith('image/'));
            const docAudioFiles = this.pendingFiles.filter(f => !f.type.startsWith('image/'));

            if (this.pendingFiles.length > 0) {
                Swal.fire({
                    title: 'Mengolah Resep...',
                    html: 'Master Chef sedang menyusun sajian media.',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });
            }

            // 1. UPLOAD SEMUA FILE SECARA PARALEL
            const uploadPromises = this.pendingFiles.map(async (file) => {
                const formData = new FormData();
                formData.append('media', file);
                const res = await fetch(`${API_BASE_URL}/lounge/upload-media`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.token}` },
                    body: formData
                });
                if (!res.ok) throw new Error(`Gagal: ${file.name}`);
                return await res.json();
            });

            const uploadedResults = await Promise.all(uploadPromises);
            const uploadedImages = uploadedResults.filter(r => r.type === 'image');
            const uploadedDocs = uploadedResults.filter(r => r.type !== 'image');
            const currentTimestamp = Date.now();

            // 3. KIRIM KARTU GAMBAR (+ Teks jika ada)
            if (uploadedImages.length > 0) {
                const payload = {
                    roomId: this.currentRoomId,
                    userId: this.user._id,
                    username: this.user.username,
                    email: this.user.email,
                    rank: this.user.membership,
                    type: 'image_group',
                    parentMessage: this.replyToId, // Sertakan ID pesan yang dibalas
                    content: text,
                    mediaUrls: uploadedImages.map(img => img.url),
                    fileName: null,
                    timestamp: currentTimestamp
                };
                console.log("[Socket] Mengirim pesan gambar:", payload);
                this.socket.emit('sendLoungeMessage', payload);
            }

            // 4. KIRIM KARTU DOKUMEN/AUDIO/VIDEO (Hanya jika teks belum dikirim bersama gambar)
            if (uploadedDocs.length > 0) {
                const payload = {
                    roomId: this.currentRoomId,
                    userId: this.user._id,
                    username: this.user.username,
                    email: this.user.email,
                    rank: this.user.membership,
                    type: 'doc_group',
                    parentMessage: this.replyToId, // Sertakan ID pesan yang dibalas
                    content: (uploadedImages.length === 0) ? text : "",
                    attachments: uploadedDocs,
                    fileName: null,
                    timestamp: currentTimestamp
                };
                console.log("[Socket] Mengirim pesan dokumen:", payload);
                this.socket.emit('sendLoungeMessage', payload);
            }

            // 5. KIRIM PESAN TEKS SAJA (Jika tidak ada file sama sekali)
            if (text && uploadedResults.length === 0) {
                const payload = {
                    roomId: this.currentRoomId, // Pastikan ini ada juga
                    userId: this.user._id,
                    username: this.user.username,
                    email: this.user.email,
                    rank: this.user.membership,
                    type: 'text',
                    parentMessage: this.replyToId, // Sertakan ID pesan yang dibalas
                    content: text,
                    timestamp: currentTimestamp
                };
                console.log("[Socket] Mengirim pesan teks:", payload);
                this.socket.emit('sendLoungeMessage', payload);
            }

            this.input.value = '';
            this.cancelReply(); // Reset setelah kirim
            this.pendingFiles = [];
            this.renderPreviewBar();
            Swal.close();
        } catch (error) {
            console.error("[Chat] Error saat mengirim:", error);
            Swal.fire('Gagal Kirim', error.message, 'error');
        }
    }

    handleMultipleFiles(files) {
        const currentCount = this.pendingFiles.length;
        const incomingCount = files.length;

        // 1. CEK JIKA TOTAL MELEBIHI BATAS
        if (currentCount + incomingCount > this.maxFiles) {
            const remainingSlots = this.maxFiles - currentCount;

            Swal.fire({
                title: 'Kapasitas Terbatas',
                text: `Anda mencoba mengunggah ${incomingCount} file, namun sisa slot hanya ${remainingSlots}. Hanya ${remainingSlots} file pertama yang akan diproses.`,
                icon: 'warning',
                background: '#121212',
                color: '#fff',
                showCancelButton: true,
                confirmButtonColor: '#d4af37',
                cancelButtonColor: '#444',
                confirmButtonText: 'Ya, Lanjutkan',
                cancelButtonText: 'Batal'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Ambil hanya file yang muat di sisa slot
                    const limitedFiles = files.slice(0, remainingSlots);
                    this.processFiles(limitedFiles);
                }
            });
            return; // Hentikan eksekusi otomatis ke bawah karena sudah ditangani Swal
        }

        // 2. JIKA TIDAK MELEBIHI BATAS, LANGSUNG PROSES
        this.processFiles(files);
    }

    // FUNGSI HELPER: Agar logika penambahan file tidak ditulis berulang-ulang
    processFiles(files) {
        files.forEach(file => {
            // Cek Ukuran Per File
            if (file.size > this.maxFileSize) {
                Swal.fire({
                    title: 'File Terlalu Besar',
                    text: `${file.name} melebihi batas 25MB dan akan dilewati.`,
                    icon: 'error',
                    background: '#121212',
                    color: '#fff',
                    confirmButtonText: 'Ya, Mengerti',
                    confirmButtonColor: '#d4af37'
                });
                return; // Skip file ini, lanjut ke file berikutnya di loop
            }

            // Tambahkan ID unik & Push ke array pending
            file.id = Date.now() + Math.random().toString(36).substr(2, 9);
            this.pendingFiles.push(file);
        });

        this.renderPreviewBar();
    }

    renderPreviewBar() {
        const inputArea = document.querySelector('.chat-input-area');
        let previewBar = document.querySelector('.upload-preview-bar');

        if (this.pendingFiles.length === 0) {
            if (previewBar) previewBar.remove();
            return;
        }

        if (!previewBar) {
            previewBar = document.createElement('div');
            previewBar.className = 'upload-preview-bar';
            inputArea.parentNode.insertBefore(previewBar, inputArea);
        }

        previewBar.innerHTML = ''; // Clear and Redraw

        this.pendingFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'preview-item';
            
            // Konten berdasarkan tipe file
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    item.innerHTML = `
                        <img src="${e.target.result}" alt="preview">
                        <button class="remove-preview" data-id="${file.id}"><i class="fas fa-times"></i></button>
                    `;
                };
                reader.readAsDataURL(file);
            } else {
                const icon = file.type.includes('audio') ? 'fa-music' : 
                            (file.type.includes('video') ? 'fa-video' : 'fa-file-alt');
                item.innerHTML = `
                    <i class="fas ${icon}"></i>
                    <span class="file-name-mini">${file.name}</span>
                    <button class="remove-preview" data-id="${file.id}"><i class="fas fa-times"></i></button>
                `;
            }

            // Event Hapus
            item.onclick = (e) => {
                const btn = e.target.closest('.remove-preview');
                if (btn) {
                    const id = btn.getAttribute('data-id');
                    this.pendingFiles = this.pendingFiles.filter(f => f.id !== id);
                    this.renderPreviewBar();
                }
            };

            previewBar.appendChild(item);
        });
        
        this.scrollToBottom();
    }

    async loadEmojiData() {
        if (this._emojiData) return this._emojiData;

        const res = await fetch('https://cdn.jsdelivr.net/npm/emoji.json/emoji.json');
        const raw = await res.json();

        // Ambil emoji native saja (WA style)
        this._emojiData = raw
            .filter(e => e.char && e.category !== 'Skin Tones')
            .map(e => e.char);

        return this._emojiData;
    }

    /*async initEmojiPicker() {
        if (this.isPickerInitialized) return;

        const container = document.getElementById('emoji-picker-container');
        container.innerHTML = `
            <div class="emoji-wa">
                <div class="emoji-wa-header">Emoji</div>
                <div class="emoji-wa-viewport">
                    <div class="emoji-wa-content"></div>
                </div>
                <div class="emoji-wa-footer">SajiLe • Executive Lounge</div>
            </div>
        `;

        this.emojiViewport = container.querySelector('.emoji-wa-viewport');
        this.emojiContent  = container.querySelector('.emoji-wa-content');

        this.emojiData = await this.loadEmojiData();

        this.ROW_HEIGHT = 36;
        this.PER_ROW = 9;
        this.VISIBLE_ROWS = 7;
        this.POOL_ROWS = this.VISIBLE_ROWS + 2;

        this.scrollY = 0;
        this.maxScroll =
            Math.ceil(this.emojiData.length / this.PER_ROW) * this.ROW_HEIGHT -
            this.emojiViewport.clientHeight;

        this.buildEmojiPool();
        this.bindEmojiScroll();

        this.isPickerInitialized = true;
    }

    buildEmojiPool() {
        this.rows = [];

        for (let i = 0; i < this.POOL_ROWS; i++) {
            const row = document.createElement('div');
            row.className = 'emoji-row';

            for (let j = 0; j < this.PER_ROW; j++) {
                const cell = document.createElement('div');
                cell.className = 'emoji-item';
                cell.onclick = () => {
                    if (!cell.textContent) return;
                    this.insertTextAtCursor(this.input, cell.textContent);
                    this.input.dispatchEvent(new Event('input'));
                };
                row.appendChild(cell);
            }

            this.emojiContent.appendChild(row);
            this.rows.push(row);
        }

        this.renderEmojiWindow(0);
    }

    renderEmojiWindow(startRow) {
        for (let i = 0; i < this.rows.length; i++) {
            const rowIndex = startRow + i;
            const baseIndex = rowIndex * this.PER_ROW;

            const row = this.rows[i];
            row.style.transform = `translateY(${rowIndex * this.ROW_HEIGHT}px)`;

            for (let j = 0; j < this.PER_ROW; j++) {
                const emoji = this.emojiData[baseIndex + j];
                row.children[j].textContent = emoji || '';
            }
        }
    }

    bindEmojiScroll() {
        let ticking = false;

        this.emojiViewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.scrollY = Math.max(0, Math.min(this.scrollY + e.deltaY, this.maxScroll));

            if (!ticking) {
                requestAnimationFrame(() => {
                    const firstRow = Math.floor(this.scrollY / this.ROW_HEIGHT);
                    this.renderEmojiWindow(firstRow);
                    this.emojiContent.style.transform =
                        `translateY(${-this.scrollY}px)`;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: false });
    }*/

    async initEmojiPicker() {
        if (this.isPickerInitialized) return;

        const container = document.getElementById('emoji-picker-container');
        container.innerHTML = `
            <div class="emoji-wa">
                <div class="emoji-wa-header">Emoji</div>
                <div class="emoji-wa-viewport" style="overflow:hidden; height:252px; position:relative;">
                    <div class="emoji-wa-content" style="position:absolute; top:0; left:0; width:100%; will-change: transform;"></div>
                </div>
                <div class="emoji-wa-footer">SajiLe • Executive Lounge</div>
            </div>
        `;

        this.emojiViewport = container.querySelector('.emoji-wa-viewport');
        this.emojiContent  = container.querySelector('.emoji-wa-content');

        this.emojiData = await this.loadEmojiData();

        this.ROW_HEIGHT = 36;
        this.PER_ROW = 9;
        this.VISIBLE_ROWS = 7;
        // Tambah buffer baris agar tidak blink saat scroll cepat
        this.POOL_ROWS = this.VISIBLE_ROWS + 4; 

        this.scrollY = 0;
        this.lastStartRow = -1; // Flag untuk optimasi render

        const totalRows = Math.ceil(this.emojiData.length / this.PER_ROW);
        this.maxScroll = (totalRows * this.ROW_HEIGHT) - this.emojiViewport.clientHeight;

        this.buildEmojiPool();
        this.bindEmojiScroll();

        this.isPickerInitialized = true;
    }

    buildEmojiPool() {
        this.rows = [];
        this.emojiContent.innerHTML = ''; // Pastikan bersih

        for (let i = 0; i < this.POOL_ROWS; i++) {
            const row = document.createElement('div');
            row.className = 'emoji-row';
            // Set style dasar agar tidak berantakan
            row.style.position = 'absolute';
            row.style.left = '0';
            row.style.width = '100%';
            row.style.height = `${this.ROW_HEIGHT}px`;
            row.style.display = 'flex';

            for (let j = 0; j < this.PER_ROW; j++) {
                const cell = document.createElement('div');
                cell.className = 'emoji-item';
                cell.style.flex = '1';
                cell.style.textAlign = 'center';
                cell.style.cursor = 'pointer';
                cell.onclick = () => {
                    if (!cell.textContent) return;
                    this.insertTextAtCursor(this.input, cell.textContent);
                    this.input.dispatchEvent(new Event('input'));
                };
                row.appendChild(cell);
            }
            this.emojiContent.appendChild(row);
            this.rows.push(row);
        }
        this.renderEmojiWindow(0);
    }

    renderEmojiWindow(startRow) {
        // Hanya update isi jika baris pertama benar-benar berubah
        if (startRow === this.lastStartRow) return;
        this.lastStartRow = startRow;

        for (let i = 0; i < this.rows.length; i++) {
            const rowIndex = startRow + i;
            const baseIndex = rowIndex * this.PER_ROW;
            const row = this.rows[i];

            // Gunakan transform pada baris individual untuk memposisikannya secara absolut
            row.style.transform = `translate3d(0, ${rowIndex * this.ROW_HEIGHT}px, 0)`;

            for (let j = 0; j < this.PER_ROW; j++) {
                const emoji = this.emojiData[baseIndex + j];
                const cell = row.children[j];
                
                // Optimasi: Hanya update textContent jika berubah
                if (cell.textContent !== (emoji || '')) {
                    cell.textContent = emoji || '';
                }
            }
        }
    }

    bindEmojiScroll() {
        let ticking = false;

        this.emojiViewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.scrollY = Math.max(0, Math.min(this.scrollY + e.deltaY, this.maxScroll));

            if (!ticking) {
                window.requestAnimationFrame(() => {
                    // Gunakan offset 2 baris ke atas untuk kelancaran visual
                    const currentStartRow = Math.floor(this.scrollY / this.ROW_HEIGHT);
                    const renderStartRow = Math.max(0, currentStartRow - 2);

                    this.renderEmojiWindow(renderStartRow);
                    
                    // Gerakkan kontainer dengan translate3d (Hardware Accelerated)
                    this.emojiContent.style.transform = `translate3d(0, ${-this.scrollY}px, 0)`;
                    
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: false });
    }


    insertTextAtCursor(el, text) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const currentVal = el.value;
        el.value = currentVal.substring(0, start) + text + currentVal.substring(end);
        el.selectionStart = el.selectionEnd = start + text.length;
    }

    scrollToBottom() {
        const viewport = document.getElementById('chat-viewport');
        if (!viewport) return;

        const forceScroll = () => {
            viewport.scrollTo({ 
                top: viewport.scrollHeight, 
                behavior: 'smooth' 
            });
        };

        // 1. Scroll Instan
        forceScroll();

        // 2. Scroll lagi setelah render frame (untuk layout ringan)
        requestAnimationFrame(forceScroll);

        // 3. Scroll lagi setelah jeda (untuk layout berat/gambar)
        setTimeout(forceScroll, 300);
    }

    // Menampilkan Pop-up Menu
    toggleMessageMenu(msgId) {
        const menu = document.getElementById(`menu-${msgId}`);
        // Tutup menu lain yang mungkin terbuka
        document.querySelectorAll('.message-action-popup').forEach(m => {
            if(m.id !== `menu-${msgId}`) m.classList.add('hidden');
        });
        menu.classList.toggle('hidden');
    }

    // =======================================================
    // 1. Fungsi memicu mode Balas (DENGAN PREVIEW GAMBAR MINI)
    // =======================================================
    initiateReply(msgId) {
        const msgData = this.messageMap?.[msgId];
        if (!msgData) return;

        this.replyToId = msgId;

        const container = document.getElementById('reply-preview-container');
        const userEl = document.getElementById('reply-user');
        const emailEl = document.getElementById('reply-email');
        const textEl = document.getElementById('reply-text-preview');

        const senderName =
            msgData.sender?.username ||
            msgData.senderName ||
            'User';

        const senderEmail =
            msgData.sender?.email ||
            msgData.email ||
            '';

        userEl.innerText = senderName === 'Anda' ? this.user.username : senderName;
        emailEl.innerText = senderEmail;

        let iconsHtml = '';
        let previewText = '';
        let imageHtml = '';

        if (msgData.type === 'image_group') {
            const imgs = msgData.mediaUrls || [];
            iconsHtml = `<i class="fas fa-image"></i>
                        <span class="reply-multiplier">x${imgs.length}</span>`;

            previewText = msgData.text
                ? msgData.text.substring(0, 50) + (msgData.text.length > 50 ? '...' : '')
                : 'Gambar';

            if (imgs.length) {
                imageHtml = `
                    <div class="reply-image-preview">
                        ${imgs.map(u =>
                            `<img src="${this.resolveUrl(u)}" loading="lazy">`).join('')}
                    </div>`;
            }
        }

        else if (msgData.type === 'doc_group') {
            const c = { audio: 0, video: 0, doc: 0 };

            (msgData.attachments || []).forEach(f => {
                if (/\.(mp3|wav|ogg|m4a|webm)$/i.test(f.fileName)) c.audio++;
                else if (/\.(mp4|mov|avi|webm|mkv)$/i.test(f.fileName)) c.video++;
                else c.doc++;
            });

            if (c.video) iconsHtml += `<i class="fas fa-video"></i><span class="reply-multiplier">x${c.video}</span>`;
            if (c.audio) iconsHtml += `<i class="fas fa-play-circle"></i><span class="reply-multiplier">x${c.audio}</span>`;
            if (c.doc) iconsHtml += `<i class="fas fa-file-alt"></i><span class="reply-multiplier">x${c.doc}</span>`;

            previewText = msgData.text
                ? msgData.text.substring(0, 50) + (msgData.text.length > 50 ? '...' : '')
                : 'Lampiran';
        }

        else {
            previewText = msgData.text
                ? msgData.text.substring(0, 50) + (msgData.text.length > 50 ? '...' : '')
                : 'Pesan';
        }

        textEl.innerHTML = `
            <div class="reply-mixed-content">
                <div class="reply-left">
                    ${iconsHtml}
                    <span class="reply-text-body">${previewText}</span>
                </div>
                ${imageHtml}
            </div>
        `;


        container.classList.remove('hidden');
        this.input.focus();
        this.toggleMessageMenu(msgId);
    }



    cancelReply() {
        this.replyToId = null;
        document.getElementById('reply-preview-container').classList.add('hidden');
    }

    // Logika Salin Pesan ke Clipboard
    async copyMessage(msgId) {
        const row = document.getElementById(`msg-row-${msgId}`);
        if (!row) return;

        const bubble = row.querySelector('.msg-bubble');
        if (!bubble) return;

        const texts = Array.from(bubble.querySelectorAll('.msg-text'))
            .map(el => el.innerText.trim())
            .filter(Boolean);

        if (texts.length === 0) return;
        
        const finalText = texts.join('\n\n');

        try {
            await navigator.clipboard.writeText(finalText);
            
            // Berikan feedback visual kecil (Toast) agar user tahu proses berhasil
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
                background: '#1a1a1a',
                color: '#d4af37' // Warna emas khas SajiLe
            });

            Toast.fire({
                icon: 'success',
                title: 'Teks disalin ke clipboard'
            });

        } catch (err) {
            console.error('Gagal menyalin teks:', err);
        } finally {
            // Tutup menu setelah klik
            this.toggleMessageMenu(msgId);
        }
    }

    // Logika Edit Pesan
    async editMessage(msgId) {
        // Ambil konten teks saat ini dari DOM
        const contentEl = document.getElementById(`msg-content-${msgId}`);
        const oldContent = contentEl ? contentEl.innerText : "";

        // Tutup menu
        this.toggleMessageMenu(msgId);

        const { value: text } = await Swal.fire({
            title: 'Edit Pesan',
            input: 'textarea',
            inputValue: oldContent,
            showCancelButton: true,
            confirmButtonColor: '#d4af37',
            cancelButtonColor: '#333',
            background: '#0a0a0a',
            color: '#fff',
            customClass: { popup: 'no-bg-swal' }
        });

        if (text && text !== oldContent) {
            try {
                const res = await fetch(`${API_BASE_URL}/lounge/edit`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                    body: JSON.stringify({ messageId: msgId, newContent: text })
                });
                const data = await res.json();
                
                if(res.ok) {
                    // Update UI Lokal Langsung (Optimistic UI)
                    if(contentEl) contentEl.innerText = text;
                    
                    // Kirim sinyal ke socket agar orang lain melihat perubahan
                    // (Pastikan backend Anda memancarkan event 'messageEdited' kembali)
                    this.socket.emit('editLoungeMessage', { 
                        messageId: msgId, 
                        newContent: text, 
                        roomId: this.currentRoomId 
                    });
                } else {
                    Swal.fire('Gagal', data.message || 'Waktu edit habis.', 'error');
                }
            } catch (err) { console.error(err); }
        }
    }

    // Logika Hapus Pesan
    async deleteMessage(msgId) {
        // Tutup menu
        this.toggleMessageMenu(msgId);

        const result = await Swal.fire({
            title: 'Hapus Pesan?',
            text: "Tindakan ini tidak dapat dibatalkan.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#333',
            confirmButtonText: 'Hapus',
            background: '#0a0a0a',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`${API_BASE_URL}/lounge/delete/${msgId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                
                if(res.ok) {
                    // Hapus elemen dari DOM lokal
                    const row = document.getElementById(`msg-row-${msgId}`);
                    if(row) row.remove();

                    if(row) {
                        const groupId = row.getAttribute('data-parent-group');
                        row.remove();
                        // Jalankan pembersihan setelah elemen dihapus
                        this.cleanupEmptyDateSeparator(groupId);
                    }

                    this.socket.emit('deleteLoungeMessage', { messageId: msgId, roomId: this.currentRoomId });
                }
            } catch (err) { console.error(err); }
        }
    }

    // 1. UPDATE INFO PANEL (Kronologis: Terlama ke Terbaru)
    updateInfoPanel(data, isHistory = false) {
        const { sender, mediaUrls, attachments, type } = data;

        // A. Kelola Anggota Elite
        if (sender) {
            const userId = sender._id || sender.id || data.email;
            if (!this.roomMembers.has(userId)) {
                this.roomMembers.set(userId, {
                    username: sender.username || data.senderName || "Unknown Chef",
                    email: sender.email || data.email || "",
                    picture: sender.profilePictureUrl || null
                });
                this.renderMemberList();
            }
        }

        // B. Kelola Media Bersama (Gunakan push agar kronologis)
        if (type === 'image_group' && mediaUrls) {
            mediaUrls.forEach(url => {
                if (!this.sharedMedia.find(m => m.url === url)) {
                    // PUSH: Menambah ke akhir (Terbaru berada di paling bawah)
                    this.sharedMedia.push({ type: 'image', url, name: url.split('/').pop() });
                }
            });
        } else if (type === 'doc_group' && attachments) {
            attachments.forEach(file => {
                if (!this.sharedMedia.find(m => m.url === file.url)) {
                    const isAudio = file.fileName.match(/\.(mp3|wav|ogg|m4a|webm)$/i);
                    const isVideo = file.fileName.match(/\.(mp4|mov|avi|webm|mkv)$/i);
                    // PUSH: Menambah ke akhir
                    this.sharedMedia.push({ 
                        type: isAudio ? 'audio' : (isVideo ? 'video' : 'file'), 
                        url: file.url, 
                        name: file.fileName,
                        size: file.fileSize || 'Dokumen'
                    });
                }
            });
        }
        
        if (mediaUrls || attachments) {
            this.renderSharedMedia();
        }
    }

    // 2. RENDER MEDIA GRID (Tetap Konsisten dengan Urutan Array)
    renderSharedMedia() {
        const mediaGrid = document.querySelector('.media-grid');
        const mediaCount = document.querySelector('.accordion-header .count');
        if (!mediaGrid) return;

        // Ambil 8 saja untuk preview di sidebar
        const preview = this.sharedMedia.slice(-8);
        if (mediaCount) mediaCount.textContent = this.sharedMedia.length; // Update count

        // Render sesuai urutan array (0 = Terlama/Atas, End = Terbaru/Bawah)
        mediaGrid.innerHTML = preview.map((item) => {
            const realIdx = this.sharedMedia.findIndex(m => m.url === item.url);
            // FIX: Resolve URL untuk tampilan
            const fullUrl = this.resolveUrl(item.url);
            if (item.type === 'image') {
                // --- PERBAIKAN DI SINI ---
                // DULU: onclick="window.app.openGlobalGallery(${idx})"  <-- Error, idx tidak ada
                // SEKARANG: Gunakan ${realIdx}
                return `
                    <div class="media-item image-card" onclick="window.app.openGlobalGallery(${realIdx})">
                        <img src="${fullUrl}" loading="lazy">
                    </div>`;
            } else {
                const isAudio = item.type === 'audio';
                const isVideo = item.type === 'video';
                const icon = isAudio ? 'fa-play-circle' : (isVideo ? 'fa-video' : 'fa-file-alt');
                
                let action = (isAudio || isVideo) ? 
                    `window.app.openGlobalMedia(${realIdx})` : // Gunakan realIdx
                    `window.open('${fullUrl}')`; // Gunakan fullUrl di sini

                return `
                    <div class="media-item doc-card" onclick="${action}">
                        <i class="fas ${icon} gold-icon"></i>
                        <div class="file-info-text">
                            <span class="file-name">${item.name}</span>
                            <span class="file-size">${item.size}</span>
                        </div>
                    </div>`;
            }
        }).join('');

        // FIX BUG 1: Hapus tombol lama jika sudah ada sebelum menambah yang baru
        const existingBtn = document.querySelector('.more-media-btn');
        if (existingBtn) existingBtn.remove();

        if (this.sharedMedia.length > 0) {
            const moreBtn = document.createElement('button');
            moreBtn.className = 'more-media-btn';
            moreBtn.innerHTML = `<i class="fas fa-expand-arrows-alt"></i> Selengkapnya`;
            moreBtn.onclick = () => this.openMediaArchive();
            mediaGrid.after(moreBtn);
        }

        // Opsional: Jika ingin otomatis scroll ke media terbaru (paling bawah) saat baru dimuat
        // mediaGrid.parentElement.scrollTo({ top: mediaGrid.scrollHeight, behavior: 'smooth' });
    }

    // 3. RENDER MEMBER LIST (Fix Avatar)
    renderMemberList() {
        const listContainer = document.querySelector('.member-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        this.roomMembers.forEach((member) => {
            const li = document.createElement('li');
            li.className = 'member-item';
            const avatarContent = member.picture ? 
                `<img src="${member.picture}" class="member-img">` : 
                `<div class="member-avatar">${member.username.charAt(0).toUpperCase()}</div>`;
                
            li.innerHTML = `
                ${avatarContent}
                <div class="member-info">
                    <span class="member-name">${member.username}</span>
                    <span class="member-status online">Legend</span>
                </div>
            `;
            listContainer.appendChild(li);
        });
    }

    // 4. GLOBAL OPENER (Menghubungkan Tab Info ke Player)
    openGlobalGallery(index) {
        // Ambil semua gambar dari sharedMedia
        const allImages = this.sharedMedia.filter(m => m.type === 'image');
        
        // FIX: Resolve semua URL di array agar viewer bisa menampilkannya
        const imageUrls = allImages.map(m => this.resolveUrl(m.url));
        
        // Cari index target (gunakan URL asli untuk pencarian, bukan fullUrl)
        const targetUrlRaw = this.sharedMedia[index].url;
        const galleryIndex = allImages.findIndex(m => m.url === targetUrlRaw);

        this.openGallery(encodeURIComponent(JSON.stringify(imageUrls)), galleryIndex !== -1 ? galleryIndex : 0);
    }

    openGlobalMedia(index) {
        const mediaItem = this.sharedMedia[index];
        const overlay = document.getElementById('media-viewer-overlay');
        
        this.currentMediaGallery = this.sharedMedia
            .filter(m => m.type === mediaItem.type) 
            .map(m => ({
                url: this.resolveUrl(m.url), // FIX: Resolve URL di sini
                type: m.type,
                fileName: m.name
            }));

        // Cari index menggunakan URL yang sudah di-resolve agar cocok
        const resolvedTargetUrl = this.resolveUrl(mediaItem.url);
        this.currentMediaIndex = this.currentMediaGallery.findIndex(m => m.url === resolvedTargetUrl);
        
        overlay.classList.remove('hidden');
        this.attachMediaPlayerEvents(overlay);
        this.renderMediaThumbnails();
        this.updateMediaViewerUI();
    }

    // Tambahkan fungsi pembantu ini di dalam class ExclusiveChatApp
    attachMediaPlayerEvents(overlay) {
        document.getElementById('next-media').onclick = () => this.navigateMedia(1);
        document.getElementById('prev-media').onclick = () => this.navigateMedia(-1);
        document.getElementById('media-viewer-close').onclick = () => {
            overlay.classList.add('hidden');
            const video = document.getElementById('active-full-video');
            const audio = document.getElementById('active-full-audio');
            if (video) video.pause();
            if (audio) audio.pause();
        };
    }

    // 2. Kontrol Jendela Penuh
    openMediaArchive() {
        const modal = document.getElementById('media-archive-modal');
        
        // Hapus 'hidden' (legacy) DAN tambahkan 'active' (untuk animasi CSS baru)
        modal.classList.remove('hidden');
        
        // Gunakan requestAnimationFrame agar browser sempat merender state sebelum menambah class active
        // Ini penting agar transisi CSS berjalan (slide up & fade in)
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });

        this.renderArchiveContent();
        
        // Scroll ke paling bawah saat dibuka
        const viewport = document.getElementById('archive-viewport');
        setTimeout(() => {
            viewport.scrollTop = viewport.scrollHeight;
        }, 300); // Sedikit delay agar animasi selesai dulu
    }

    closeMediaArchive() {
        const modal = document.getElementById('media-archive-modal');
        
        // Hapus class active untuk memicu animasi keluar (fade out)
        modal.classList.remove('active');

        // Tunggu durasi transisi (0.5s) selesai, baru sembunyikan total (hidden)
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 500); // Sesuai durasi --color-transition (0.5s)
    }

    // 3. Filtrasi Kategori
    filterArchive(type, btn) {
        this.archiveFilter = type;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderArchiveContent();
    }

    // 4. Render Grid Arsip
    renderArchiveContent() {
        const grid = document.getElementById('archive-grid');
        const filtered = this.sharedMedia.filter(m => 
            this.archiveFilter === 'semua' || m.type === this.archiveFilter
        );

        grid.innerHTML = filtered.map((item) => { // Hapus idx dari map
            const realIdx = this.sharedMedia.findIndex(m => m.url === item.url);
            // FIX: Resolve URL
            const fullUrl = this.resolveUrl(item.url);
            if (item.type === 'image') {
                return `
                    <div class="archive-item image-card" onclick="window.app.openGlobalGallery(${realIdx})">
                        <img src="${fullUrl}" loading="lazy">
                    </div>`;
            } else {
                const isAudio = item.type === 'audio';
                const isVideo = item.type === 'video';
                const icon = isAudio ? 'fa-play-circle' : (isVideo ? 'fa-video' : 'fa-file-alt');
                
                let action = (isAudio || isVideo) ? 
                    `window.app.openGlobalMedia(${realIdx})` : 
                    `window.open('${fullUrl}')`;

                return `
                    <div class="archive-item" onclick="${action}">
                        <i class="fas ${icon} gold-icon"></i>
                        <div class="file-info-text">
                            <span class="archive-name">${item.name}</span>
                            <span class="archive-size">${item.size}</span>
                        </div>
                    </div>`;
            }
        }).join('');
    }

    // 5. Infinite Scroll Terbalik (Scroll ke Atas)
    setupArchiveScroll() {
        const viewport = document.getElementById('archive-viewport');
        if(!viewport) return;

        viewport.addEventListener('scroll', () => {
            // Jika scroll mencapai paling atas (0) dan tidak sedang loading
            if (viewport.scrollTop === 0 && !this.isArchiveLoading) {
                this.loadOlderHistory();
            }
        });
    }

    async loadOlderHistory() {
        this.isArchiveLoading = true;
        const loader = document.getElementById('archive-loader');
        loader.classList.remove('hidden');

        // Simulasi Fetch ke Database untuk data lama
        // Master Chef bisa mengganti ini dengan call API ke /api/lounge/history?before=timestamp
        setTimeout(() => {
            console.log("Memuat data lama dari database...");
            loader.classList.add('hidden');
            this.isArchiveLoading = false;
            
            // Setelah data digabungkan, render ulang dan pertahankan posisi scroll
            // this.renderArchiveContent();
        }, 1500);
    }

}

/* --- TAMBAHAN KODE UNTUK FITUR SEBARKAN (SPREAD) --- */

ExclusiveChatApp.prototype.triggerSpreadFromMenu = function(msgId) {
    // 1. Tutup menu titik tiga (Bug 5)
    this.toggleMessageMenu(msgId); 
    
    // 2. Aktifkan mode dan pilih pesan ini (Bug 2 & 3)
    this.toggleSpreadMode(msgId);
};

ExclusiveChatApp.prototype.initSpreadFeature = function() {
    // Tambahkan listener untuk input caption agar reaktif (Fitur 1)
    const captionInput = document.getElementById('spread-caption-input');
    if(captionInput) {
        captionInput.addEventListener('input', (e) => {
            if(this.spreadData[this.currentSpreadIndex]) {
                this.spreadData[this.currentSpreadIndex].caption = e.target.value;
            }
        });
    }
    
    // Inisialisasi SortableJS (Fitur 3)
    const list = document.getElementById('sortable-list');
    if(list) {
        new Sortable(list, {
            animation: 150,
            handle: '.sortable-handle',
            onEnd: (evt) => {
                // Reorder array spreadData berdasarkan hasil drag
                const item = this.spreadData.splice(evt.oldIndex, 1)[0];
                this.spreadData.splice(evt.newIndex, 0, item);
                // Reset carousel ke index baru jika perlu
                this.renderCarouselSlide(this.currentSpreadIndex);
            }
        });
    }
};

// 2. Aktivasi Mode Seleksi
ExclusiveChatApp.prototype.toggleSpreadMode = function(initialMsgId = null) {
    this.isSpreadMode = true;
    this.selectedSpreadIds = [];

    document.getElementById('footer-normal').classList.add('hidden');
    document.getElementById('footer-spread').classList.remove('hidden');
    
    const feed = document.getElementById('messages-feed');
    feed.classList.add('selection-active');

    const allMessages = feed.querySelectorAll('.msg-row');
    allMessages.forEach(row => {
        const msgId = row.getAttribute('data-id');
        let cb = row.querySelector('.msg-checkbox');

        if (!cb) {
            cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'msg-checkbox';
            cb.value = msgId;
            row.prepend(cb);
        } else {
            cb.checked = false;
        }

        // PERBAIKAN: Pasang listener klik pada seluruh kontainer (row)
        row.onclick = (e) => {
            // Jika yang diklik adalah checkbox itu sendiri, biarkan behavior default
            // Jika yang diklik adalah area kontainer, toggle status checkbox-nya
            if (e.target !== cb) {
                cb.checked = !cb.checked;
            }
            this.handleMessageSelect(msgId, cb.checked);
        };

        // Pastikan checkbox tidak memicu event ganda saat diklik langsung
        cb.onclick = (e) => {
            e.stopPropagation(); 
            this.handleMessageSelect(msgId, cb.checked);
        };
    });

    // 4. Jika dipicu dari tombol "Sebarkan" spesifik (Initial Selection)
    if (initialMsgId) {
        const targetRow = document.getElementById(`msg-row-${initialMsgId}`);
        if (targetRow) {
            const cb = targetRow.querySelector('.msg-checkbox');
            if (cb) {
                cb.checked = true;
                this.handleMessageSelect(initialMsgId, true);
            }
        }
    }
    this.updateSpreadCount();
};

ExclusiveChatApp.prototype.cancelSpreadMode = function() {
    this.spreadData = [];
    this.isSpreadMode = false;
    this.selectedSpreadIds = [];
    this.savedSpreadOptions = null; // RESET CONFIG

    document.querySelector('.btn-settings-spread').classList.remove('has-config');
    document.getElementById('footer-normal').classList.remove('hidden');
    document.getElementById('footer-spread').classList.add('hidden');
    document.getElementById('messages-feed').classList.remove('selection-active');

    document.querySelectorAll('.msg-row').forEach(row => {
        row.onclick = null;
        const cb = row.querySelector('.msg-checkbox');
        if (cb) cb.checked = false;
        row.classList.remove('selected');
    });
    
    this.updateSpreadCount();
};

ExclusiveChatApp.prototype.handleMessageSelect = function(msgId, isChecked) {
    if (isChecked) {
        if (!this.selectedSpreadIds.includes(msgId)) {
            this.selectedSpreadIds.push(msgId);
        }
        document.getElementById(`msg-row-${msgId}`)?.classList.add('selected');
    } else {
        this.selectedSpreadIds = this.selectedSpreadIds.filter(id => id !== msgId);
        document.getElementById(`msg-row-${msgId}`)?.classList.remove('selected');
    }
    this.updateSpreadCount();
};

ExclusiveChatApp.prototype.updateSpreadCount = function() {
    document.getElementById('spread-count').innerText = `${this.selectedSpreadIds.length} Pesan Dipilih`;
};

// 3. Membuka Konfigurasi Lanjutan (Populate Data)
ExclusiveChatApp.prototype.openSpreadConfig = function() {
    if (this.selectedSpreadIds.length === 0) {
        return Swal.fire({
            icon: 'info',
            title: 'Pilih Pesan',
            text: 'Silakan centang minimal satu pesan untuk disebarkan.',
            background: '#121212', 
            color: '#d4af37',
            confirmButtonColor: '#d4af37'
        });
    }
    
    // AMBIL DATA DARI MEMORY (this.messageMap), BUKAN DOM!
    this.spreadData = this.selectedSpreadIds.map(id => {
        const rawData = this.messageMap[id];
        if (!rawData) return null;

        return {
            id: id,
            originalContent: rawData.text || (rawData.type === 'image_group' ? 'Gambar' : 'Dokumen'),
            caption: '', 
            messageType: rawData.type // Gunakan tipe asli (image_group / doc_group)
        };
    }).filter(item => item !== null);
    
    this.currentSpreadIndex = 0;
    this.renderCarouselSlide(0);
    this.renderSortableList();

    // --- TAMBAHAN LOGIKA RESTORE CONFIG ---
    // Jika sudah pernah disimpan sebelumnya, kembalikan posisi toggle/input
    if (this.savedSpreadOptions) {
        const opts = this.savedSpreadOptions;
        document.getElementById('spread-target-select').value = ""; // Reset multiselect (kompleks, sederhananya biarkan manual atau perlu logika loop option)
        // Set values
        if(document.getElementById('opt-privacy')) document.getElementById('opt-privacy').checked = opts.privacyMode;
        if(document.getElementById('opt-schedule')) document.getElementById('opt-schedule').value = opts.scheduledAt || '';
        if(document.getElementById('opt-destruct')) document.getElementById('opt-destruct').value = opts.selfDestruct || '';
        if(document.getElementById('opt-lock')) document.getElementById('opt-lock').checked = opts.forwardLock;
        if(document.getElementById('opt-ghost')) document.getElementById('opt-ghost').checked = opts.isGhost;
        
        // Restore target rooms selection
        const select = document.getElementById('spread-target-select');
        Array.from(select.options).forEach(opt => {
            opt.selected = opts.targetRooms.includes(opt.value);
        });
    }
    
    document.getElementById('spread-config-modal').classList.remove('hidden');
};

ExclusiveChatApp.prototype.closeSpreadConfig = function() {
    document.getElementById('spread-config-modal').classList.add('hidden');
};

// 4. Logika Carousel
ExclusiveChatApp.prototype.renderCarouselSlide = function(index) {
    const spreadItem = this.spreadData[index];
    if(!spreadItem) return;

    // Ambil data asli dari map agar kita punya akses ke mediaUrls, attachments, type, dll.
    const rawData = this.messageMap[spreadItem.id];
    if(!rawData) return;

    const viewport = document.getElementById('spread-carousel-viewport');
    
    // --- LOGIKA RENDER MEDIA (Sesuai Render Utama) ---
    let mediaHtml = '';
    
    // 1. Logika Image Group (4 Preview + Overlay)
    if (rawData.type === 'image_group' && rawData.mediaUrls) {
        const count = rawData.mediaUrls.length;
        const displayCount = Math.min(count, 4);
        const gridClass = `grid-${displayCount}`;
        const resolvedUrls = rawData.mediaUrls.map(u => this.resolveUrl(u));
        const urlsParam = encodeURIComponent(JSON.stringify(resolvedUrls));
        
        mediaHtml = `<div class="media-grid-container ${gridClass}">`;
        for (let i = 0; i < displayCount; i++) {
            const isLast = i === 3 && count > 4;
            mediaHtml += `
                <div class="media-grid-item" onclick="window.app.openGallery('${urlsParam}', ${i})">
                    <img src="${resolvedUrls[i]}" loading="lazy">
                    ${isLast ? `<div class="more-overlay">+${count - 3}</div>` : ''}
                </div>`;
        }
        mediaHtml += `</div>`;
    } 
    // 2. Logika Doc/Audio/Video Group
    else if (rawData.type === 'doc_group' && rawData.attachments) {
        mediaHtml = `<div class="attachment-list">`;
        rawData.attachments.forEach(file => {
            const fullUrl = this.resolveUrl(file.url);
            const isAudio = file.fileName.match(/\.(mp3|wav|ogg|m4a|webm)$/i);
            const isVideo = file.fileName.match(/\.(mp4|mov|avi|webm|mkv)$/i);
            let icon = isAudio ? 'fa-play-circle' : (isVideo ? 'fa-video' : 'fa-file-alt');
            let action = (isAudio || isVideo) ? `window.app.openMedia('${fullUrl}', '${isAudio?'audio':'video'}', this)` : `window.open('${fullUrl}')`;
            
            mediaHtml += `
                <div class="file-bubble-container">
                    <div class="file-bubble" onclick="${action}">
                        <i class="fas ${icon} gold-icon"></i>
                        <div class="file-info-text">
                            <span class="file-name">${file.fileName}</span>
                            <span class="file-size">${file.fileSize || 'Dokumen'}</span>
                        </div>
                    </div>
                </div>`;
        });
        mediaHtml += `</div>`;
    }

    // Susun kartu pesan
    // Ganti bagian pembuatan HTML di JS Anda menjadi lebih bersih:
    viewport.innerHTML = `
        <div class="msg-preview-card" id="active-preview-card">
            <div class="msg-row ${rawData.isMe ? 'me' : 'others'}">
                <div class="msg-bubble">
                    <div class="message-header">
                        <span class="sender-label">${rawData.isMe ? 'Anda' : (rawData.senderName || 'Chef')}</span>
                    </div>
                    <div class="msg-text">${rawData.text || ''}</div>
                    ${mediaHtml}
                    <div class="msg-meta">
                        <span class="time">${rawData.time || ''}</span>
                    </div>
                </div>
            </div>
        </div>
    `;


    // Sekarang ID 'active-preview-card' tersedia untuk direset
    const card = document.getElementById('active-preview-card');
    if (card) {
        card.scrollTop = 0;
    }
    
    // Sync Input Caption & Indikator
    document.getElementById('spread-caption-input').value = spreadItem.caption || '';
    document.getElementById('current-slide-idx').innerText = index + 1;
    document.getElementById('total-slide-idx').innerText = this.spreadData.length;
};

ExclusiveChatApp.prototype.nextSlide = function() {
    if (this.currentSpreadIndex < this.spreadData.length - 1) {
        this.currentSpreadIndex++;
        this.renderCarouselSlide(this.currentSpreadIndex);
    }
};

ExclusiveChatApp.prototype.prevSlide = function() {
    if (this.currentSpreadIndex > 0) {
        this.currentSpreadIndex--;
        this.renderCarouselSlide(this.currentSpreadIndex);
    }
};

// 5. Fitur: Bulk Edit (Master Override)
ExclusiveChatApp.prototype.applyBulkCaption = function() {
    const currentVal = document.getElementById('spread-caption-input').value;
    this.spreadData.forEach(item => item.caption = currentVal);
    Swal.fire({ title: 'Terapkan!', text: 'Caption disalin ke semua pesan.', icon: 'success', timer: 1000, showConfirmButton: false });
};

// 6. Fitur: Render Sortable List (Drag & Drop UI)
ExclusiveChatApp.prototype.renderSortableList = function() {
    const list = document.getElementById('sortable-list');
    list.innerHTML = this.spreadData.map((item, idx) => `
        <div class="sortable-item" data-idx="${idx}">
            <i class="fas fa-grip-lines sortable-handle"></i>
            <span class="truncate">${item.originalContent.substring(0, 20)}...</span>
        </div>
    `).join('');
};

// 7. Fitur: Auto Watermark (Canvas Manipulation)
ExclusiveChatApp.prototype.applyWatermark = async function() {
    const currentData = this.spreadData[this.currentSpreadIndex];
    if (currentData.messageType !== 'image') return Swal.fire('Hanya untuk gambar!');

    const btn = document.getElementById('btn-watermark');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Penting untuk gambar
    img.src = currentData.mediaUrls[0];

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Styling Watermark
        ctx.font = `bold ${img.width * 0.05}px Playfair Display`;
        ctx.fillStyle = "rgba(212, 175, 55, 0.6)"; // Gold Transparent
        ctx.textAlign = "right";
        ctx.fillText(`@${this.user.username}`, img.width - 20, img.height - 20);

        // Update data dengan gambar hasil render (Base64)
        currentData.mediaUrls[0] = canvas.toDataURL('image/jpeg', 0.8);
        
        // Refresh preview
        this.renderCarouselSlide(this.currentSpreadIndex);
        btn.innerHTML = 'Selesai';
    };
};

// 8. Menyimpan Konfigurasi Penyebaran Pesan (Menggabungkan semua data)
ExclusiveChatApp.prototype.saveSpreadConfig = function() {
    // 1. Kumpulkan Opsi Global dari DOM Modal
    const selectedTargets = Array.from(document.getElementById('spread-target-select').selectedOptions).map(o => o.value);
    
    // Validasi sederhana
    if (selectedTargets.length === 0) {
        return Swal.fire('Target Kosong', 'Pilih minimal satu room tujuan.', 'warning');
    }

    // 2. Simpan ke State Memory
    this.savedSpreadOptions = {
        targetRooms: selectedTargets,
        privacyMode: document.getElementById('opt-privacy').checked,
        scheduledAt: document.getElementById('opt-schedule').value,
        selfDestruct: document.getElementById('opt-destruct').value,
        forwardLock: document.getElementById('opt-lock').checked,
        isGhost: document.getElementById('opt-ghost').checked
    };

    // 3. Beri Feedback Visual di Footer (Opsional: Tambah titik di icon gear)
    document.querySelector('.btn-settings-spread').classList.add('has-config');

    // 4. Tutup Modal & Beri Notifikasi Halus
    this.closeSpreadConfig();
    
    const Toast = Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, 
        timer: 2000, background: '#1a1a1a', color: '#d4af37'
    });
    Toast.fire({ icon: 'success', title: 'Konfigurasi Tersimpan' });
};

ExclusiveChatApp.prototype.quickSpread = async function() {
    const btn = document.querySelector('.btn-spreading');
    if (this.selectedSpreadIds.length === 0) return;

    let optionsToUse = this.savedSpreadOptions || {
        targetRooms: ['general_lounge'],
        privacyMode: false,
        scheduledAt: '',
        selfDestruct: '',
        forwardLock: false,
        isGhost: false
    };

    if (this.spreadData.length === 0) {
        this.spreadData = this.selectedSpreadIds.map(id => {
            const raw = this.messageMap[id];
            if (!raw) return null;
            return {
                id,
                originalContent: raw.text || 'Media',
                caption: '',
                mediaUrls: raw.mediaUrls,
                messageType: raw.type
            };
        }).filter(Boolean);
    }

    const confirm = await Swal.fire({
        title: 'Sebarkan Sekarang?',
        text: `Akan mengirim ${this.spreadData.length} pesan ke ${optionsToUse.targetRooms.length} room.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Kirim!',
        background: '#0a0a0a',
        color: '#fff'
    });

    if (!confirm.isConfirmed) return;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/lounge/spread`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({
                spreadPayload: this.spreadData.map(d => ({
                    originalMessageId: d.id,
                    caption: d.caption,
                    messageType: d.messageType,
                    mediaUrls: d.mediaUrls,
                    options: optionsToUse,
                    targetRooms: optionsToUse.targetRooms
                }))
            })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        Swal.fire({
            title: 'Terkirim!',
            icon: 'success',
            timer: 1200,
            showConfirmButton: false,
            background: '#1a1a1a',
            color: '#d4af37'
        });

        this.cancelSpreadMode();

    } catch (err) {
        Swal.fire('Gagal', err.message, 'error');
    } finally {
        btn.innerHTML = '<i class="fas fa-share"></i>';
        btn.disabled = false;
    }
};

// Panggil initSpreadFeature di akhir inisialisasi app
setTimeout(() => app.initSpreadFeature(), 1000);

// Inisialisasi dan simpan ke window agar bisa diakses HTML (onclick)
const app = new ExclusiveChatApp();
window.app = app; // BARIS KRUSIAL