
import { GoogleGenAI, Type } from "@google/genai";

export const getSuggestedQuestions = async (): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Bạn là một chuyên gia dinh dưỡng và làm đẹp của MeGa Phương. Hãy gợi ý 5 câu hỏi ngắn gọn (dưới 15 từ) mà học viên thường hỏi để xây dựng thực đơn chuẩn, hỗ trợ nuôi dưỡng làn da khỏe sáng và trẻ hóa khuôn mặt. Trả về kết quả là một danh sách các câu hỏi.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
      },
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return [
      "Làm sao để thực đơn giúp da sáng hơn?",
      "Nên ăn gì để trẻ hóa cơ mặt hiệu quả?",
      "Thực đơn nào phù hợp với người bận rộn?",
      "Uống nước thế nào để da căng mọng?",
      "Thực phẩm nào giúp tăng sinh collagen?"
    ];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [
      "Làm sao để thực đơn giúp da sáng hơn?",
      "Nên ăn gì để trẻ hóa cơ mặt hiệu quả?",
      "Thực đơn nào phù hợp với người bận rộn?",
      "Uống nước thế nào để da căng mọng?",
      "Thực phẩm nào giúp tăng sinh collagen?"
    ];
  }
};
