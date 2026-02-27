'use client';

import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Mic, Square, Loader2, Volume2, Send } from 'lucide-react';
import { motion } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  audio?: any;
};

function pcmToBase64Wav(base64Pcm: string, sampleRate: number = 24000): string {
  const binaryString = window.atob(base64Pcm);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const pcmData = new Int16Array(bytes.buffer);
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmData.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < pcmData.length; i++, offset += 2) {
    view.setInt16(offset, pcmData[i], true);
  }

  let binary = '';
  const wavBytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < wavBytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(wavBytes.subarray(i, i + chunkSize)));
  }
  return window.btoa(binary);
}

export default function CivicsTest() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputText, setInputText] = useState('');
  const chatRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          handleUserMessage(transcript);
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          if (event.error !== 'no-speech') {
            setError(`Microphone error: ${event.error}`);
          }
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      } else {
        setError('Speech recognition is not supported in this browser. Please use Chrome.');
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startListening = () => {
    setError('');
    if (recognition) {
      try {
        recognition.start();
        setIsListening(true);
        // Stop any playing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const initChat = async () => {
    setHasStarted(true);
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are an official USCIS examiner conducting the US Citizenship Civics Test.
You will ask the user questions from the official 100 civics questions (2008 version) or the 128 civics questions (2025 version).
Start by greeting the user, introducing yourself, and asking which version of the test they want to practice.
Then, ask ONE question at a time.
Wait for the user to answer.
Evaluate their answer based on the official acceptable answers.
Tell them if they are correct or incorrect, and provide the official correct answer.
Then, ask the next question.
Keep your responses concise, conversational, and spoken-language friendly. Do not use markdown formatting like bold or italics, as this will be read aloud by TTS.`,
      }
    });

    setIsLoading(true);
    try {
      const response = await chatRef.current.sendMessage({ message: "Hello, I am ready to start." });
      const text = response.text;
      const audioData = await generateAudio(text);
      setMessages([{ id: Date.now().toString(), role: 'model', text, audio: audioData }]);
      playAudio(audioData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAudio = async (text: string) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    } catch (e) {
      console.error("TTS Error", e);
      return undefined;
    }
  };

  const playAudio = (inlineData?: any) => {
    if (!inlineData || !audioRef.current) return;
    
    try {
      const { data, mimeType } = inlineData;
      let audioSrc = '';
      
      if (mimeType.includes('pcm')) {
        let sampleRate = 24000;
        const rateMatch = mimeType.match(/rate=(\d+)/);
        if (rateMatch) {
          sampleRate = parseInt(rateMatch[1], 10);
        }
        
        const wavBase64 = pcmToBase64Wav(data, sampleRate);
        audioSrc = `data:audio/wav;base64,${wavBase64}`;
      } else {
        audioSrc = `data:${mimeType};base64,${data}`;
      }
      
      audioRef.current.src = audioSrc;
      audioRef.current.play().catch(e => console.error("Audio play error:", e));
    } catch (e) {
      console.error("Error processing audio data:", e);
    }
  };

  const handleUserMessage = async (text: string) => {
    if (!text.trim() || !chatRef.current) return;

    const newMessages: Message[] = [...messages, { id: Date.now().toString(), role: 'user', text }];
    setMessages(newMessages);
    setIsLoading(true);
    setInputText('');

    try {
      const response = await chatRef.current.sendMessage({ message: text });
      const modelText = response.text;
      const audioData = await generateAudio(modelText);

      setMessages([...newMessages, { id: (Date.now() + 1).toString(), role: 'model', text: modelText, audio: audioData }]);
      playAudio(audioData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
      <div className="p-6 border-b border-neutral-100 bg-white z-10">
        <h1 className="text-2xl font-sans font-medium tracking-tight text-neutral-900">US Citizenship Civics Test</h1>
        <p className="text-sm text-neutral-500 mt-1">Voice-enabled practice examiner</p>
      </div>
      
      <audio ref={audioRef} className="hidden" />
      
      {!hasStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-neutral-50/50">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <Mic className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-xl font-medium text-neutral-900 mb-2">Ready to practice?</h2>
          <p className="text-neutral-500 text-center max-w-sm mb-8">
            The examiner will ask you questions from the official US Citizenship Civics Test. You can answer using your voice or by typing.
          </p>
          <button
            onClick={initChat}
            disabled={isLoading}
            className="bg-emerald-600 text-white px-8 py-4 rounded-full font-medium shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all flex items-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Connecting...
              </>
            ) : (
              'Start Practice Test'
            )}
          </button>
          {error && (
            <div className="mt-6 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 max-w-sm text-center">
              {error}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-50/50">
            {messages.length === 0 && isLoading && (
              <div className="flex items-center justify-center h-full text-neutral-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Connecting to examiner...</span>
              </div>
            )}
            
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-sm'
                  }`}
                >
                  <p className="text-[15px] leading-relaxed">{msg.text}</p>
                  {msg.role === 'model' && msg.audio && (
                    <button 
                      onClick={() => playAudio(msg.audio)}
                      className="mt-3 text-emerald-600 hover:text-emerald-700 transition-colors flex items-center text-xs font-medium uppercase tracking-wider"
                    >
                      <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                      Replay Audio
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            
            {isLoading && messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-white border border-neutral-200 text-neutral-800 rounded-2xl rounded-bl-sm px-5 py-4 flex items-center space-x-2 shadow-sm">
                  <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-6 bg-white border-t border-neutral-100">
            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}
            
            <div className="flex flex-col items-center justify-center">
              <button
                onMouseDown={startListening}
                onMouseUp={stopListening}
                onMouseLeave={stopListening}
                onTouchStart={startListening}
                onTouchEnd={stopListening}
                disabled={isLoading || !recognition}
                className={`relative group flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 ${
                  isListening 
                    ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 shadow-md'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                {isListening && (
                  <span className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-20" />
                )}
                {isListening ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
              </button>
              <p className="text-xs text-neutral-500 mt-4 font-medium uppercase tracking-wider">
                {isListening ? 'Release to send' : 'Hold to speak'}
              </p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleUserMessage(inputText);
              }}
              className="flex w-full mt-6 space-x-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Or type your answer here..."
                className="flex-1 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                disabled={isLoading || isListening}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading || isListening}
                className="bg-neutral-900 text-white px-5 py-3 rounded-xl font-medium disabled:opacity-50 hover:bg-neutral-800 transition-colors flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
