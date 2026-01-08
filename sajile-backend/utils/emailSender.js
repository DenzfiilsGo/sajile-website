// utils/emailSender.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    pool: true,
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ============================================================
// 1. VERIFIKASI EMAIL (Desain Asli - TIDAK DIUBAH)
// ============================================================
const sendVerificationEmail = async (email, verificationLink) => {
    const safeLink = encodeURI(verificationLink);

    const mailOptions = {
        from: `"SajiLe Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verifikasi Akun SajiLe Anda',
        text: `Selamat datang di SajiLe!\n\nUntuk keamanan akun Anda, silakan verifikasi email Anda dengan menyalin tautan berikut ke browser:\n\n${verificationLink}\n\nLink ini berlaku selama 24 jam.\n\n© Tim SajiLe`,
        html: `
        <!DOCTYPE html>
        <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verifikasi Email SajiLe</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #2ecc71, #27ae60); color: #ffffff; padding: 30px 20px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px; }
                    .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
                    .btn-verify { display: inline-block; background-color: #2ecc71; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 50px; font-weight: 600; margin-top: 20px; box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4); transition: transform 0.2s; }
                    .btn-verify:hover { background-color: #27ae60; transform: translateY(-2px); }
                    .footer { background-color: #333333; color: #ffffff; text-align: center; padding: 20px; font-size: 12px; }
                    .footer a { color: #2ecc71; text-decoration: none; }
                </style>
            </head>
            <body>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table class="container" cellpadding="0" cellspacing="0" border="0" width="600">
                                <tr>
                                    <td class="header">
                                        <h1>SajiLe</h1>
                                        <p style="margin-top: 5px; opacity: 0.9;">Verifikasi Identitas Anda</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="content">
                                        <h2 style="color: #2c3e50; margin-top: 0;">Halo, Calon Koki Handal! 👨‍🍳</h2>
                                        <p>Terima kasih telah mendaftar di <strong>SajiLe</strong>. Untuk mulai menjelajahi dan membagikan resep nusantara, mohon verifikasi alamat email Anda.</p>
                                        <div style="text-align: center; margin: 30px 0;">
                                            <a href="${safeLink}" class="btn-verify" style="color: #ffffff;">Verifikasi Akun Saya</a>
                                        </div>
                                        <p style="font-size: 0.9em; color: #666;">
                                            Atau salin tautan berikut ke browser Anda:<br>
                                            <a href="${safeLink}" style="color: #2ecc71; word-break: break-all;">${safeLink}</a>
                                        </p>
                                        <p>Tautan ini hanya berlaku selama <strong>24 jam</strong>.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="footer">
                                        <p>&copy; ${new Date().getFullYear()} SajiLe Team. All rights reserved.</p>
                                        <p>
                                            <a href="#" class="footer-link" style="color: #888888; text-decoration: none;">Syarat & Ketentuan</a> | 
                                            <a href="#" class="footer-link" style="color: #888888; text-decoration: none;">Kebijakan Privasi</a> | 
                                            <a href="#" class="footer-link" style="color: #888888; text-decoration: none;">Bantuan</a>
                                        </p>
                                        <p style="margin-top: 10px; color: #aaaaaa;">Email ini dikirim secara otomatis, mohon jangan membalas.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[EMAIL-VERIFY] Sukses: Email dikirim ke', email);
        return true;
    } catch (error) {
        console.error('[EMAIL-VERIFY] GAGAL:', error.message);
        return false;
    }
};

// ============================================================
// 2. FUNGSI BARU: EMAIL GENERIK (Untuk Lupa Password, dll)
// ============================================================
const sendGenericEmail = async ({ to, subject, html }) => {
    const mailOptions = {
        from: `"SajiLe Support" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[EMAIL-GENERIC] Sukses: Email dikirim ke', to);
        return true;
    } catch (error) {
        console.error('[EMAIL-GENERIC] GAGAL:', error.message);
        return false;
    }
};

// EKSPOR KEDUA FUNGSI
module.exports = { sendVerificationEmail, sendGenericEmail };