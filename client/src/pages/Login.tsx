import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/mode-toggle';
import api from '@/lib/api';
import { AxiosError } from 'axios';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { toast } from 'sonner';
import { Lock, Mail, ArrowRight, Sparkles, Zap, Target } from 'lucide-react';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post('/users/login', { email, password });
            if (res.data.success) {
                const { user, token } = res.data.data;
                dispatch(setCredentials({
                    user,
                    token: token.split(' ')[1] || token
                }));
                navigate('/dashboard');
            } else {
                toast.error("Login Failed", {
                    description: "Invalid credentials.",
                });
            }
        } catch (err) {
            const error = err as AxiosError<{ message: string }>;
            const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
            toast.error("Login Failed", {
                description: message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex bg-background overflow-hidden">
            {/* Animated Background Grid - GitHub style */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-size-[50px_50px] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-50">
                <ModeToggle />
            </div>

            {/* LEFT SECTION - Branding & Features */}
            <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative px-24 xl:px-50 2xl:pl-80">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img src="/logo.png" alt="Skillcheck" className="h-10 w-auto relative z-10" />
                        <div className="absolute inset-0 bg-primary/20 blur-xl" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-foreground">Skillcheck</span>
                </div>

                {/* Main Content */}
                <div className="max-w-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">AI-Powered Skill Assessment</span>
                    </div>
                    
                    <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                        Master your skills with
                        <span className="text-primary"> real-time</span> feedback
                    </h1>
                    
                    <p className="text-lg text-muted-foreground mb-10">
                        Join thousands of developers improving their technical skills through voice-based assessments and AI-driven insights.
                    </p>

                    {/* Feature Cards */}
                    <div className="space-y-4">
                        <FeatureCard
                            icon={<Zap className="h-5 w-5" />}
                            title="Instant Evaluation"
                            description="Get real-time feedback on your technical responses"
                        />
                        <FeatureCard
                            icon={<Target className="h-5 w-5" />}
                            title="Skill Tracking"
                            description="Monitor your progress across multiple technologies"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>© 2026 Skillcheck</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <a href="#" className="hover:text-foreground transition-colors">Terms</a>
                </div>
            </div>

            {/* RIGHT SECTION - Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12 lg:pl-12 lg:pr-32 xl:pr-48 2xl:pr-64">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-10">
                        <img src="/logo.png" alt="Skillcheck" className="h-10 w-auto" />
                        <span className="text-xl font-bold tracking-tight text-foreground">Skillcheck</span>
                    </div>

                    {/* Login Card */}
                    <div className="relative">
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-linear-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative bg-card border border-border rounded-2xl p-8 shadow-xl shadow-black/5">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
                                <p className="text-sm text-muted-foreground">
                                    Sign in to continue your skill journey
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Email Field */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-foreground">Email address</Label>
                                    <div className="relative">
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'email' ? 'text-primary' : 'text-muted-foreground'}`}>
                                            <Mail className="h-4 w-4" />
                                        </div>
                                        <Input
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onFocus={() => setFocusedField('email')}
                                            onBlur={() => setFocusedField(null)}
                                            className="h-12 pl-11 rounded-xl bg-muted/50 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium text-foreground">Password</Label>
                                        <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
                                    </div>
                                    <div className="relative">
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'password' ? 'text-primary' : 'text-muted-foreground'}`}>
                                            <Lock className="h-4 w-4" />
                                        </div>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setFocusedField('password')}
                                            onBlur={() => setFocusedField(null)}
                                            className="h-12 pl-11 rounded-xl bg-muted/50 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium group relative overflow-hidden transition-all"
                                    disabled={loading}
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                                Signing in...
                                            </>
                                        ) : (
                                            <>
                                                Sign in
                                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </span>
                                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                </Button>
                            </form>

                            {/* Divider */}
                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-3 text-muted-foreground">New to Skillcheck?</span>
                                </div>
                            </div>

                            {/* Sign Up Link */}
                            <Link
                                to="/signup"
                                className="flex items-center justify-center w-full h-12 rounded-xl border border-border bg-background hover:bg-muted/50 text-foreground font-medium transition-colors group"
                            >
                                Create an account
                                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card transition-all group">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            {icon}
        </div>
        <div>
            <h3 className="font-medium text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    </div>
);
