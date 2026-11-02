const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔒 ตั้งค่ารหัสผ่านแอดมินตามที่คุณต้องการ
const ADMIN_USER = "Kokin";
const ADMIN_PASS = "0954609460";

// เชื่อมต่อฐานข้อมูล SQLite
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error("Database error:", err.message);
    else console.log("Connected to SQLite Database.");
});

// สร้างตารางเก็บโค้ด
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        account_info TEXT,
        is_used INTEGER DEFAULT 0
    )`);
});

// ------------------- หน้าสำหรับลูกค้า -------------------
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ระบบแลกไอดี Free Fire</title>
        <style>
            * { box-sizing: border-box; font-family: 'Kanit', sans-serif; }
            body { background: #0f172a; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #1e293b; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 100%; max-width: 400px; text-align: center; border: 1px solid #334155; }
            h2 { color: #38bdf8; margin-bottom: 20px; }
            input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; font-size: 16px; text-align: center; text-transform: uppercase; }
            button { width: 100%; padding: 12px; border-radius: 8px; border: none; background: #22c55e; color: #fff; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.2s; }
            button:hover { background: #16a34a; }
            #result { margin-top: 20px; padding: 15px; border-radius: 8px; display: none; word-break: break-all; }
            .success { background: #14532d; color: #4ade80; border: 1px solid #22c55e; }
            .error { background: #451a1a; color: #f87171; border: 1px solid #ef4444; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>🎁 เติมโค้ดรับไอดีไก่</h2>
            <p style="color: #94a3b8; font-size: 14px;">กรอกโค้ดที่คุณได้รับเพื่อรับไอดีเข้าเกม</p>
            <input type="text" id="codeInput" placeholder="กรอกโค้ดที่นี่..." />
            <button onclick="redeemCode()">แลกไอดีทันที</button>
            <div id="result"></div>
        </div>

        <script>
            async function redeemCode() {
                const code = document.getElementById('codeInput').value.trim();
                const resultDiv = document.getElementById('result');
                if (!code) return alert("กรุณากรอกโค้ด!");

                resultDiv.style.display = 'none';
                
                const res = await fetch('/api/redeem', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });

                const data = await res.json();
                resultDiv.style.display = 'block';

                if (data.success) {
                    resultDiv.className = 'success';
                    resultDiv.innerHTML = '<b>🎉 แลกสำเร็จ!</b><br><br>ข้อมูลไอดีของคุณ:<br><h3 style="color:#fff; margin:10px 0;">' + data.account + '</h3><small>(คัดลอกรหัสแล้วนำไปใช้ได้เลย)</small>';
                } else {
                    resultDiv.className = 'error';
                    resultDiv.innerHTML = '❌ ' + data.message;
                }
            }
        </script>
    </body>
    </html>
    `);
});

// ------------------- หน้าสำหรับแอดมิน (ล็อกอินด้วยรหัสใหม่) -------------------
app.get('/admin', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <title>ระบบแอดมิน - เพิ่มโค้ดไอดีไก่</title>
        <style>
            body { background: #0f172a; color: #fff; font-family: sans-serif; padding: 20px; display: flex; justify-content: center; }
            .box { background: #1e293b; padding: 25px; border-radius: 12px; width: 100%; max-width: 450px; }
            input, textarea { width: 100%; padding: 10px; margin: 8px 0; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 10px; }
            .hidden { display: none; }
            a { color: #94a3b8; display: inline-block; margin-top: 15px; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="box">
            <!-- ฟอร์มเข้าสู่ระบบ -->
            <div id="loginSection">
                <h2>🔒 เข้าสู่ระบบแอดมิน</h2>
                <label>Username:</label>
                <input type="text" id="adminUser" placeholder="กรอกชื่อผู้ใช้" />
                <label>Password:</label>
                <input type="password" id="adminPass" placeholder="กรอกรหัสผ่าน" />
                <button onclick="login()">เข้าสู่ระบบ</button>
            </div>

            <!-- ฟอร์มเพิ่มไอดี -->
            <div id="adminPanel" class="hidden">
                <h2>⚙️ แอดมิน: เพิ่มโค้ดและไอดีไก่</h2>
                <label>โค้ดลับ (ตั้งเองได้เลย):</label>
                <input type="text" id="addCode" placeholder="เช่น FREE-CHICKEN-01" />
                
                <label>ข้อมูลไอดีไก่ (User : Pass):</label>
                <textarea id="addAccount" rows="3" placeholder="เช่น ID: chicken999 | Pass: 123456"></textarea>
                
                <button onclick="addCode()">เพิ่มเข้าฐานข้อมูล</button>
            </div>

            <br><a href="/">← กลับหน้าหลักลูกค้า</a>
        </div>

        <script>
            let currentToken = "";

            function login() {
                const u = document.getElementById('adminUser').value;
                const p = document.getElementById('adminPass').value;
                currentToken = btoa(u + ":" + p);

                fetch('/api/check-auth', {
                    headers: { 'Authorization': 'Basic ' + currentToken }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('loginSection').classList.add('hidden');
                        document.getElementById('adminPanel').classList.remove('hidden');
                    } else {
                        alert("❌ ชื่อผู้ใช้หรือรหัสผ่านแอดมินไม่ถูกต้อง!");
                    }
                });
            }

            async function addCode() {
                const code = document.getElementById('addCode').value.trim();
                const account = document.getElementById('addAccount').value.trim();
                if(!code || !account) return alert("กรอกข้อมูลให้ครบ!");

                const res = await fetch('/api/add-code', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + currentToken
                    },
                    body: JSON.stringify({ code, account })
                });
                const data = await res.json();
                alert(data.message);
                if(data.success) {
                    document.getElementById('addCode').value = '';
                    document.getElementById('addAccount').value = '';
                }
            }
        </script>
    </body>
    </html>
    `);
});

// ------------------- API Backend -------------------
const checkAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: "ไม่มีสิทธิ์เข้าถึง" });

    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        next();
    } else {
        res.status(401).json({ success: false, message: "รหัสผ่านไม่ถูกต้อง" });
    }
};

app.get('/api/check-auth', checkAuth, (req, res) => {
    res.json({ success: true });
});

app.post('/api/redeem', (req, res, next) => {
    // ข้ามการบล็อกสำหรับหน้าลูกค้าทั่วไป
    const { code } = req.body;
    db.get(`SELECT * FROM items WHERE code = ? AND is_used = 0`, [code], (err, row) => {
        if (err) return res.json({ success: false, message: "เกิดข้อผิดพลาดของระบบ" });
        if (!row) return res.json({ success: false, message: "โค้ดไม่ถูกต้อง หรือถูกใช้งานไปแล้ว!" });

        db.run(`UPDATE items SET is_used = 1 WHERE id = ?`, [row.id], (err) => {
            if (err) return res.json({ success: false, message: "บันทึกข้อมูลไม่สำเร็จ" });
            res.json({ success: true, account: row.account_info });
        });
    });
});

app.post('/api/add-code', checkAuth, (req, res) => {
    const { code, account } = req.body;
    db.run(`INSERT INTO items (code, account_info) VALUES (?, ?)`, [code, account], function(err) {
        if (err) return res.json({ success: false, message: "โค้ดนี้มีอยู่ในระบบแล้ว หรือเกิดข้อผิดพลาด" });
        res.json({ success: true, message: "เพิ่มโค้ดและไอดีไก่เรียบร้อยแล้ว!" });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
