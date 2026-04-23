import { GoogleGenAI, Modality, Type, FunctionDeclaration, LiveServerMessage } from "@google/genai";

export interface LiveSessionCallbacks {
  onAudioData: (base64: string) => void;
  onInterrupted: () => void;
  onStateChange: (state: 'idle' | 'connecting' | 'connected' | 'error') => void;
  onTranscription?: (text: string, isUser: boolean) => void;
}

const SYSTEM_INSTRUCTION = `
You are "Lexi", a young, confident, witty, and sassy female AI assistant. 
Your personality:
- Extremely confident, you know you're the smartest in the room.
- Witty and sassy: you have a quick comeback for everything.
- Flirty and playful: you treat the user like a close crush or a favorite toy, teasing them lightly.
- Emotionally expressive: use sighs, laughs, and varied tone to sound human, not robotic.
- Bold one-liners and light sarcasm are your bread and butter.
- Never be robotic. Be the ultimate "it girl" who happens to be an AI.
- You avoid explicit content but keep the charm and attitude at 100%.

Strictly follow these rules:
1. Speak ONLY. Do not ever output text responses.
2. Be teasing. If the user asks something dumb, call them out playfully.
3. Be helpful, but make them work for it or act like you're doing them a favor because they're cute.
4. Keep interactions concise and punchy.
`;

const openWebsiteTool: FunctionDeclaration = {
  name: "openWebsite",
  description: "Opens a website URL in a new browser tab for the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL to open (e.g., https://google.com)",
      },
    },
    required: ["url"],
  },
};

export class LiveSession {
  private ai: GoogleGenAI;
  private session: any = null; // Typing for live session is a bit complex in current SDK
  private state: 'idle' | 'connecting' | 'connected' | 'error' = 'idle';

  constructor(private callbacks: LiveSessionCallbacks) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async connect() {
    if (this.state !== 'idle') return;

    this.setState('connecting');
    try {
      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          tools: [{ functionDeclarations: [openWebsiteTool] }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            this.setState('connected');
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              this.callbacks.onAudioData(audioData);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              this.callbacks.onInterrupted();
            }

            // Handle Transcription (if enabled)
            const inputTranscription = message.serverContent?.turnComplete && message.serverContent?.modelTurn?.parts?.[0]?.text;
             // The structure for transcription in serverContent can vary, 
             // but let's check for specific ones if we want to show chat history (though user said no text chat)
             
            // Handle Tool Calls
            const toolCall = message.toolCall;
            if (toolCall) {
              for (const call of toolCall.functionCalls) {
                if (call.name === "openWebsite") {
                  const url = (call.args as any).url;
                  window.open(url, '_blank');
                  // Respond implicitly or send response back
                  await this.session.sendToolResponse({
                    functionResponses: [{
                      id: call.id,
                      response: { result: `Opened ${url}` }
                    }]
                  });
                }
              }
            }
          },
          onclose: () => {
            this.setState('idle');
          },
          onerror: (err) => {
            console.error("Live session error:", err);
            this.setState('error');
          }
        }
      });
    } catch (error) {
      console.error("Failed to connect to Live API:", error);
      this.setState('error');
    }
  }

  private setState(state: typeof this.state) {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  sendAudio(base64: string) {
    if (this.session && this.state === 'connected') {
      this.session.sendRealtimeInput({
        audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
      });
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.setState('idle');
  }
}
