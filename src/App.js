import React, { useState, useEffect, useRef } from "react";
import StarField from "./components/StarField";
import ProfileCircle from "./components/ProfileCircle";
import MicButton from "./components/MicButton";
import AudioVisualizer from "./components/AudioVisualizer";
import "./styles/App.css";
import "ldrs/grid";
import { grid } from "ldrs";
import SocialMediaLinks from "./components/SocialMediaLinks";
import AudioRecorder from "./components/AudioRecorder";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { ChatTogetherAI } from "@langchain/community/chat_models/togetherai";
import { BufferMemory } from "langchain/memory";
import systemPrompt from "./memory_database/memory_management";
import apiKeys from "./config/apiKeys";
import { transcribeAudio, generateAudio } from "./helpers/audioHelper";
import AiGeneratedCard from "./components/AiGeneratedCard"; // Import the card

grid.register();

const App = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false); // New state to track audio playback
    const [loading, setLoading] = useState(true);
    const [contentVisible, setContentVisible] = useState(false);
    const [audioType] = useState("audio/webm");
    const [error, setError] = useState(null);
    const [starSpeed, setStarSpeed] = useState(1);
    const [quote, setQuote] = useState("");

    const canvasRef = useRef(null);
    const analyserRef = useRef(null);
    const audioRecorderRef = useRef(null);
    const audioRef = useRef(null);

    const { groq: GROQ_API_KEY, elevenlabs: ELEVENLABS_API_KEY, togetherai_api } = apiKeys;

    const chatPromptMemory = useRef(
        new BufferMemory({
            memoryKey: "chat_history",
            returnMessages: true,
        })
    );

    const chatModel = useRef(
        new ChatTogetherAI({
            temperature: 0,
            model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            apiKey: togetherai_api,
            dangerouslyAllowBrowser: true,
        })
    );

    const chatPrompt = useRef(
        ChatPromptTemplate.fromMessages([
            ["system", systemPrompt],
            new MessagesPlaceholder("chat_history"),
            ["human", "{question}"],
        ])
    );

    const chatConversationChain = useRef(
        new LLMChain({
            llm: chatModel.current,
            prompt: chatPrompt.current,
            verbose: true,
            memory: chatPromptMemory.current,
        })
    );

    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.width = 300;
            canvasRef.current.height = 150;
        }
    }, []);

    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * bigBangQuotes.length);
        setQuote(bigBangQuotes[randomIndex]);

        const loadingTimer = setTimeout(() => {
            setLoading(false);
            const visibilityTimer = setTimeout(() => {
                setContentVisible(true);
            }, 200);
            return () => clearTimeout(visibilityTimer);
        }, 3000);

        return () => clearTimeout(loadingTimer);
    }, []);

    const handleAudioStop = async (file) => {
        try {
            setError(null);
            const transcription = await transcribeAudio(file, GROQ_API_KEY);
            const response = await chatConversationChain.current.invoke({
                question: transcription.text,
            });
            setIsPlaying(true); // Set audio playback state to true
            await generateAudio(response.text, ELEVENLABS_API_KEY, audioRef, analyserRef, setStarSpeed);
            audioRef.current.play();
        } catch (error) {
            console.error("Error during transcription:", error);
            setError("");
        }
    };

    useEffect(() => {
        if (audioRef.current) {
            // Add event listener for when audio ends
            audioRef.current.onended = () => {
                setIsPlaying(false); // Reset audio playback state to false
            };
        }
    }, []);

    const toggleRecording = () => {
        setIsRecording(!isRecording);
        if (audioRecorderRef.current) {
            audioRecorderRef.current.control(isRecording ? "inactive" : "recording");
        }
    };

    return (
        <>
            {loading ? (
                <div className="loader-container">
                    <l-grid size="60" speed="1.5" color="white"></l-grid>
                    <p className="loading-quote">{quote}</p>
                </div>
            ) : (
                <div className={`app ${contentVisible ? "transition-visible" : ""}`}>
                    <AiGeneratedCard /> {/* Add the card */}
                    <StarField speed={starSpeed} />
                    <div className="content">
                        <ProfileCircle analyserRef={analyserRef} />
                        {!isPlaying && ( // Conditionally render MicButton
                            <MicButton isRecording={isRecording} onClick={toggleRecording} />
                        )}
                        <AudioVisualizer
                            isRecording={isRecording}
                            isAudioSetup={false}
                            analyserRef={analyserRef}
                            canvasRef={canvasRef}
                        />
                        {error && <div className="error-message">{error}</div>}
                    </div>
                    <div className="social-icons">
                        <SocialMediaLinks />
                    </div>
                    <AudioRecorder
                        isRecording={isRecording}
                        setIsRecording={setIsRecording}
                        audioType={audioType}
                        onStop={handleAudioStop}
                        ref={audioRecorderRef}
                    />
                    <audio ref={audioRef} preload="auto" style={{ display: "none" }} />
                </div>
            )}
        </>
    );
};

export default App;
