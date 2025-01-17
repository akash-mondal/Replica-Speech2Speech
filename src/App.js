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
import AiGeneratedCard from "./components/AiGeneratedCard";

grid.register();

const bigBangQuotes = [
    "Bazinga!",
    "Penny, Penny, Penny!",
    "It's not that I'm better than you, it's that you're worse.",
    "I'm not crazy. My mother had me tested.",
    "I don't need sleep, I need answers!",
    "According to the laws of physics, anything is possible.",
    "Soft kitty, warm kitty, little ball of fur...",
    "Oh, sweet mother of Thor!",
    "CHIMICHANGAS!",
    "I'm not sure why I'm not more popular. I'm witty, I'm adorable, and I have a PhD.",
    "I am the apex predator of the apartment.",
    "That's my spot.",
    "The human condition is a mystery to me.",
    "I've always been a bit of a nerd.",
    "I have a high tolerance for discomfort.",
    "I'm a very good listener. Except when I'm not.",
    "I have to agree, I'm pretty awesome.",
    "I'm not ignoring you, I'm just prioritizing.",
    "Scissors cuts paper, paper covers rock, rock crushes lizard, lizard poisons Spock, Spock smashes scissors, scissors decapitates lizard, lizard eats paper, paper disproves Spock, Spock vaporizes rock, and as it always has, rock crushes scissors.",
    "I'm a physicist. I don't have emotions.",
    "The worst thing about being smart is that you know how dumb everyone else is.",
    "Friendship is a sacred bond, and should be treated as such.",
    "I'm not a role model. Unless you want to be like me.",
    "I'm not going to argue with you about something you're wrong about.",
    "I've seen enough to know that I'm never wrong.",
    "I've never been so happy in my life and that's making me very uncomfortable."
];

const App = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
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

    const { groq: GROQ_API_KEY, elevenlabs: ELEVENLABS_API_KEY, togetherai: togetherai_api } = apiKeys;

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
            verbose: false,
            memory: chatPromptMemory.current,
        })
    );

    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.width = 300;
            canvasRef.current.height = 150;
        }
    }, []);

    // Add event listener for audio playback
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.addEventListener('play', () => setIsPlaying(true));
            audioRef.current.addEventListener('ended', () => setIsPlaying(false));
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('play', () => setIsPlaying(true));
                audioRef.current.removeEventListener('ended', () => setIsPlaying(false));
            }
        };
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
            setIsRecording(false);  // Ensure recording is stopped
            
            const transcription = await transcribeAudio(file, GROQ_API_KEY);
            const response = await chatConversationChain.current.invoke({
                question: transcription.text,
            });
            
            await generateAudio(response.text, ELEVENLABS_API_KEY, audioRef, analyserRef, setStarSpeed);
        } catch (error) {
            console.error("Error during transcription:", error);
            setError("");
            setIsPlaying(false);
        }
    };

    const toggleRecording = () => {
        if (!isPlaying) {  // Only allow toggling if not playing
            setIsRecording(!isRecording);
            if (audioRecorderRef.current) {
                audioRecorderRef.current.control(isRecording ? "inactive" : "recording");
            }
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
                    <AiGeneratedCard />
                    <StarField speed={starSpeed} />
                    <div className="content">
                        <ProfileCircle analyserRef={analyserRef} />
                        <MicButton 
                            isRecording={isRecording} 
                            onClick={toggleRecording}
                            disabled={isPlaying}
                        />
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
