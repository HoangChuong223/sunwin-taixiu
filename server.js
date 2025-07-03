const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

let currentData = { id: "binhtool90", id_phien: null, ket_qua: "" };
let id_phien_chua_co_kq = null;

let ws = null;
let pingInterval = null;
let reconnectTimeout = null;
let isManuallyClosed = false;

const messagesToSend = [
  [1, "MiniGame", "SC_anh231009", "231009", {
    "info": "{\"ipAddress\":\"116.110.43.11\",\"userId\":\"11fddc91-f4fe-4c79-bfa6-1239045b4304\",\"username\":\"SC_anh231009\",\"timestamp\":1750056017406,\"refreshToken\":\"87545aa8905841f490cbfe598a094b02.3a9655ef18e14b62ad6a2491fcdfe27f\"}",
    "signature": "5940F2D9267E934C5662C98E8B129C426EE7EF07B2C19F75280E1C8FD19451AB441092CE6A69BF3A6B4A20D3BD4AA2BA1847F40398E96B1C24C5EFCA50F7649A93E993908282036680442728310B2143B60CBA09CA3506AEA9B692C34E66742E94AC9CA4CBC51DDE8231A82E888E50842F1CBA8552FF760B0FD7E06AECE7B685"
  }],
  [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
  [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjB9.p56b5g73I9wyoVu4db679bOvVeFJWVjGDg_ulBXyav8", {
    headers: {
     Host": "websocket.azhkthg1.net",
                    "Origin": "https://play.sun.win",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0",
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Pragma": "no-cache",
                    "Cache-Control": "no-cache"
    }
  });

  ws.on('open', () => {
    console.log('[✅] WebSocket kết nối');
    messagesToSend.forEach((msg, i) => {
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        } else {
          console.log('[⛔] Không gửi được vì WebSocket chưa mở');
        }
      }, i * 600);
    });

    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 15000);
  });

  ws.on('pong', () => {
    console.log('[📶] Nhận phản hồi ping từ server');
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (Array.isArray(data) && typeof data[1] === 'object') {
        const cmd = data[1].cmd;
        if (cmd === 1008 && data[1].sid) {
          id_phien_chua_co_kq = data[1].sid;
        }

        if (cmd === 1003 && data[1].gBB) {
          const { d1, d2, d3 } = data[1];
          const total = d1 + d2 + d3;
          const result = total > 10 ? "Tài" : "Xỉu";
          const text = `${d1}-${d2}-${d3} = ${total} (${result})`;

          currentData = {
            id: "binhtool90",
            id_phien: id_phien_chua_co_kq,
            ket_qua: text
          };

          console.log(`Phiên: ${id_phien_chua_co_kq} → ${text}`);
          id_phien_chua_co_kq = null;
        }
      }
    } catch (e) {
      console.error('[Lỗi xử lý dữ liệu]:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('[🔌] WebSocket đóng. Kết nối lại sau 3s...');
    clearInterval(pingInterval);
    if (!isManuallyClosed) {
      reconnectTimeout = setTimeout(connectWebSocket, 3000);
    }
  });

  ws.on('error', (err) => {
    console.error('[❌] WebSocket lỗi:', err.message);
  });
}

// API
app.get('/taixiu', (req, res) => {
  res.json(currentData);
});

app.get('/', (req, res) => {
  res.send(`<h2>🎯 Kết quả Sunwin Tài Xỉu</h2><p>👉 <a href="/taixiu">Xem JSON</a></p>`);
});

app.listen(PORT, () => {
  console.log(`[🌐] Server đang chạy tại http://localhost:${PORT}`);
  connectWebSocket();
});
