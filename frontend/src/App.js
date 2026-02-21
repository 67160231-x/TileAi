import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);

  // --- 1. วางฟังก์ชัน Polling ไว้ตรงนี้ ---
  const pollImageStatus = (id) => {
    // สร้าง Interval ให้ทำงานทุกๆ 3 วินาที
    const interval = setInterval(async () => {
      try {
        console.log("Checking image status for ID:", id);
        const res = await axios.get(`https://tile-ai-api.vercel.app/get-image/${id}`);

        if (res.data.status === 'COMPLETE') {
          // ถ้าวาดเสร็จแล้ว ให้หยุดการ Polling
          clearInterval(interval);
          
          // อัปเดตข้อความในแชทให้แสดงรูปภาพ
          setMessages((prev) => [
            ...prev, 
            { role: 'bot', text: res.data.url, isImage: true }
          ]);
        }
      } catch (err) {
        console.error("Polling error:", err);
        clearInterval(interval); // หยุดถ้าเกิด Error ร้ายแรง
      }
    }, 3000); 
  };

  // --- 2. ฟังก์ชันส่งข้อความหลัก ---
  const sendMessage = async () => {
  if (!input) return;
  
  const userMessage = { role: 'user', text: input };
  setMessages((prev) => [...prev, userMessage]);
  const currentInput = input;
  setInput('');

  try {
    // --- จุดที่แก้ไข: ปรับเงื่อนไขให้เข้ากับเว็บเซรามิก ---
    if (
      currentInput.includes("วาด") || 
      currentInput.includes("ออกแบบ") || 
      currentInput.includes("ดูลาย") ||
      currentInput.includes("ขอดูรูป")
    ) {
      // ส่งไปที่ API วาดรูป
      const res = await axios.post('https://tile-ai-api.vercel.app/generate-image', { prompt: currentInput });
      pollImageStatus(res.data.generationId);
      
      setMessages((prev) => [...prev, { 
        role: 'bot', 
        text: '🎨 กำลังออกแบบลายเซรามิกให้คุณสักครู่นะครับ...' 
      }]);

    } else {
      // ถ้าไม่ใช่การวาดรูป ให้ส่งไปถาม Gemini (แนะนำลาย/ราคา)
      const res = await axios.post('https://tile-ai-api.vercel.app/chat', { prompt: currentInput });
      setMessages((prev) => [...prev, { role: 'bot', text: res.data.text }]);
    }
  } catch (err) {
    console.error(err);
    setMessages((prev) => [...prev, { role: 'bot', text: 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ' }]);
  }
};
const downloadImage = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tile-design-${Date.now()}.png`; // ตั้งชื่อไฟล์ตามเวลา
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    alert('ไม่สามารถดาวน์โหลดรูปภาพได้ในขณะนี้');
  }
};

  /* --- ส่วนการแสดงผล (JSX) --- */
return (
  <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
    <h2>Gemini Chatbot</h2>
    
    {/* ส่วนกล่องข้อความแชท */}
    <div style={{ height: '400px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
      
      {/* ตรงนี้คือ .map() ที่คุณถามถึงครับ */}
      {messages.map((msg, i) => (
  <div key={i} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: '15px' }}>
    <div style={{ 
      display: 'inline-block', 
      padding: '8px 12px', 
      borderRadius: '15px', 
      backgroundColor: msg.role === 'user' ? '#007bff' : '#f1f1f1',
      color: msg.role === 'user' ? 'white' : 'black'
    }}>
      <strong>{msg.role}: </strong>
      
      {/* --- เริ่มเปลี่ยนโค้ดตั้งแต่ตรงนี้เป็นต้นไป --- */}
      {msg.isImage ? (
        <div style={{ marginTop: '5px', textAlign: 'center' }}>
          <img 
            src={msg.text} 
            alt="AI Design" 
            style={{ maxWidth: '100%', borderRadius: '10px', display: 'block', marginBottom: '10px' }} 
          />
          {/* เพิ่มปุ่มดาวน์โหลดใต้รูปภาพ */}
          <button 
            onClick={() => downloadImage(msg.text)}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            💾 ดาวน์โหลดรูปภาพ
          </button>
        </div>
      ) : (
        <span>{msg.text}</span>
      )}
      {/* --- สิ้นสุดส่วนที่ต้องเปลี่ยน --- */}

    </div>
  </div>
))}
      {/* สิ้นสุด .map() */}

    </div>

    {/* ส่วนช่องกรอกข้อความ */}
    <div style={{ display: 'flex', gap: '5px' }}>
      <input 
        value={input} 
        onChange={(e) => setInput(e.target.value)} 
        onKeyDown={(e) => e.key === 'Enter' && sendMessage()} // กด Enter เพื่อส่งได้
        style={{ flex: 1, padding: '8px' }} 
        placeholder="พิมพ์ข้อความ หรือ 'วาดรูป...'"
      />
      <button onClick={sendMessage} style={{ padding: '8px 15px', cursor: 'pointer' }}>Send</button>
    </div>
  </div>
);
}

export default App;