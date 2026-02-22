import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [area, setArea] = useState(''); // ถ้าไม่ประกาศตรงนี้ โค้ดใน else จะหาค่า area ไม่เจอ

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
    // --- ส่วนที่ 1: ตรวจสอบว่าผู้ใช้สั่งให้ "วาดรูป" หรือไม่ ---
    if (
      currentInput.includes("วาด") || 
      currentInput.includes("ออกแบบ") || 
      currentInput.includes("ดูลาย") ||
      currentInput.includes("ขอดูรูป")
    ) {
      // ปรับ Prompt ให้เจนเป็นรูปห้อง (เพื่อให้หัวหน้าว้าว)
      const interiorPrompt = `Photorealistic interior view of a modern empty room, the floor is fully covered with seamless ${currentInput} ceramic tiles, 8k resolution, architectural photography, bright natural lighting, highly detailed floor texture`;

      const res = await axios.post('https://tile-ai-api.vercel.app/generate-image', { 
        prompt: interiorPrompt 
      });

      pollImageStatus(res.data.generationId);
      
      setMessages((prev) => [...prev, { 
        role: 'bot', 
        text: '🏘️ กำลังจำลองการปูลายเซรามิกในห้องจริงให้คุณสักครู่นะครับ...' 
      }]);

    // --- ส่วนที่ 2: ถ้าเป็นการ "พูดคุย/ถามราคา" (Gemini) ---
    } else {
      // เพิ่มการเช็คค่า area เข้าไปในคำสั่ง
      const pricingInstruction = `
        คุณคือผู้เชี่ยวชาญด้านกระเบื้องเซรามิกของ TileAi 
        ข้อมูลราคาสำหรับประเมินให้ลูกค้า:
        - ลายทั่วไป/สีพื้น: 150-250 บาท/ตร.ม.
        - ลายไม้/ลายหินอ่อน: 350-550 บาท/ตร.ม.
        - ลายพรีเมียม/ลายไทยเบญจรงค์: 800-1,500 บาท/ตร.ม.
        - ค่าแรงปูพื้น: 200-300 บาท/ตร.ม.
        
        ${area ? `สำคัญมาก: ตอนนี้ลูกค้ากรอกพื้นที่มาแล้วคือ ${area} ตารางเมตร ช่วยคำนวณราคาสินค้าและค่าแรงรวมให้เขาด้วย` : `หมายเหตุ: ลูกค้ายังไม่ได้ระบุพื้นที่ ถ้าเขาถามราคาให้ประเมินเป็นราคาต่อ ตร.ม.`}
        
        คำแนะนำ: ตอบอย่างสุภาพ และสรุปงบประมาณให้ชัดเจน
      `;

      // ส่งไปหา Gemini
      const res = await axios.post('https://tile-ai-api.vercel.app/chat', { 
        prompt: pricingInstruction + "\n\nลูกค้าถามว่า: " + currentInput 
      });
      
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
  background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 100%)',
  padding: '20px'
}}>
  <div style={{ maxWidth: '768px', margin: 'auto' }}>
    
    {/* --- ส่วนที่เพิ่ม: กล่องคำนวณพื้นที่ --- */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px', 
      marginBottom: '10px',
      padding: '0 5px'
    }}>
      <label style={{ fontSize: '13px', color: '#565869', fontWeight: '600' }}>พื้นที่สำหรับคำนวณราคา:</label>
      <input 
        type="number" 
        value={area} 
        onChange={(e) => setArea(e.target.value)} 
        placeholder="ระบุตัวเลข" 
        style={{ 
          width: '80px', 
          padding: '6px 10px', 
          borderRadius: '8px', 
          border: '1px solid #e5e5e5',
          outline: 'none',
          fontSize: '14px'
        }} 
      />
      <span style={{ fontSize: '13px', color: '#565869' }}>ตร.ม.</span>
    </div>

    {/* ส่วนกล่องแชทเดิมของคุณ */}
    <div style={{ 
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
          boxSizing: 'border-box',
          backgroundColor: '#fff'
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
  </div>
);
}

export default App;