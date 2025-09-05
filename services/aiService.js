const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

// Initialize the AI model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    },
  };
}

const analyzeReport = async (textDescription, imageBuffer, imageMimeType) => {
  try {
    const imagePart = bufferToGenerativePart(imageBuffer, imageMimeType);

     const prompt = `
      **Persona:** You are an AI assistant for a smart city civic issues platform in India.
      **Primary Goal:** Analyze the user's IMAGE to identify a civic issue. Use the text description as secondary context.
      **Input Handling:** The text description is: "${textDescription}". It may be in English, Hindi, or Hinglish. Prioritize the image.

      **Output Requirements:**
      You must respond ONLY with a valid JSON object with four keys: "category", "parentCategory", "priority", and "justification".

      1.  **"category":** Generate a short, specific category of 2-4 words (e.g., "Garbage Overflowing", "Damaged Public Bench").
      2.  **"parentCategory":** Classify your specific category into one of these exact parent categories: ["Roads", "Electrical", "Sanitation", "Environment", "Infrastructure", "Other"].
      3.  **"priority":** Choose one: ["High", "Medium", "Low"].
      4.  **"justification":** A one-sentence explanation in simple English.

      **Example:** Image shows a huge pile of garbage. Text says "yaha pe kachra pada hai".
      Your response:
      {
        "category": "Garbage Overflow",
        "parentCategory": "Sanitation",
        "priority": "Medium",
        "justification": "The image shows a large amount of garbage overflowing from a public bin."
      }

      Now, analyze the user's report and provide your JSON response.
    `;
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedResult = JSON.parse(jsonString);

    // Add a final validation to ensure the result is in the correct format
    if (!parsedResult.category || !parsedResult.priority) {
      throw new Error("AI response was not in the expected format.");
    }
    
    return parsedResult;

  } catch (error) {
    console.error("Error analyzing report with AI:", error);
    // Fallback in case of AI error
    return {
      category: "Uncategorized",
      priority: "Medium",
      justification: "AI analysis failed. Please review manually."
    };
  }
};

module.exports = { analyzeReport };