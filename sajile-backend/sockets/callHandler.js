// backend/sockets/callHandler.js

module.exports = (io, socket) => {
    // 1. Inisialisasi Panggilan Grup/Privat
    socket.on('start-group-call', (data) => {
        const { roomId, type } = data;
        
        // Validasi Membership (Keamanan Tambahan)
        const allowedRanks = ['legend_year', 'legend_eternal', 'admin'];
        if (!allowedRanks.includes(socket.user.membership)) {
            return socket.emit('error_message', 'Upgrade Legend untuk akses panggilan.');
        }

        console.log(`[RTC] ${socket.user.username} mengundang ke panggilan ${type} di ${roomId}`);

        // Broadcast ke semua di room kecuali pengirim
        socket.to(roomId).emit('incoming-call', {
            callerId: socket.id,
            callerName: socket.user.username,
            type: type,
            roomId: roomId
        });
    });

    // 2. WebRTC Signaling Relay (Jantung Koneksi P2P)
    // Sinyal ini berisi info teknis (SDP/ICE) agar browser bisa saling "berjabat tangan"
    socket.on('webrtc-signal', (data) => {
        const { to, signal } = data;
        
        // Kirim spesifik ke user target (point-to-point)
        io.to(to).emit('webrtc-signal', {
            from: socket.id,
            signal: signal
        });
    });

    // 3. User Menutup Telepon
    socket.on('leave-call', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('user-left-call', socket.id);
        console.log(`[RTC] ${socket.user.username} meninggalkan panggilan.`);
    });
};