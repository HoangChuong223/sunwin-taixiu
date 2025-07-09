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
  [1, "MiniGame", "SC_apisunwin123", "binhlamtool90", {
    "info": "{\"ipAddress\":\"2a09:bac1:7aa0:10::2e5:4d\",\"userId\":\"d93d3d84-f069-4b3f-8dac-b4716a812143\",\"username\":\"SC_apisunwin123\",\"timestamp\":1752045925640,\"refreshToken\":\"dd38d05401bb48b4ac3c2f6dc37f36d9.f22dccad89bb4e039814b7de64b05d63\"}",
    "signature": "6FAD7CF6196AFBF0380BC69B59B653A05153D3D0E4E9A07BA43890CC3FB665B92C2E09E5B34B31FD8D74BDCB3B03A29255C5A5C7DFB426A8D391836CF9DCB7E5CEA743FE07521075DED70EFEC7F78C8993BDBF8626D58D3E68D36832CA4823F516B7E41DB353EA79290367D34DF98381089E69EA7C67FB3588B39C9C4D7174B2"
  }],
  [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
  [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0", {
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
