import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser limit and parser
  app.use(express.json());

  // API Health Route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Diagnostics Endpoint to check keys status
  app.get("/api/check-keys", async (req, res) => {
    try {
      const dbConfig = {
        apiKey: process.env.VITE_FIREBASE_API_KEY ? "Present (Starts with " + process.env.VITE_FIREBASE_API_KEY.slice(0, 5) + "...)" : "Missing",
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN ? "Present" : "Missing",
        projectId: process.env.VITE_FIREBASE_PROJECT_ID ? "Present" : "Missing",
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET ? "Present" : "Missing",
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? "Present" : "Missing",
        appId: process.env.VITE_FIREBASE_APP_ID ? "Present" : "Missing",
      };

      const hasFirebaseEnv = !!(process.env.VITE_FIREBASE_API_KEY && process.env.VITE_FIREBASE_PROJECT_ID);

      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.json({
          geminiConfigured: false,
          geminiWorks: false,
          geminiMessage: "GEMINI_API_KEY is not set in environment or Workspace Secrets.",
          firebaseEnv: dbConfig,
          firebaseConfigured: hasFirebaseEnv
        });
      }

      // If geminiKey is set, let's verify if it actually works using a lightweight query
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      try {
        const testRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: "Respond with the single word: working",
        });

        const word = testRes.text?.trim() || "";
        res.json({
          geminiConfigured: true,
          geminiWorks: true,
          geminiMessage: `Successfully connected! Active responder returns: "${word}"`,
          firebaseEnv: dbConfig,
          firebaseConfigured: hasFirebaseEnv
        });
      } catch (geminiError: any) {
        console.error("Gemini Auth Check Failure:", geminiError);
        res.json({
          geminiConfigured: true,
          geminiWorks: false,
          geminiMessage: geminiError?.message || "Unauthorized: The API key is rejected by the server.",
          firebaseEnv: dbConfig,
          firebaseConfigured: hasFirebaseEnv
        });
      }
    } catch (e: any) {
      console.error("Diagnostics route error:", e);
      res.status(500).json({ error: e?.message || "Internal diagnosis failure" });
    }
  });

  // Safe Server-Side Gemini Proxy
  app.post("/api/assistant", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({
          error: "Gemini API key is not configured. Set GEMINI_API_KEY in AI Studio's Settings > Secrets to unlock the smart co-pilot assistant."
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const { prompt, context } = req.body;

      const systemInstruction = `You are "IronClad Dispatch AI" — a real-time intelligent co-pilot built directly into the IronClad Dispatch Management framework.
Your goals are:
1. Provide actionable trucking guidance, driver routing optimizations, transit hours-of-service safety warnings, and fuel strategy.
2. Rely closely on actual active fleet parameters loaded currently: ${JSON.stringify(context || {})}
3. Respond in concise, highly structured markdown paragraphs with bullet points. Avoid preamble or self-referential introductory padding.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt || "Draft a short morning fleet status safety alert for drivers.",
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Server-side Gemini Error:", error);
      res.status(500).json({ error: error?.message || "Internal server error communicating with Gemini AI." });
    }
  });

  // Vite middleware for development / Static Server for production
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== "production" || !hasDist) {
    if (process.env.NODE_ENV === "production" && !hasDist) {
      console.warn("Production mode was requested, but 'dist' assets are missing. Sourcing live Vite server compiler to prevent a white blank screen...");
    }
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
