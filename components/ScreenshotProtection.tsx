
import React, { useEffect, useState } from 'react';

const ScreenshotProtection: React.FC = () => {
    const [isObscured, setIsObscured] = useState(false);

    useEffect(() => {
        const preventDefault = (e: Event) => e.preventDefault();

        // 1. Disable Right Click context menu
        document.addEventListener('contextmenu', preventDefault);

        // 2. Disable Copy/Cut
        document.addEventListener('copy', preventDefault);
        document.addEventListener('cut', preventDefault);
        
        // 3. Detect Screenshot Keys
        const handleKeyDown = (e: KeyboardEvent) => {
            // Print Screen Key
            if (e.key === 'PrintScreen' || e.keyCode === 44) {
                setIsObscured(true);
                // Attempt to clear clipboard
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText('').catch(() => {}); 
                }
                // Keep obscured for a moment to ruin the screenshot
                setTimeout(() => setIsObscured(false), 2000);
            }

            // Mac & Windows Combinations (Cmd+Shift+3/4/5, Win+Shift+S)
            if (e.shiftKey && (e.metaKey || e.ctrlKey || e.key === 'Meta')) {
                if (['3', '4', '5', 's', 'S'].includes(e.key)) {
                    setIsObscured(true);
                    setTimeout(() => setIsObscured(false), 2000);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        
        // Some OSs trigger only on keyup for PrintScreen
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'PrintScreen' || e.keyCode === 44) {
                setIsObscured(true);
                setTimeout(() => setIsObscured(false), 2000);
            }
        };
        window.addEventListener('keyup', handleKeyUp);

        // 4. Inject CSS protections
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                html, body, #root { display: none !important; }
            }
            body {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                -webkit-touch-callout: none;
            }
            img, video {
                -webkit-user-drag: none;
                -khtml-user-drag: none;
                -moz-user-drag: none;
                -o-user-drag: none;
                pointer-events: auto; /* Allow clicking (lightboxes) but no drag */
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.removeEventListener('contextmenu', preventDefault);
            document.removeEventListener('copy', preventDefault);
            document.removeEventListener('cut', preventDefault);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            document.head.removeChild(style);
        };
    }, []);

    if (isObscured) {
        return (
            <div className="fixed inset-0 z-[99999] bg-black flex items-center justify-center">
                <div className="text-white font-bold text-xl flex flex-col items-center gap-4 animate-pulse">
                    <svg className="h-20 w-20 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span className="uppercase tracking-widest text-red-500">Security Alert</span>
                    <span>Screenshot Blocked</span>
                </div>
            </div>
        );
    }

    return null;
};

export default ScreenshotProtection;
