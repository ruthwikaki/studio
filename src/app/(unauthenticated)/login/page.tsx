
"use client";

import { motion } from "framer-motion";
import { BarChart, Package, Bot, Zap, ArrowRight, Gauge, Link as LinkIcon, Users, QrCode } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";
import TypingAnimation from "@/components/auth/TypingAnimation";
import { Button } from "@/components/ui/button";

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white/5 p-4 rounded-lg border border-white/10 backdrop-blur-sm"
  >
    <div className="flex items-center gap-3">
      <div className="bg-primary/20 p-2 rounded-md">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-sm text-white">{title}</h3>
        <p className="text-xs text-gray-300">{description}</p>
      </div>
    </div>
  </motion.div>
);

export default function LoginPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#0d1117] text-white">
      <div className="animated-gradient-background"></div>
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-screen p-8 lg:p-12">
        
        {/* Left Side - Hero Content */}
        <motion.div 
          className="flex flex-col justify-center space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="flex items-center gap-2">
            <Package className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline tracking-tighter">SupplyChainAI</h1>
          </motion.div>
          
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-bold font-headline tracking-tighter !leading-[1.1]">
            Command Your Supply Chain with Conversational AI
          </motion.h2>

          <TypingAnimation />

          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <Button className="bg-primary hover:bg-primary/80 text-white rounded-full px-6 shadow-lg shadow-primary/20">
              See it in action <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="link" className="text-gray-300 hover:text-white">
              Request a Demo
            </Button>
          </motion.div>

          <motion.div variants={itemVariants} className="pt-8 space-y-4">
            <p className="text-sm text-gray-400 font-semibold flex items-center gap-2"><Users className="w-4 h-4"/>Trusted by over 500+ supply chain leaders</p>
            <div className="flex -space-x-2 overflow-hidden">
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-gray-800" src="https://placehold.co/40x40/6366f1/ffffff" alt="Logo" data-ai-hint="company logo"/>
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-gray-800" src="https://placehold.co/40x40/ec4899/ffffff" alt="Logo" data-ai-hint="company logo"/>
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-gray-800" src="https://placehold.co/40x40/22c55e/ffffff" alt="Logo" data-ai-hint="company logo"/>
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-gray-800" src="https://placehold.co/40x40/f97316/ffffff" alt="Logo" data-ai-hint="company logo"/>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Side - Login Form */}
        <div className="flex items-center justify-center">
          <LoginForm />
        </div>

      </div>
    </div>
  );
}
