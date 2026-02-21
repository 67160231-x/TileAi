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
  <div style={{ 
    minHeight: '100vh', 
    backgroundColor: '#f0f2f5', 
    backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', 
    backgroundSize: '20px 20px',
    padding: '40px 20px', 
    fontFamily: "'Inter', sans-serif" 
  }}>
    <div style={{ 
      maxWidth: '800px', 
      margin: 'auto', 
      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
      borderRadius: '20px', 
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '80vh'
    }}>
      
      {/* Header */}
      <div style={{ padding: '20px', backgroundColor: '#007bff', color: 'white', textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '24px', letterSpacing: '1px' }}>✨ TileAi Designer</h2>
        <p style={{ margin: '5px 0 0', opacity: 0.8, fontSize: '14px' }}>ออกแบบลายเซรามิกด้วย AI อัจฉริยะ</p>
      </div>

      {/* Chat Area */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px',
        backgroundColor: '#ffffff' 
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '50px', color: '#9ca3af' }}>
            <div style={{ fontSize: '50px' }}>🎨</div>
            <p>ลองพิมพ์ว่า "วาดรูปลายเซรามิกสีน้ำเงินขาว" ดูสิ!</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ 
            display: 'flex', 
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' 
          }}>
            <div style={{ 
              maxWidth: '75%', 
              padding: '12px 18px', 
              borderRadius: msg.role === 'user' ? '20px 20px 0 20px' : '20px 20px 20px 0', 
              backgroundColor: msg.role === 'user' ? '#007bff' : '#f3f4f6',
              color: msg.role === 'user' ? 'white' : '#1f2937',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
              lineHeight: '1.5'
            }}>
              <strong style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.7 }}>
                {msg.role === 'user' ? 'คุณ' : 'TileAi Bot'}
              </strong>
              
              {msg.isImage ? (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <img 
                    src={msg.text} 
                    alt="AI Design" 
                    style={{ width: '100%', borderRadius: '12px', border: '2px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} 
                  />
                  <button 
                    onClick={() => downloadImage(msg.text)}
                    style={{
                      marginTop: '12px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: '0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: '12px auto 0'
                    }}
                  >
                    💾 ดาวน์โหลดผลงาน
                  </button>
                </div>
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
            style={{ 
              flex: 1, 
              padding: '12px 20px', 
              borderRadius: '25px', 
              border: '1px solid #d1d5db', 
              outline: 'none',
              fontSize: '16px'
            }} 
            placeholder="พิมพ์คำสั่งออกแบบ เช่น 'ขอดูลายดอกไม้สีทอง'..."
          />
          <button 
            onClick={sendMessage} 
            style={{ 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: '0.2s',
              boxShadow: '0 4px 10px rgba(0,123,255,0.3)'
            }}
          >
            🚀
          </button>
        </div>
      </div>
    </div>
  </div>
);
}

export default App;