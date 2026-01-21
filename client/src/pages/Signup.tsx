import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/mode-toggle';
import api from '@/lib/api';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { 
    User, 
    Mail, 
    Lock, 
    ArrowRight, 
    Sparkles, 
    GraduationCap, 
    Briefcase,
    Shield,
    Rocket,
    CheckCircle2,
    Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Signup: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2>(1);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student' as 'student' | 'engineer',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post('/users', formData);
            if (res.data.success) {
                toast.success('Account created 🎉', {
                    description: 'You can now log in and start improving your skills.',
                });
                navigate('/login');
            } else {
                toast.error('Signup failed', {
                    description: res.data.message,
                });
            }
        } catch (err) {
            const error = err as AxiosError<{ message: string }>;
            toast.error('Signup failed', {
                description:
                    error.response?.data?.message ||
                    'Something went wrong. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    const canProceedToStep2 = formData.name.length >= 2 && formData.email.includes('@');

    return (
        <div className="relative min-h-screen w-full flex bg-background overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-size-[50px_50px] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
                {/* Floating orbs */}
                <div className="absolute top-20 left-20 w-3 h-3 bg-primary/30 rounded-full animate-bounce delay-300" />
                <div className="absolute top-40 right-32 w-2 h-2 bg-green-500/40 rounded-full animate-bounce delay-500" />
                <div className="absolute bottom-32 left-40 w-4 h-4 bg-primary/20 rounded-full animate-bounce delay-700" />
            </div>

            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-50">
                <ModeToggle />
            </div>

            {/* LEFT SECTION - Branding & Benefits */}
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
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
                        <Rocket className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-500">Start Your Journey Today</span>
                    </div>
                    
                    <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                        Join the community of
                        <span className="text-primary"> skilled</span> developers
                    </h1>
                    
                    <p className="text-lg text-muted-foreground mb-10">
                        Create your free account and start discovering what you truly know — and what needs work.
                    </p>

                    {/* Benefits List */}
                    <div className="space-y-4">
                        <BenefitItem 
                            icon={<Brain className="h-5 w-5" />}
                            title="AI-Powered Analysis"
                            description="Get detailed insights into your understanding"
                        />
                        <BenefitItem 
                            icon={<Shield className="h-5 w-5" />}
                            title="Private & Secure"
                            description="Your data is encrypted and never shared"
                        />
                        <BenefitItem 
                            icon={<Sparkles className="h-5 w-5" />}
                            title="Free to Start"
                            description="No credit card required, start learning today"
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

            {/* RIGHT SECTION - Signup Form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12 lg:px-24 xl:px-32 2xl:px-40">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-10">
                        <img src="/logo.png" alt="Skillcheck" className="h-10 w-auto" />
                        <span className="text-xl font-bold tracking-tight text-foreground">Skillcheck</span>
                    </div>

                    {/* Signup Card */}
                    <div className="relative">
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-linear-to-r from-green-500/20 via-primary/10 to-green-500/20 rounded-2xl blur-xl opacity-50" />
                        
                        <div className="relative bg-card border border-border rounded-2xl p-8 shadow-xl shadow-black/5">
                            {/* Progress Steps */}
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <div className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all",
                                    step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                    {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : "1"}
                                </div>
                                <div className={cn(
                                    "w-16 h-1 rounded-full transition-all",
                                    step >= 2 ? "bg-primary" : "bg-muted"
                                )} />
                                <div className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all",
                                    step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                    2
                                </div>
                            </div>

                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-foreground mb-2">
                                    {step === 1 ? "Create your account" : "Almost there!"}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {step === 1 
                                        ? "Start your skill improvement journey" 
                                        : "Choose your role and set your password"
                                    }
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {step === 1 ? (
                                    <>
                                        {/* Name Field */}
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Full name</Label>
                                            <div className="relative">
                                                <div className={cn(
                                                    "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                                                    focusedField === 'name' ? 'text-primary' : 'text-muted-foreground'
                                                )}>
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <Input
                                                    name="name"
                                                    placeholder="John Doe"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    onFocus={() => setFocusedField('name')}
                                                    onBlur={() => setFocusedField(null)}
                                                    className="h-12 pl-11 rounded-xl bg-muted/50 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Email Field */}
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Email address</Label>
                                            <div className="relative">
                                                <div className={cn(
                                                    "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                                                    focusedField === 'email' ? 'text-primary' : 'text-muted-foreground'
                                                )}>
                                                    <Mail className="h-4 w-4" />
                                                </div>
                                                <Input
                                                    type="email"
                                                    name="email"
                                                    placeholder="you@example.com"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    onFocus={() => setFocusedField('email')}
                                                    onBlur={() => setFocusedField(null)}
                                                    className="h-12 pl-11 rounded-xl bg-muted/50 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Continue Button */}
                                        <Button
                                            type="button"
                                            size="lg"
                                            onClick={() => setStep(2)}
                                            disabled={!canProceedToStep2}
                                            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium group relative overflow-hidden transition-all cursor-pointer"
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                Continue
                                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        {/* Role Selection */}
                                        <div className="space-y-3">
                                            <Label className="text-sm font-medium text-foreground">I am a</Label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <RoleCard
                                                    icon={<GraduationCap className="h-5 w-5" />}
                                                    label="Student"
                                                    description="Learning & growing"
                                                    selected={formData.role === 'student'}
                                                    onClick={() => setFormData({ ...formData, role: 'student' })}
                                                />
                                                <RoleCard
                                                    icon={<Briefcase className="h-5 w-5" />}
                                                    label="Engineer"
                                                    description="Professional dev"
                                                    selected={formData.role === 'engineer'}
                                                    onClick={() => setFormData({ ...formData, role: 'engineer' })}
                                                />
                                            </div>
                                        </div>

                                        {/* Password Field */}
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Password</Label>
                                            <div className="relative">
                                                <div className={cn(
                                                    "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                                                    focusedField === 'password' ? 'text-primary' : 'text-muted-foreground'
                                                )}>
                                                    <Lock className="h-4 w-4" />
                                                </div>
                                                <Input
                                                    type="password"
                                                    name="password"
                                                    placeholder="Create a strong password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    onFocus={() => setFocusedField('password')}
                                                    onBlur={() => setFocusedField(null)}
                                                    className="h-12 pl-11 rounded-xl bg-muted/50 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                    required
                                                    minLength={6}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="lg"
                                                onClick={() => setStep(1)}
                                                className="h-12 px-6 rounded-xl cursor-pointer"
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                type="submit"
                                                size="lg"
                                                className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium group relative overflow-hidden transition-all cursor-pointer"
                                                disabled={loading || formData.password.length < 6}
                                            >
                                                <span className="relative z-10 flex items-center justify-center gap-2">
                                                    {loading ? (
                                                        <>
                                                            <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                                            Creating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            Create account
                                                            <Sparkles className="h-4 w-4" />
                                                        </>
                                                    )}
                                                </span>
                                                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </form>

                            {/* Terms */}
                            <p className="text-xs text-center text-muted-foreground mt-6">
                                By creating an account, you agree to our{' '}
                                <a href="#" className="text-primary hover:underline">Terms of Service</a>
                                {' '}and{' '}
                                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                            </p>

                            {/* Divider */}
                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-3 text-muted-foreground">Already have an account?</span>
                                </div>
                            </div>

                            {/* Login Link */}
                            <Link
                                to="/login"
                                className="flex items-center justify-center w-full h-12 rounded-xl border border-border bg-background hover:bg-muted/50 text-foreground font-medium transition-colors group"
                            >
                                Sign in instead
                                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Benefit Item Component
const BenefitItem = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-green-500/30 hover:bg-card transition-all group">
        <div className="p-2.5 rounded-lg bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors">
            {icon}
        </div>
        <div>
            <h3 className="font-medium text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    </div>
);

// Role Card Component
const RoleCard = ({ 
    icon, 
    label, 
    description, 
    selected, 
    onClick 
}: { 
    icon: React.ReactNode; 
    label: string; 
    description: string;
    selected: boolean; 
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer",
            selected 
                ? "border-primary bg-primary/10 text-primary" 
                : "border-border hover:border-primary/50 hover:bg-muted/50 text-foreground"
        )}
    >
        <div className={cn(
            "p-2.5 rounded-lg transition-colors",
            selected ? "bg-primary/20" : "bg-muted"
        )}>
            {icon}
        </div>
        <div className="text-center">
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {selected && (
            <CheckCircle2 className="h-4 w-4 absolute top-2 right-2" />
        )}
    </button>
);

export default Signup;
