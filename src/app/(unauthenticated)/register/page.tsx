
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Package } from "lucide-react";
import Link from 'next/link';
import { motion } from "framer-motion";

const registerSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerUser, loading, error } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormData) => {
    registerUser(data.email, data.password, data.companyName);
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#0d1117] text-white flex items-center justify-center p-4">
      <div className="animated-gradient-background"></div>
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-2xl bg-black/20 backdrop-blur-lg border border-white/10 shadow-2xl p-8"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <div className="text-center">
               <div className="flex justify-center items-center gap-2 mb-4">
                  <Package className="w-8 h-8 text-primary" />
                  <h1 className="text-2xl font-bold font-headline tracking-tighter">SupplyChainAI</h1>
                </div>
              <h2 className="text-2xl font-bold text-white">Create Your Account</h2>
              <p className="text-sm text-gray-300 mt-1">
                Start your 14-day free trial. No credit card required.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium text-gray-300">Company Name</Label>
                <Input id="companyName" placeholder="Your Company Inc." {...register("companyName")} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:ring-offset-gray-900" />
                {errors.companyName && <p className="text-xs text-red-400 mt-1">{errors.companyName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-300">Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" {...register("email")} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:ring-offset-gray-900" />
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-300">Password</Label>
                <Input id="password" type="password" {...register("password")} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:ring-offset-gray-900" />
                {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
              </div>
              {error && <p className="text-sm text-red-400 mt-2 text-center">{error}</p>}
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-white rounded-md" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account & Start Optimizing
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
