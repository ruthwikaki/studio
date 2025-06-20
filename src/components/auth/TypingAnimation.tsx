
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

const benefits = [
  "Predict demand with 94% accuracy.",
  "Reduce inventory holding costs by 30%.",
  "Automate reordering and never stock out.",
  "Gain real-time visibility across your chain.",
];

export default function TypingAnimation() {
  const [index, setIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % benefits.length);
    }, 4000); // Change text every 4 seconds

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    const currentBenefit = benefits[index];
    setDisplayedText(""); // Reset text for new animation

    const type = (charIndex = 0) => {
      if (charIndex < currentBenefit.length) {
        setDisplayedText((prev) => prev + currentBenefit.charAt(charIndex));
        typingTimeout = setTimeout(() => type(charIndex + 1), 30);
      }
    };
    
    type();

    return () => clearTimeout(typingTimeout);
  }, [index]);

  return (
    <div className="flex items-start text-lg text-gray-300 h-12">
      <Zap className="w-5 h-5 mr-3 mt-1 text-primary flex-shrink-0" />
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.4 }}
          className="font-medium"
        >
          {displayedText}
          <span className="animate-ping">|</span>
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
