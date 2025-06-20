
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import Link from 'next/link';
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "../ui/checkbox";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="currentColor" d="M21.35 11.1h-9.2v2.8h5.3c-.2 1.9-1.2 3.4-3.1 4.5v2.3h3.1c1.8-1.7 2.9-4.2 2.9-7.6z"/>
    <path fill="currentColor" d="M12.15 21c2.6 0 4.8-0.9 6.4-2.4l-3.1-2.3c-.8.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.4-4H3.6v2.4C5.3 18.9 8.5 21 12.15 21z"/>
    <path fill="currentColor" d="M6.75 13.2c-.2-.6-.2-1.2 0-1.8V9.1H3.6c-1.2 2.4-1.2 5.2 0 7.6l3.15-2.5z"/>
    <path fill="currentColor" d="M12.15 3.9c1.4 0 2.7.5 3.7 1.4l2.7-2.7C16.9.4 14.7 0 12.15 0 8.5 0 5.3 2.1 3.6 5.1l3.15 2.5c.8-2.3 2.9-4 5.4-4z"/>
  </svg>
);


export default function LoginForm() {
  const { login, loading, error } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login(data.email, data.password);
  };
  
  const handleGoogleSignIn = () => {
    toast({
      title: "Coming Soon!",
      description: "Google Sign-In will be available in a future update.",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-sm rounded-2xl bg-black/20 backdrop-blur-lg border border-white/10 shadow-2xl p-8"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="text-sm text-gray-300">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary hover:underline font-semibold">
                Sign up
              </Link>
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-300">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                {...register("email")} 
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:ring-offset-gray-900"
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-300">Password</Label>
              <Input 
                id="password" 
                type="password" 
                {...register("password")} 
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:ring-offset-gray-900"
              />
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>
            {error && <p className="text-sm text-red-400 mt-2 text-center">{error}</p>}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" {...register("remember")} className="data-[state=checked]:bg-primary border-white/30" />
                <Label htmlFor="remember" className="text-xs text-gray-300">Remember me</Label>
              </div>
              <Link href="#" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-white rounded-md" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
            <Button type="button" variant="outline" className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 hover:text-white" onClick={handleGoogleSignIn}>
              <GoogleIcon />
              Sign in with Google
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
