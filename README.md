# US Citizenship Civics Test Voice Assistant 🇺🇸

An interactive, voice-enabled web application designed to help users practice for the US Citizenship Civics Test. The app acts as an official USCIS examiner, asking questions, listening to your spoken answers, and providing immediate feedback.

## ✨ Features

*   🗣️ **Voice-Enabled Examiner**: Uses Google's Gemini AI to simulate a realistic examiner experience.
*   🎙️ **Speech-to-Text (STT)**: Answer questions naturally using your microphone via the browser's native Web Speech API.
*   🔊 **Text-to-Speech (TTS)**: High-quality, natural-sounding audio feedback using Gemini's TTS model.
*   📝 **Text Fallback**: Option to type your answers if you prefer not to use a microphone or are in a noisy environment.
*   📚 **Official Questions**: Instructed to support both the 2008 (100 questions) and 2025 (128 questions) versions of the official USCIS civics test.

## 🛠️ Tech Stack

### Frontend
*   **Framework:** [Next.js 15](https://nextjs.org/) (App Router) & [React 19](https://react.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Animations:** [Motion](https://motion.dev/) (formerly Framer Motion)
*   **Icons:** [Lucide React](https://lucide.dev/)

### AI & APIs
*   **SDK:** `@google/genai`
*   **Examiner Logic (LLM):** `gemini-3-flash-preview` - Manages the chat history, evaluates answers against official USCIS guidelines, and generates conversational responses.
*   **Voice Generation (TTS):** `gemini-2.5-flash-preview-tts` - Converts the examiner's text responses into raw PCM audio, which is then processed into playable WAV format in the browser.
*   **Voice Recognition (STT):** Native Browser `webkitSpeechRecognition` (Web Speech API) - Transcribes user speech to text locally in the browser.

## 🧠 How It Works Behind the Scenes

1.  **Initialization:** When you click "Start Practice Test", the app initializes a chat session with `gemini-3-flash-preview` using a strict system instruction to act as a USCIS examiner.
2.  **User Input:** You hold the microphone button and speak your answer. The browser's Web Speech API transcribes your voice into text.
3.  **Evaluation:** The transcribed text is sent to the Gemini chat session. The AI evaluates your answer against the official acceptable answers and generates a text reply (e.g., "That is correct. Next question...").
4.  **Audio Generation:** The app sends the AI's text reply to the `gemini-2.5-flash-preview-tts` model to generate human-like speech.
5.  **Playback:** The API returns raw PCM audio data. The frontend instantly wraps this raw data into a standard `.wav` file format and plays it through the browser's `<audio>` element while displaying the chat bubbles.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   A Google Gemini API Key

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up your environment variables:
    Create a `.env.local` file in the root directory and add your Gemini API key:
    ```env
    NEXT_PUBLIC_GEMINI_API_KEY="your_api_key_here"
    ```

4.  Start the development server:
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) in your browser (Google Chrome recommended for the best Speech Recognition support) to start practicing!

## 📝 License

This project is open-source and available under the MIT License.
