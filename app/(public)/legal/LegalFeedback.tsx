"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function LegalFeedback() {
  const [upvoted, setUpvoted] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  const handleUpvote = () => {
    setUpvoted(true);
  };

  const handleDownvote = () => {
    if (showFlash) return; // Prevent multiple clicks resetting the timer
    setShowFlash(true);
    
    // Automatically disappear after 1.5 seconds
    setTimeout(() => {
      setShowFlash(false);
    }, 1500);
  };

  return (
    <div className="mt-16 pt-8 border-t border-border/50 flex flex-col items-center gap-6">
      <h3 className="text-xl font-semibold text-foreground">Was this page helpful?</h3>
      
      <div className="flex gap-4">
        <Button
          variant={upvoted ? "default" : "outline"}
          size="lg"
          onClick={handleUpvote}
          className="gap-2 transition-all w-32"
        >
          <ThumbsUp className="w-5 h-5" />
          Yes
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={handleDownvote}
          className="gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all w-32"
        >
          <ThumbsDown className="w-5 h-5" />
          No
        </Button>
      </div>

      {showFlash && (
        <>
          <style>{`
            @keyframes jumpscare {
              0% { opacity: 1; transform: scale(1.5); }
              70% { opacity: 1; transform: scale(1.5); }
              100% { opacity: 0; transform: scale(1.2); }
            }
          `}</style>
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div 
              className="relative w-[450px] h-[450px] rounded-xl overflow-hidden shadow-2xl"
              style={{ animation: 'jumpscare 1.5s ease-out forwards' }}
            >
              <Image
                src="https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev/Huy%20Diactor.jpg"
                alt="Huy Diactor"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
