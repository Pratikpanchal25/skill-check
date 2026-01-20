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

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post('/users/login', { email, password });
            if (res.data.success) {
                const { user, token } = res.data.data;
                dispatch(setCredentials({
                    user,
                    token: token.split(' ')[1] || token // Handle Bearer prefix if present
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
        <div className="relative min-h-screen w-full flex items-center justify-center bg-background px-6">
            {/* Theme Toggle */}
            <div className="absolute top-6 right-6">
                <ModeToggle />
            </div>

            {/* MAIN CARD */}
            <div
                className="relative w-full max-w-6xl h-[850px] grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden bg-card border border-border shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] dark:shadow-none" >

                {/* LEFT – FORM (PLAIN WHITE) */}
                <div className="p-12 md:p-16 flex flex-col justify-center">
                    {/* Logo */}
                    <div className="mb-10 flex items-center gap-2">
                        <img src="/logo.png" alt="Skillcheck" className="h-16 w-auto" />
                        <span className="text-xl font-semibold tracking-tight text-foreground">Skillcheck</span>
                    </div>

                    <h1 className="text-3xl font-semibold mb-2 text-foreground">Login</h1>
                    <p className="text-sm text-muted-foreground mb-10 max-w-sm">
                        Continue improving your real technical skills.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6 max-w-sm">
                        <div className="space-y-1.5">
                            <Label className="text-foreground">Email</Label>
                            <Input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-12 rounded-full bg-muted/50 border-input focus:bg-background text-foreground"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-foreground">Password</Label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 rounded-full bg-muted/50 border-input focus:bg-background text-foreground"
                                required
                            />
                        </div>

                        <Button
                            size="lg"
                            className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>

                    <p className="mt-10 text-sm text-muted-foreground">
                        New here?{' '}
                        <Link
                            to="/signup"
                            className="font-medium text-primary hover:underline"
                        >
                            Create an account
                        </Link>
                    </p>
                </div>

                <div className="flex items-center justify-center bg-muted/30 dark:bg-primary/5 relative">
                    <img
                        src="/right-bg.png"
                        alt="Skillcheck illustration"
                        className="w-full h-full hidden lg:block dark:hidden object-cover"
                    />
                    <img
                        src="/dark-cartoon.png"
                        alt="Skillcheck illustration"
                        className="w-full h-full hidden dark:lg:block object-cover"
                    />
                </div>
            </div>
        </div>
    );
};
