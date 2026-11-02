const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();
app.use(express.json());

// ----------------------------------------------------
// 1. ระบบฐานข้อมูล (SQLite)
// ----------------------------------------------------
const db = new sqlite3.Database('./redeem.db', (err) => {
  if (!err) {
    db.run(`CREATE TABLE IF NOT EXISTS redeem_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      account_info TEXT NOT NULL,
      status TEXT DEFAULT 'unused',
      used_at DATETIME
    )`);
  }
});

// ----------------------------------------------------
// 2. API ฝั่ง Backend
// ----------------------------------------------------

// API สำหรับแอดมินสร้างโค้ด
app.post('/api/admin/generate-code', (req, res) => {
  const { account_info } = req.body;
  if (!account_info) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุข้อมูลไอดี' });
  }

  const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
  const generatedCode = `FF-${randomStr}`;

  const sql = `INSERT INTO redeem_codes (code, account_info) VALUES (?, ?)`;
  db.run(sql, [generatedCode, account_info], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'สร้างโค้ดไม่สำเร็จ' });
    }
    res.json({
      success: true,
      message: 'สร้างโค้ดสำเร็จ!',
      code: generatedCode,
      account_info: account_info
    });
  });
});

// API สำหรับผู้ใช้กรอกแลกรับไอดี
app.post('/api/redeem', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสโค้ด' });
  }

  const selectSql = `SELECT * FROM redeem_codes WHERE code = ?`;
  db.get(selectSql, [code.trim().toUpperCase()], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: 'ระบบขัดข้อง' });
    if (!row) return res.status(404).json({ success: false, message: 'ไม่พบรหัสโค้ดนี้ในระบบ' });
    if (row.status === 'used') return res.status(400).json({ success: false, message: 'โค้ดนี้ถูกใช้งานไปแล้ว' });

    const updateSql = `UPDATE redeem_codes SET status = 'used', used_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(updateSql, [row.id], (updateErr) => {
      if (updateErr) return res.status(500).json({ success: false, message: 'อัปเดตสถานะไม่สำเร็จ' });

      res.json({
        success: true,
        message: 'แลกรับไอดีสำเร็จ!',
        account_info: row.account_info
      });
    });
  });
});

// ----------------------------------------------------
// 3. หน้าเว็บ UI (HTML + JavaScript)
// ----------------------------------------------------
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ระบบแลกไอดี Free Fire</title>
      <style>
        body { font-family: Arial, sans-serif; background: #1a1a1a; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: #2a2a2a; padding: 25px; border-radius: 12px; width: 100%; max-width: 400px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        h2 { text-align: center; color: #ff9900; margin-top: 0; }
        input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 6px; border: 1px solid #444; background: #333; color: #fff; box-sizing: border-box; font-size: 16px; text-transform: uppercase; }
        button { width: 100%; padding: 12px; background: #ff9900; border: none; color: #000; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 16px; margin-top: 5px; }
        button:hover { background: #e68a00; }
        .result-box { margin-top: 15px; padding: 12px; border-radius: 6px; display: none; word-break: break-all; }
        .success { background: #1e4620; border: 1px solid #2e7d32; color: #a5d6a7; }
        .error { background: #4a1515; border: 1px solid #c62828; color: #ef9a9a; }
        .admin-section { margin-top: 25px; padding-top: 15px; border-top: 1px dashed #444; }
        .admin-section h4 { margin: 0 0 10px 0; color: #aaa; }
      </style>
    </head>
    <body>

      <div class="card">
        <h2>🔥 แลกไอดี Free Fire</h2>
        
        <div>
          <input type="text" id="redeemCode" placeholder="กรอกโค้ด เช่น FF-ABCD1234">
          <button onclick="redeemCode()">ยืนยันการแลกโค้ด</button>
        </div>
        <div id="result" class="result-box"></div>

        <div class="admin-section">
          <h4>🛠️ สำหรับแอดมิน: สร้างโค้ดใหม่</h4>
          <input type="text" id="accountInfo" placeholder="Username : Password ของไอดี" style="text-transform: none;">
          <button onclick="generateCode()" style="background: #555; color: #fff;">สร้างโค้ด</button>
          <div id="adminResult" class="result-box"></div>
        </div>
      </div>

      <script>
        async function redeemCode() {
          const code = document.getElementById('redeemCode').value;
          const resultDiv = document.getElementById('result');
          
          if (!code) return alert('กรุณากรอกโค้ด');

          const response = await fetch('/api/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
          });
          const data = await response.json();

          resultDiv.style.display = 'block';
          if (data.success) {
            resultDiv.className = 'result-box success';
            resultDiv.innerHTML = '<strong>' + data.message + '</strong><br>ไอดีของคุณคือ:<br>' + data.account_info;
          } else {
            resultDiv.className = 'result-box error';
            resultDiv.innerHTML = data.message;
          }
        }

        async function generateCode() {
          const accountInfo = document.getElementById('accountInfo').value;
          const adminResultDiv = document.getElementById('adminResult');

          if (!accountInfo) return alert('กรุณาระบุข้อมูลไอดี');

          const response = await fetch('/api/admin/generate-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_info: accountInfo })
          });
          const data = await response.json();

          adminResultDiv.style.display = 'block';
          if (data.success) {
            adminResultDiv.className = 'result-box success';
            adminResultDiv.innerHTML = 'สร้างสำเร็จ!<br>โค้ดคือ: <strong>' + data.code + '</strong>';
          } else {
            adminResultDiv.className = 'result-box error';
            adminResultDiv.innerHTML = data.message;
          }
        }
      </script>

    </body>
    </html>
  `);
});

// ----------------------------------------------------
// 4. สั่งรัน Server (รองรับพอร์ตของ Render)
// ----------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
                                                            
