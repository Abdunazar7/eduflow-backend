// ============================================
// GROQ AI INTEGRATION - TEZKOR REFERANS
// ============================================

/**
 * ✅ TAQDIM QILINGAN XUSUSIYATLAR:
 *
 * 1. Groq API Integration
 *    - Model: llama-3.3-70b-versatile
 *    - API: https://api.groq.com/openai/v1/chat/completions
 *    - Til: O'zbek tili
 *    - Yordamchi: "EduFlow LMS yordamchisi"
 *
 * 2. REST API Endpoint
 *    - POST /api/aichat
 *    - Request: { message: string }
 *    - Response: { reply: string, model?: string, tokens?: {...} }
 *
 * 3. CORS Konfiguratsiyasi
 *    - Origin: http://localhost:5173, http://localhost:3000
 *    - Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
 *    - Headers: Content-Type, Authorization
 *
 * 4. Global API Prefix
 *    - Barcha API'lar /api prefiksi bilan
 *    - Masalan: /api/aichat, /api/users va h.k.
 *
 * 5. TypeScript Interfaces
 *    - GroqMessage, GroqRequestBody, GroqResponse
 *    - GroqChoice, AichatResponse (exported)
 *
 * 6. Xato Boshqarish (Try-Catch)
 *    - 400: Validatsiya xatosi
 *    - 401: API kalit xatosi
 *    - 429: Rate limit xatosi
 *    - 408/Timeout: Ulanish vaqti
 *    - 500: Server xatosi
 */

// ============================================
// FOYDALANISH MISOLI
// ============================================

// Frontend (JavaScript)
async function sendMessageToAI(message: string) {
  try {
    const response = await fetch('http://localhost:3000/api/aichat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Xato:', data);
      return null;
    }

    console.log('Javob:', data.reply);
    console.log('Tokenlar:', data.tokens);
    return data;
  } catch (error) {
    console.error('Xato:', error);
    return null;
  }
}

// Ishlash
sendMessageToAI(`O'zbek tilida savol?`);

// ============================================
// cURL TEST
// ============================================
/*
curl -X POST http://localhost:3000/api/aichat \
  -H "Content-Type: application/json" \
  -d '{"message": "Salom, sen kim?"}'
*/

// ============================================
// SWAGGER DOCUMENTATION
// ============================================
// Brauzer: http://localhost:3000/api/docs
// API Tag: AI Chat
// Endpoint: POST /aichat

// ============================================
// FAYLLARDAN BATAFSIL
// ============================================

// 📄 src/aichat/aichat.service.ts
// - Groq API orqali AI so'rovlari
// - TypeScript Interfaces
// - Xato boshqarish (try-catch)
// - Temperature: 0.7, MaxTokens: 2048

// 📄 src/aichat/aichat.controller.ts
// - POST /aichat endpoint
// - Swagger dokumentatsiyasi
// - Response tipi: Promise\<AichatResponse\>

// 📄 src/aichat/dto/create-aichat.dto.ts
// - message: string (validatsiya)
// - Min: 1, Max: 5000 belgi

// 📄 src/main.ts
// - CORS: ['http://localhost:5173', 'http://localhost:3000']
// - Global prefix: 'api'
// - Validation pipe: enabled

// ============================================
// PRODUCTION CHECKLIST
// ============================================

// ☐ .env faylga API kalit qo'shing
// ☐ CORS origin'ni production domeniga o'zgartiring
// ☐ Rate limiting o'rnatish
// ☐ Logging qo'shing
// ☐ API kalit rotationini o'rnatish
// ☐ Trolebilish/monitoring qo'shing
// ☐ Error handling seesga o'shing

// ============================================
// KERAKLI PAKETLAR (Already installed)
// ============================================
// - axios ✅
// - @nestjs/common ✅
// - @nestjs/swagger ✅
// - class-validator ✅
// - class-transformer ✅

// ============================================
// MURAKKAB SO'ROVLAR UCHUN
// ============================================

// Multi-turn conversation uchun - xabarlar tarixini saqlang:
const conversationHistory = [
  { role: 'system', content: `Siz EduFlow LMS yordamchisisiz...` },
  { role: 'user', content: `Birinchi savol` },
  { role: 'assistant', content: `Birinchi javob` },
  { role: 'user', content: `Ikkinchi savol (kontekst bilan)` },
];

// ============================================
// FOYDALANUVCHI XAVFSIZLIGI
// ============================================
// - Xabarlar maxfiy qoida bo'yicha validatsiya qilinadi
// - XSS/Injection hujumlaridan himoya
// - Rate limiting tavsiya qilinadi
// - API kalit .env'da saqlangan

// ============================================
// TESHKIL ETUVCHI KOMANDA
// ============================================
console.log('✅ Groq AI Integration - Tayyor!');
console.log('📝 API: POST http://localhost:3000/api/aichat');
console.log('📚 Docs: http://localhost:3000/api/docs');
console.log('🚀 npm run start:dev');
