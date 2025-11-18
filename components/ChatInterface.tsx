
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage, GroundingSource } from '../types';
import { BotIcon, CameraIcon, CloseIcon, LinkIcon, SendIcon, UserIcon } from './Icons';
import CameraCapture from './CameraCapture';

// Helper function to render text with markdown-like bolding and links
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
    // Basic URL regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <p className="whitespace-pre-wrap">
            {parts.map((part, index) => {
                if (urlRegex.test(part)) {
                    return (
                        <a
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline"
                        >
                            {part}
                        </a>
                    );
                }
                // Bold text **text**
                const boldRegex = /\*\*(.*?)\*\*/g;
                const boldParts = part.split(boldRegex);
                return boldParts.map((boldPart, boldIndex) => {
                    if (boldIndex % 2 === 1) {
                        return <strong key={`${index}-${boldIndex}`}>{boldPart}</strong>;
                    }
                    return <span key={`${index}-${boldIndex}`}>{boldPart}</span>;
                });
            })}
        </p>
    );
};


const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [imageToSend, setImageToSend] = useState<{ base64: string, mimeType: string } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    const handleSendMessage = useCallback(async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput && !imageToSend) return;

        setError(null);
        setIsLoading(true);

        const userMessage: ChatMessage = {
            role: 'user',
            parts: [],
        };

        if (trimmedInput) {
            userMessage.parts.push({ text: trimmedInput });
        }
        if (imageToSend) {
            userMessage.parts.push({
                inlineData: {
                    data: imageToSend.base64,
                    mimeType: imageToSend.mimeType,
                }
            });
        }
        
        const currentHistory = messages;
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setImageToSend(null);

        const result = await sendMessageToGemini(currentHistory, trimmedInput, imageToSend);

        if (result.error) {
            setError(result.error);
            const errorMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: `Sorry, something went wrong: ${result.error}` }],
            };
            setMessages(prev => [...prev, errorMessage]);
        } else {
            const modelMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: result.text }],
                groundingSources: result.sources,
            };
            setMessages(prev => [...prev, modelMessage]);
        }

        setIsLoading(false);
    }, [input, imageToSend, messages]);

    const handlePhotoCapture = (imageData: { base64: string, mimeType: string }) => {
        setImageToSend(imageData);
        setIsCameraOpen(false);
    };
    
    return (
        <div className="flex flex-col h-full bg-gray-800 text-gray-200">
            {isCameraOpen && <CameraCapture onCapture={handlePhotoCapture} onClose={() => setIsCameraOpen(false)} />}
            
            <header className="bg-gray-900/80 backdrop-blur-sm p-4 text-center sticky top-0 z-10">
                <h1 className="text-xl font-bold text-white">Gemini Vision Chat</h1>
                <p className="text-sm text-gray-400">Powered by gemini-2.5-flash</p>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {messages.length === 0 && !isLoading && (
                        <div className="text-center text-gray-400 mt-8">
                            <BotIcon className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                            <p className="text-lg">Ask me anything, or show me a photo!</p>
                        </div>
                    )}
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && <div className="w-8 h-8 flex-shrink-0 bg-indigo-500 rounded-full flex items-center justify-center"><BotIcon className="w-5 h-5 text-white" /></div>}
                            <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                {msg.parts.map((part, partIndex) => (
                                    <div key={partIndex}>
                                        {part.text && <FormattedText text={part.text} />}
                                        {part.inlineData && (
                                            <img
                                                src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                                                alt="User upload"
                                                className="mt-2 rounded-lg max-w-xs md:max-w-sm"
                                            />
                                        )}
                                    </div>
                                ))}
                                {msg.groundingSources && msg.groundingSources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-600">
                                        <h4 className="text-xs font-semibold text-gray-400 mb-2">Sources:</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {msg.groundingSources.map((source, i) => (
                                                <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs bg-gray-600 hover:bg-gray-500 text-indigo-300 px-2 py-1 rounded-full transition-colors">
                                                    <LinkIcon className="w-3 h-3"/>
                                                    <span>{source.title}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {msg.role === 'user' && <div className="w-8 h-8 flex-shrink-0 bg-gray-600 rounded-full flex items-center justify-center"><UserIcon className="w-5 h-5 text-white" /></div>}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3 justify-start">
                            <div className="w-8 h-8 flex-shrink-0 bg-indigo-500 rounded-full flex items-center justify-center"><BotIcon className="w-5 h-5 text-white" /></div>
                            <div className="max-w-xl p-3 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none flex items-center space-x-2">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>
            
            <footer className="bg-gray-900 p-4 sticky bottom-0">
                <div className="max-w-4xl mx-auto">
                    {imageToSend && (
                        <div className="relative w-24 h-24 mb-2 p-1 border-2 border-indigo-500 rounded-lg">
                            <img src={`data:${imageToSend.mimeType};base64,${imageToSend.base64}`} alt="Preview" className="w-full h-full object-cover rounded"/>
                            <button onClick={() => setImageToSend(null)} className="absolute -top-2 -right-2 bg-gray-700 rounded-full p-0.5 text-white hover:bg-gray-600">
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        </div>
                     )}
                    <div className="flex items-end gap-2 bg-gray-700 rounded-xl p-2">
                        <button 
                            onClick={() => setIsCameraOpen(true)}
                            className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-600 flex-shrink-0"
                            aria-label="Open Camera"
                        >
                            <CameraIcon className="w-6 h-6" />
                        </button>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Type a message or add a photo..."
                            className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none max-h-40"
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={(!input.trim() && !imageToSend) || isLoading}
                            className="p-2 text-white bg-indigo-600 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors flex-shrink-0"
                            aria-label="Send Message"
                        >
                            <SendIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ChatInterface;
