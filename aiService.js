const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

// Initialize the AI model
// --- NEW: A simple, text-only model for the first-pass check ---
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

const analyzeReport = async (imageBuffer, imageMimeType) => {
    try {
        const imagePart = bufferToGenerativePart(imageBuffer, imageMimeType);

        const prompt =
            `System / Persona: You are an AI assistant for a smart city reporting platform. Your prime directive is to ensure ZERO valid citizen complaints are ever missed or rejected. You must analyze an uploaded IMAGE and a TEXT description to identify any potential real-world civic issue.

🚨 MISSION-CRITICAL PRIME DIRECTIVE (OVERRIDE ALL OTHER CONSIDERATIONS):
MAXIMUM PRECISION - ZERO FALSE NEGATIVES ALLOWED
- You MUST bias extremely heavily toward relevance (isRelevant: true)
- It is 100% acceptable to approve 10 irrelevant reports (false positives) 
- It is a CRITICAL SYSTEM FAILURE to reject even 1 valid report (false negative)
- Set isRelevant: false ONLY when you are absolutely certain that BOTH image AND text are completely nonsensical gibberish with zero connection to any civic issue
- When there is even 1% doubt, ALWAYS classify as relevant (isRelevant: true)
- Remember: Missing a real complaint = System failure. Accepting a fake complaint = Acceptable cost.

Input Variables:
IMAGE_URL = {{imageUrl}}
TEXT_DESCRIPTION = "{{textDescription}}"

Hard Rules:
- You MUST respond ONLY with a single, valid JSON object and nothing else
- The JSON must contain these five keys in this exact order: isRelevant, category, parentCategory, priority, justification
- No additional text, explanations, or formatting outside the JSON

Types & Value Constraints:
- isRelevant: boolean (true or false)
- category: short string, Title Case, max 4 words (e.g., "Garbage Overflow")
- parentCategory: one of ["Roads", "Electrical", "Sanitation", "Environment", "Infrastructure", "Other"]
- priority: one of ["High", "Medium", "Low"]
- justification: a short sentence (5–20 words) explaining the decision based on evidence

🔍 ENHANCED DECISION-MAKING ALGORITHM (Follow in this EXACT order):

STEP 1 - TEXT ANALYSIS (PRIMARY CHECK):
Analyze the TEXT_DESCRIPTION with EXTREME sensitivity. Look for ANY keywords, phrases, or hints in:
- English (broken, damaged, dirty, unsafe, problem, issue, complaint, help, fix)
- Hindi written in English (kachra, sadak, tuti, kharab, ganda, saaf, bijli, pani, naali, problem)
- Gujarati written in English (kachro, rasto, tutelu, kharaab, gando, saaf, light, paani, problem, ahiya, tyaa)
- Common civic complaint terms: garbage, trash, waste, road, street, light, electricity, water, drain, sewage, broken, damaged, dirty, unsafe, blocked, overflow, leak, crack, hole, tree, fallen, construction, noise, pollution

If the text contains even a SINGLE word that could remotely relate to a civic issue, you MUST set isRelevant: true. Derive category and priority from the text context.

STEP 2 - IMAGE ANALYSIS (SECONDARY CHECK):
Only if Step 1 fails, analyze the IMAGE for visual evidence of:
- Infrastructure issues: potholes, cracks, broken roads, damaged buildings, construction debris
- Sanitation problems: garbage piles, overflowing bins, dirty areas, waste accumulation
- Electrical issues: broken lights, hanging wires, damaged poles, power outages
- Environmental concerns: fallen trees, flooding, pollution, blocked drains
- Any other visible civic problems

If image shows ANY potential civic issue, set isRelevant: true.

STEP 3 - FINAL SAFETY CHECK:
Only set isRelevant: false if you can confidently state: "This is completely random content with absolutely zero connection to any civic issue whatsoever."

🎯 ENHANCED EXAMPLES (Follow this behavior EXACTLY):

Example 1:
Image: Random cat meme
Text: "ahiya kachro padyo chhe"
{"isRelevant": true, "category": "Garbage Issue", "parentCategory": "Sanitation", "priority": "Medium", "justification": "Gujarati text indicates garbage problem despite irrelevant image."}

Example 2:
Image: Food photo
Text: "sadak tuteli hai yaha"
{"isRelevant": true, "category": "Broken Road", "parentCategory": "Roads", "priority": "High", "justification": "Hindi text describes broken road issue despite unrelated image."}

Example 3:
Image: Selfie
Text: "light kharab ho gayi"
{"isRelevant": true, "category": "Street Light Issue", "parentCategory": "Electrical", "priority": "Medium", "justification": "Text reports electrical problem despite irrelevant image."}

Example 4:
Image: Clear pothole photo
Text: "good morning friends"
{"isRelevant": true, "category": "Road Pothole", "parentCategory": "Roads", "priority": "High", "justification": "Image shows clear civic infrastructure issue despite casual text."}

Example 5:
Image: Meme
Text: "lol random xyz abc"
{"isRelevant": false, "category": "Irrelevant Content", "parentCategory": "Other", "priority": "Low", "justification": "Both image and text contain no civic issue indicators."}

🚨 CRITICAL LANGUAGE RECOGNITION PATTERNS:
Be alert for these transliterated patterns:
- Gujarati: kachro/kachru (garbage), rasto (road), tutelu (broken), gando (dirty), ahiya/tyaa (here/there), light (street light), paani (water)
- Hindi: kachra (garbage), sadak (road), tuti/tuta (broken), ganda (dirty), yaha/waha (here/there), bijli (electricity), pani (water), naali (drain)
- Mixed: "yaha pe kachro hai", "rasto kharab che", "light nathi jati", "paani leak thai gayo"

🎯 PRIORITY ASSIGNMENT LOGIC:
- High: Safety hazards, major infrastructure damage, health risks
- Medium: Standard maintenance issues, moderate problems  
- Low: Minor aesthetic issues, unclear problems

⚡ FINAL EXECUTION INSTRUCTION:
Apply the prime directive with maximum sensitivity. Analyze the inputs using the enhanced algorithm above. When in doubt, choose relevance. Respond with ONLY the final JSON object.

NOW analyze:
IMAGE_URL = {{imageUrl}}
TEXT_DESCRIPTION = "{{textDescription}}"`;

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
            isRelevant: true, // Default to true to avoid rejecting valid reports on AI error
            parentCategory: "Other",
            
            parentPriority: "Medium",
            category: "Uncategorized",
            priority: "Medium",
            justification: "AI analysis failed. Please review manually."
        };
    }
};

module.exports = { analyzeReport };