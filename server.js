const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// สร้างและเชื่อมต่อฐานข้อมูล SQLite
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error("Database error:", err.message);
    else console.log("Connected to SQLite Database.");
});

// สร้างตารางเก็บโค้ดและไอดีไก่
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        account_info TEXT,
        is_used INTEGER DEFAULT 0
    )`);
});

// ------------------- หน้าเว็บ HTML (UI) -------------------
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
            .admin-link { margin-top: 25px; display: block; color: #64748b; font-size: 12px; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>🎁 เติมโค้ดรับไอดีไก่</h2>
            <p style="color: #94a3b8; font-size: 14px;">กรอกโค้ดที่คุณได้รับเพื่อรับไอดีเข้าเกม</p>
            <input type="text" id="codeInput" placeholder="กรอกโค้ดที่นี่..." />
            <button onclick="redeemCode()">แลกไอดีทันที</button>

            <div id="result"></div>
            <a href="/admin" class="admin-link">เข้าสู่ระบบแอดมิน (สำหรับเจ้าของร้าน)</a>
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

// ------------------- หน้าแอดมินสำหรับเพิ่มโค้ด -------------------
app.get('/admin', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <title>ระบบแอดมิน - เพิ่มโค้ดไอดีไก่</title>
        <style>
            body { background: #0f172a; color: #fff; font-family: sans-serif; padding: 20px; display: flex; justify-content: center; }
            .box { background: #1e293b; padding: 25px; border-radius: 12px; width: 100%; max-width: 500px; }
            input, textarea { width: 100%; padding: 10px; margin: 8px 0; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; }
            button { width: 100%; padding: 12px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
            a { color: #94a3b8; display: inline-block; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="box">
            <h2>⚙️ แอดมิน: เพิ่มโค้ดและไอดีไก่</h2>
            <label>โค้ดลับ (ตั้งเองได้เลย):</label>
            <input type="text" id="addCode" placeholder="เช่น FREE-CHICKEN-01" />
            
            <label>ข้อมูลไอดีไก่ (User : Pass):</label>
            <textarea id="addAccount" rows="3" placeholder="เช่น ID: chicken999 | Pass: 123456"></textarea>
            
            <button onclick="addCode()">เพิ่มเข้าฐานข้อมูล</button>
            <br><br>
            <a href="/">← กลับหน้าหลักลูกค้า</a>
        </div>

        <script>
            async function addCode() {
                const code = document.getElementById('addCode').value.trim();
                const account = document.getElementById('addAccount').value.trim();
                if(!code || !account) return alert("กรอกข้อมูลให้ครบ!");

                const res = await fetch('/api/add-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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

// ------------------- Backend API -------------------

// 1. ระบบแลกโค้ด
app.post('/api/redeem', (req, res) => {
    const { code } = req.body;
    db.get(`SELECT * FROM items WHERE code = ? AND is_used = 0`, [code], (err, row) => {
        if (err) return res.json({ success: false, message: "เกิดข้อผิดพลาดของระบบ" });
        if (!row) return res.json({ success: false, message: "โค้ดไม่ถูกต้อง หรือถูกใช้งานไปแล้ว!" });

        // ทำเครื่องหมายว่าโค้ดถูกใช้แล้ว
        db.run(`UPDATE items SET is_used = 1 WHERE id = ?`, [row.id], (err) => {
            if (err) return res.json({ success: false, message: "บันทึกข้อมูลไม่สำเร็จ" });
            res.json({ success: true, account: row.account_info });
        });
    });
});

// 2. ระบบเพิ่มโค้ด (สำหรับแอดมิน)
app.post('/api/add-code', (req, res) => {
    const { code, account } = req.body;
    db.run(`INSERT INTO items (code, account_info) VALUES (?, ?)`, [code, account], function(err) {
        if (err) return res.json({ success: false, message: "โค้ดนี้มีอยู่ในระบบแล้ว หรือเกิดข้อผิดพลาด" });
        res.json({ success: true, message: "เพิ่มโค้ดและไอดีไก่เรียบร้อยแล้ว!" });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
          
