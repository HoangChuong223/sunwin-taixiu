const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

let currentData = {
  id: "binhtool90",
  id_phien: null,
  ket_qua: "",
  pattern: "",
  du_doan: "?"
};

let id_phien_chua_co_kq = null;
let patternHistory = [];

const messagesToSend = [
  [1, "MiniGame", "SC_apisunwin123", "binhlamtool90", {
    "info": "{\"ipAddress\":\"2a09:bac1:7aa0:10::2e5:4d\",\"userId\":\"d93d3d84-f069-4b3f-8dac-b4716a812143\",\"username\":\"SC_apisunwin123\",\"timestamp\":1752045925640,\"refreshToken\":\"dd38d05401bb48b4ac3c2f6dc37f36d9.f22dccad89bb4e039814b7de64b05d63\"}",
    "signature": "6FAD7CF6196AFBF0380BC69B59B653A05153D3D0E4E9A07BA43890CC3FB665B92C2E09E5B34B31FD8D74BDCB3B03A29255C5A5C7DFB426A8D391836CF9DCB7E5CEA743FE07521075DED70EFEC7F78C8993BDBF8626D58D3E68D36832CA4823F516B7E41DB353EA79290367D34DF98381089E69EA7C67FB3588B39C9C4D7174B2"
  }],
  [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
  [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

let ws = null;
let pingInterval = null;
let reconnectTimeout = null;
let isManuallyClosed = false;

function duDoanTiepTheo(pattern) {
  if (pattern.length < 6) return "?";
  const last3 = pattern.slice(-3).join('');
  const last4 = pattern.slice(-4).join('');
  if (pattern.join('').split(last3).length - 1 >= 2) return last3[0];
  if (pattern.join('').split(last4).length - 1 >= 2) return last4[0];
  return "?";
}

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0", {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Origin": "https://play.sun.win"
    }
  });

  ws.on('open', () => {
    console.log('[✅] WebSocket kết nối');
    messagesToSend.forEach((msg, i) => {
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      }, i * 600);
    });
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 15000);
  });

  ws.on('pong', () => {
    console.log('[📶] Ping OK');
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (!Array.isArray(data) || typeof data[1] !== 'object') return;
      const cmd = data[1].cmd;

      if (cmd === 1008 && data[1].sid) {
        id_phien_chua_co_kq = data[1].sid;
      }

      if (cmd === 1003 && data[1].gBB) {
        const { d1, d2, d3 } = data[1];
        const total = d1 + d2 + d3;
        const result = total > 10 ? "T" : "X";
        patternHistory.push(result);
        if (patternHistory.length > 20) patternHistory.shift();

        const text = `${d1}-${d2}-${d3} = ${total} (${result === 'T' ? 'Tài' : 'Xỉu'})`;
        const du_doan = duDoanTiepTheo(patternHistory);

        currentData = {
          id: "binhtool90",
          id_phien: id_phien_chua_co_kq,
          ket_qua: text,
          pattern: patternHistory.join(''),
          du_doan: du_doan === "T" ? "Tài" : du_doan === "X" ? "Xỉu" : "?"
        };

        console.log(`📌 Phiên ${id_phien_chua_co_kq}: ${text} → Dự đoán: ${currentData.du_doan}`);
        id_phien_chua_co_kq = null;
      }
    } catch (err) {
      console.error('[❗] Lỗi xử lý tin nhắn:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('[🔌] WS ngắt. Đang thử kết nối lại...');
    clearInterval(pingInterval);
    ws = null;
    if (!isManuallyClosed) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(connectWebSocket, 3000);
    }
  });

  ws.on('error', (err) => {
    console.error('[❌] WebSocket lỗi:', err.message);
  });
}

// === Keep-alive tránh Render bị ngủ ===
setInterval(() => {
  http.get(`http://localhost:${PORT}/taixiu`);
  console.log('[⏰] Ping giữ kết nối Render...');
}, 1000 * 60 * 4.5); // 4.5 phút

// === API Routes ===
app.get('/taixiu', (req, res) => {
  res.json(currentData);
});

app.get('/', (req, res) => {
  res.send(`<h2>🎯 Kết quả Sunwin Tài Xỉu</h2><p><a href="/taixiu">Xem JSON</a></p>`);
});

// === Graceful Shutdown ===
process.on('SIGINT', () => {
  console.log('\n[🛑] Tắt server...');
  isManuallyClosed = true;
  ws?.close();
  process.exit();
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`[🌐] Server chạy tại http://localhost:${PORT}`);
  connectWebSocket();
});
