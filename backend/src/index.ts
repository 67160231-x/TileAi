import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Gemini API Setup ---
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ ไม่พบ GEMINI_API_KEY ในไฟล์ .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

// --- Routes ---

// Route สำหรับการ Chat
app.post('/chat', async (req: Request, res: Response) => {
    try {
        const { prompt }: { prompt: string } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "โปรดระบุข้อความ (prompt)" });
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", // แนะนำเวอร์ชันปัจจุบันที่เสถียรครับ
            systemInstruction: `คุณคือ "Ceramic Expert AI" ผู้เชี่ยวชาญด้านผลิตภัณฑ์เซรามิก...` 
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ text });

    } catch (error: any) {
        console.error("❌ Gemini API Error:", error.message);
        res.status(500).json({ 
            error: "ขออภัย เกิดข้อผิดพลาดในการประมวลผล",
            details: error.message 
        });
    }
});

// --- Route สำหรับวาดรูป (Leonardo.ai) ---
app.post('/generate-image', async (req: Request, res: Response) => {
    try {
        const { prompt }: { prompt: string } = req.body;
        const ceramicEnrichedPrompt = `A high-quality ceramic product with ${prompt} pattern, exquisite ceramic texture, studio lighting, white background, professional product photography`;

        const options = {
            method: 'POST',
            url: 'https://cloud.leonardo.ai/api/rest/v1/generations',
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'authorization': `Bearer ${process.env.LEONARDO_API_KEY}`
            },
            data: {
                prompt: ceramicEnrichedPrompt,
                modelId: "7b592283-e8a7-4c5a-9ba6-d18c31f258b9",
                width: 512,
                height: 512,
                num_images: 1,
            }
        };

        const response = await axios.request(options);
        const generationId = response.data.sdGenerationJob?.generationId || response.data.generationJob?.generationId;

        if (!generationId) {
            return res.status(500).json({ error: "ไม่ได้รับ ID จาก Leonardo", raw: response.data });
        }

        res.json({ generationId, message: "กำลังออกแบบลายเซรามิกให้คุณ..." });

    } catch (error: any) {
        res.status(500).json({ error: "วาดรูปไม่สำเร็จ" });
    }
});

// --- Route สำหรับเช็คสถานะรูป ---
app.get('/get-image/:id', async (req: Request, res: Response) => {
    try {
        const generationId = req.params.id;
        const response = await axios.get(
            `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
            {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${process.env.LEONARDO_API_KEY}`
                }
            }
        );

        const data = response.data.generations_by_pk;
        if (data && data.generated_images.length > 0) {
            res.json({ status: 'COMPLETE', url: data.generated_images[0].url });
        } else {
            res.json({ status: 'PENDING' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req: Request, res: Response) => {
    res.send("Chatbot Server is running! 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on: http://localhost:${PORT}`);
});