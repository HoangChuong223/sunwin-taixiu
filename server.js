const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
const PORT = process.env.PORT || 5000;

// === Biến trạng thái nâng cao ===
let currentData = {
  id: "binhtool90",
  id_phien: null,
  ket_qua: "",
  pattern: "",
  du_doan: "?",
  trang_thai: "Đang kết nối...",
  last_update: new Date().toISOString(),
  online: false
};

let id_phien_chua_co_kq = null;
let patternHistory = [];
let pendingResults = []; // Lưu kết quả chờ khi mất kết nối
let isManuallyClosed = false;

// === Cấu hình WebSocket ===
const WS_CONFIG = {
  url: "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Origin": "https://play.sun.win"
  },
  reconnectDelay: {
    min: 1000,
    max: 5000
  }
};

// === Tin nhắn với hành vi giống người dùng thật ===
const messagesToSend = [
  {
    data: [1, "MiniGame", "SC_apisunwin123", "binhlamtool90", {
      "info": "{\"ipAddress\":\"2a09:bac1:7aa0:10::2e5:4d\",\"userId\":\"d93d3d84-f069-4b3f-8dac-b4716a812143\",\"username\":\"SC_apisunwin123\",\"timestamp\":1752045925640,\"refreshToken\":\"dd38d05401bb48b4ac3c2f6dc37f36d9.f22dccad89bb4e039814b7de64b05d63\"}",
      "signature": "6FAD7CF6196AFBF0380BC69B59B653A05153D3D0E4E9A07BA43890CC3FB665B92C2E09E5B34B31FD8D74BDCB3B03A29255C5A5C7DFB426A8D391836CF9DCB7E5CEA743FE07521075DED70EFEC7F78C8993BDBF8626D58D3E68D36832CA4823F516B7E41DB353EA79290367D34DF98381089E69EA7C67FB3588B39C9C4D7174B2"
    }],
    delay: 500,
    description: "Xác thực người dùng"
  },
  {
    data: [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    delay: 1500,
    description: "Đăng ký nhận kết quả tài xỉu"
  },
  {
    data: [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }],
    delay: 3000,
    description: "Kết nối lobby"
  },
  {
    data: [6, "Chat", "sendMessage", { content: "Xin chào mọi người!", type: 1 }],
    delay: 8000,
    description: "Tin nhắn chào",
    random: true // Gửi ngẫu nhiên
  }
];

// === Quản lý WebSocket ===
let ws = null;
let pingInterval = null;
let reconnectTimeout = null;
let reconnectAttempts = 0;
let humanLikeActions = [];

// Hàm dự đoán nâng cao
function duDoanTiepTheo(pattern) {
  if (pattern.length < 6) return "?";

  // Phân tích nhiều mẫu hơn
  const last3 = pattern.slice(-3).join('');
  const last4 = pattern.slice(-4).join('');
  const last5 = pattern.slice(-5).join('');

  // Kiểm tra chu kỳ lặp
  const count3 = pattern.join('').split(last3).length - 1;
  const count4 = pattern.join('').split(last4).length - 1;
  const count5 = pattern.join('').split(last5).length - 1;

  // Ưu tiên mẫu dài hơn
  if (count5 >= 2) return last5[0];
  if (count4 >= 2) return last4[0];
  if (count3 >= 2) return last3[0];

  // Thêm logic dự đoán khác nếu cần
  return "?";
}

// Hàm kết nối WebSocket
function connectWebSocket() {
  // Xóa kết nối cũ nếu có
  if (ws) {
    ws.removeAllListeners();
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }

  currentData.trang_thai = "Đang kết nối...";
  currentData.online = false;
  console.log('[⌛] Đang thiết lập kết nối WebSocket...');

  ws = new WebSocket(WS_CONFIG.url, {
    headers: WS_CONFIG.headers
  });

  ws.on('open', () => {
    console.log('[✅] WebSocket đã kết nối thành công');
    currentData.trang_thai = "Đã kết nối";
    currentData.online = true;
    reconnectAttempts = 0;

    // Gửi tin nhắn với độ trễ ngẫu nhiên giống người dùng thật
    messagesToSend.forEach((msg, i) => {
      // Chỉ gửi tin nhắn ngẫu nhiên 50% thời gian
      if (msg.random && Math.random() < 0.5) return;

      const delay = msg.delay + Math.random() * 2000; // Thêm độ trễ ngẫu nhiên
      setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg.data));
          console.log(`[📤] Đã gửi: ${msg.description}`);
          
          // Thêm hành động giống người dùng
          if (Math.random() < 0.3) {
            setTimeout(() => {
              const actions = [
                [6, "Emotion", "sendEmotion", {emotionId: Math.floor(Math.random() * 10) + 1}],
                [6, "Chat", "sendMessage", {content: ["Hi", "Hello", "Chúc may mắn!"][Math.floor(Math.random() * 3)], type: 1}]
              ];
              const action = actions[Math.floor(Math.random() * actions.length)];
              ws.send(JSON.stringify(action));
              console.log('[😊] Đã thực hiện hành động ngẫu nhiên');
            }, 1000 + Math.random() * 3000);
          }
        }
      }, delay);
    });

    // Ping với độ trễ ngẫu nhiên
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.ping();
        console.log('[📶] Đã gửi ping kiểm tra');
      }
    }, 15000 + Math.random() * 10000);

    // Xử lý kết quả chờ đợi nếu có
    if (pendingResults.length > 0) {
      console.log(`[⚠️] Đang xử lý ${pendingResults.length} kết quả chờ...`);
      pendingResults.forEach(result => processResult(result));
      pendingResults = [];
    }
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (Array.isArray(data) && data[1] && typeof data[1] === 'object') {
        const cmd = data[1].cmd;

        // Nhận ID phiên mới
        if (cmd === 1008 && data[1].sid) {
          id_phien_chua_co_kq = data[1].sid;
          console.log(`[🆔] Nhận ID phiên mới: ${id_phien_chua_co_kq}`);
        }

        // Nhận kết quả
        if (cmd === 1003 && data[1].gBB) {
          const resultData = {
            sid: id_phien_chua_co_kq,
            data: data[1],
            timestamp: new Date().toISOString()
          };

          if (currentData.online) {
            processResult(resultData);
          } else {
            console.log('[📦] Lưu kết quả vào hàng đợi chờ kết nối lại');
            pendingResults.push(resultData);
          }
        }
      }
    } catch (e) {
      console.error('[❌] Lỗi xử lý tin nhắn:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('[🔌] WebSocket đã đóng');
    currentData.trang_thai = "Mất kết nối, đang thử lại...";
    currentData.online = false;
    clearInterval(pingInterval);

    if (!isManuallyClosed) {
      // Tăng thời gian kết nối lại sau mỗi lần thất bại
      const baseDelay = Math.min(
        WS_CONFIG.reconnectDelay.min + (reconnectAttempts * 1000),
        WS_CONFIG.reconnectDelay.max
      );
      const jitter = Math.random() * 1000; // Thêm yếu tố ngẫu nhiên
      const delay = baseDelay + jitter;

      console.log(`[⏳] Sẽ thử kết nối lại sau ${Math.round(delay/1000)} giây...`);
      reconnectTimeout = setTimeout(() => {
        reconnectAttempts++;
        connectWebSocket();
      }, delay);
    }
  });

  ws.on('error', (err) => {
    console.error('[❌] Lỗi WebSocket:', err.message);
    currentData.trang_thai = `Lỗi: ${err.message}`;
    currentData.online = false;
  });
}

// Xử lý kết quả
function processResult(resultData) {
  const { d1, d2, d3 } = resultData.data;
  const total = d1 + d2 + d3;
  const result = total > 10 ? "T" : "X";

  // Cập nhật lịch sử
  patternHistory.push(result);
  if (patternHistory.length > 20) patternHistory.shift();

  const text = `${d1}-${d2}-${d3} = ${total} (${result === 'T' ? 'Tài' : 'Xỉu'})`;

  // Dự đoán
  const du_doan = duDoanTiepTheo(patternHistory);

  currentData = {
    ...currentData,
    id_phien: resultData.sid,
    ket_qua: text,
    pattern: patternHistory.join(''),
    du_doan: du_doan === "T" ? "Tài" : du_doan === "X" ? "Xỉu" : "?",
    last_update: new Date().toISOString()
  };

  console.log(`[🎲] Phiên ${resultData.sid}: ${text} → Dự đoán tiếp: ${currentData.du_doan}`);
  id_phien_chua_co_kq = null;
}

// API endpoints
app.get('/taixiu', (req, res) => {
  res.json({
    ...currentData,
    pending_results: pendingResults.length
  });
});

app.get('/', (req, res) => {
  res.send(`
    <h2>🎯 Sunwin Tài Xỉu Real-time</h2>
    <p><a href="/taixiu">Xem dữ liệu JSON</a></p>
    <p>Trạng thái: ${currentData.trang_thai}</p>
    <p>Kết quả gần nhất: ${currentData.ket_qua || 'Chưa có'}</p>
    <p>Dự đoán tiếp: ${currentData.du_doan}</p>
  `);
});

// Xử lý tắt server
process.on('SIGINT', () => {
  console.log('[🛑] Đang tắt server...');
  isManuallyClosed = true;
  if (ws) ws.close();
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  process.exit(0);
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`[🌐] Server đang chạy tại http://localhost:${PORT}`);
  connectWebSocket();
});
