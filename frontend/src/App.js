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
  // 1. สร้างคำสั่งใหม่ที่ "บังคับ" ให้ AI วาดรูปห้อง
  const interiorPrompt = `Photorealistic interior view of a modern empty room, the floor is fully covered with seamless ${currentInput} ceramic tiles, 8k resolution, architectural photography, bright natural lighting, highly detailed floor texture`;

  // 2. ส่ง interiorPrompt ไปที่ API แทนที่ currentInput เดิม
  const res = await axios.post('https://tile-ai-api.vercel.app/generate-image', { 
    prompt: interiorPrompt 
  });

  pollImageStatus(res.data.generationId);
  
  setMessages((prev) => [...prev, { 
    role: 'bot', 
    text: '🏘️ กำลังจำลองการปูลายเซรามิกในห้องจริงให้คุณสักครู่นะครับ...' 
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
    display: 'flex', 
    flexDirection: 'column', 
    height: '100vh', 
    backgroundColor: '#ffffff', // พื้นหลังขาวแบบ ChatGPT
    color: '#343541', 
    fontFamily: "'Saira', 'Helvetica', sans-serif" 
  }}>
    
    {/* Header แบบเรียบๆ */}
    <div style={{ 
      padding: '15px', 
      textAlign: 'center', 
      borderBottom: '1px solid #e5e5e5',
      fontWeight: '600',
      fontSize: '1.1rem'
    }}>
      TileAi 4.0
    </div>

    {/* Chat History Area */}
    <div style={{ 
      flex: 1, 
      overflowY: 'auto', 
      paddingBottom: '100px' // กันปุ่มบังข้อความล่างสุด
    }}>
      {messages.length === 0 ? (
        <div style={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: '1.5rem', 
          fontWeight: '600', 
          color: '#c5c5d2' 
        }}>
          How can I help you design today?
        </div>
      ) : (
        messages.map((msg, i) => (
          <div key={i} style={{ 
            backgroundColor: msg.role === 'user' ? '#ffffff' : '#f7f7f8', // สลับสีพื้นหลังแบบ ChatGPT รุ่นก่อน
            borderBottom: '1px solid #e5e5e5',
            padding: '25px 20px'
          }}>
            <div style={{ 
              maxWidth: '768px', 
              margin: 'auto', 
              display: 'flex', 
              gap: '20px',
              alignItems: 'flex-start'
            }}>
              {/* Avatar Icon */}
              <div style={{ 
                width: '30px', 
                height: '30px', 
                borderRadius: '2px', 
                backgroundColor: msg.role === 'user' ? '#5436da' : '#19c37d', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                flexShrink: 0
              }}>
                {msg.role === 'user' ? 'U' : 'AI'}
              </div>

              {/* Message Content */}
              <div style={{ flex: 1, lineHeight: '1.6', fontSize: '16px' }}>
                {msg.isImage ? (
                  <div style={{ marginTop: '10px' }}>
                    <img 
                      src={msg.text} 
                      alt="AI Design" 
                      style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }} 
                    />
                    <button 
                      onClick={() => downloadImage(msg.text)}
                      style={{
                        marginTop: '15px',
                        backgroundColor: 'transparent',
                        border: '1px solid #d9d9e3',
                        padding: '5px 12px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      💾 Save Image
                    </button>
                  </div>
                ) : (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>

    {/* Input Area - วางลอยด้านล่าง */}
    <div style={{ 
      position: 'fixed', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 50%)',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '768px', 
        margin: 'auto', 
        position: 'relative',
        boxShadow: '0 0 15px rgba(0,0,0,0.1)',
        borderRadius: '12px'
      }}>
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
          style={{ 
            width: '100%', 
            padding: '14px 45px 14px 16px', 
            borderRadius: '12px', 
            border: '1px solid #e5e5e5', 
            outline: 'none',
            fontSize: '16px',
            boxSizing: 'border-box'
          }} 
          placeholder="Message TileAi..."
        />
        <button 
          onClick={sendMessage} 
          style={{ 
            position: 'absolute', 
            right: '10px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            backgroundColor: input ? '#19c37d' : 'transparent', 
            color: input ? 'white' : '#d9d9e3', 
            border: 'none', 
            borderRadius: '5px',
            padding: '5px',
            cursor: 'pointer',
            transition: '0.3s'
          }}
        >
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
      <div style={{ textAlign: 'center', fontSize: '12px', color: '#8e8ea0', marginTop: '10px' }}>
        TileAi can make mistakes. Check important info.
      </div>
    </div>
  </div>
);
}

export default App;