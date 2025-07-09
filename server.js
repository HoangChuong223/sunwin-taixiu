const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

let currentData = { id: "SC_bottxabcdxyz", id_phien: null, ket_qua: "" };
let id_phien_chua_co_kq = null;

let ws = null;
let pingInterval = null;
let reconnectTimeout = null;
let isManuallyClosed = false;

const messagesToSend = [
  [1, "MiniGame", "SC_bottxabcdxyz", "bottxabcdxyz", {
    "info": "{\"ipAddress\":\"171.236.49.159\",\"userId\":\"cc177754-d16b-400e-b81f-87a8fc6ad236\",\"username\":\"SC_bottxabcdxyz\",\"timestamp\":1751448639234,\"refreshToken\":\"750a2e9146904153996a71c317f149aa.99034c981a764d789fd7518be0574554\"}",
    "signature": "3331965A68D24B7FFD8754F1271B977EA167C16E6EA9D545F17513543B9BA4B10232D30C759C8ABA0EA7F4798681CBCDFD3E0E71E25828FFD6829A6EFDA24B2F5343172683A1C8D94E2889EFAAC9384F4C54F0E855AF577BCB79AFF925ABAB60E3A1557A261A9AD4B6EC079BC3BE843DC13D0BDF66381B6A648954415B8400FD"
  }],
  [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
  [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjB9.p56b5g73I9wyoVu4db679bOvVeFJWVjGDg_ulBXyav8", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0",
      "Origin": "https://play.sun.win"
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
            id: "SC_bottxabcdxyz",
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
    console.log('[🔌] WebSocket đóng. Kết nối lại sau 2s...');
    clearInterval(pingInterval);
    if (!isManuallyClosed) {
      reconnectTimeout = setTimeout(connectWebSocket, 2500);
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
