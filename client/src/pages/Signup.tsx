import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ModeToggle } from '@/components/mode-toggle'
import api from '@/lib/api'
import { AxiosError } from 'axios'
import clsx from 'clsx'
import { toast } from 'sonner'

export const Signup: React.FC = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student' as 'student' | 'engineer',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await api.post('/users', formData)
            if (res.data.success) {
                toast.success('Account created 🎉', {
                    description: 'You can now log in and start improving your skills.',
                })
                navigate('/login')
            } else {
                toast.error('Signup failed', {
                    description: res.data.message,
                })
            }
        } catch (err) {
            const error = err as AxiosError<{ message: string }>
            toast.error('Signup failed', {
                description:
                    error.response?.data?.message ||
                    'Something went wrong. Please try again.',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-background px-6">
            {/* Theme Toggle */}
            <div className="absolute top-6 right-6">
                <ModeToggle />
            </div>

            {/* MAIN CARD */}
            <div className="relative w-full max-w-6xl h-[850px] grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden bg-card border border-border shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] dark:shadow-none">

                {/* LEFT – FORM */}
                <div className="p-12 md:p-16 flex flex-col justify-center">
                    {/* Logo */}
                    <div className="mb-10 flex items-center gap-2">
                        <img src="/logo.png" alt="Skillcheck" className="h-16 w-auto" />
                        <span className="text-xl font-semibold tracking-tight text-foreground">
                            Skillcheck
                        </span>
                    </div>

                    <h1 className="text-3xl font-semibold mb-2 text-foreground">
                        Create account
                    </h1>
                    <p className="text-sm text-muted-foreground mb-10 max-w-sm">
                        Start tracking what you really know — and what you don’t.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6 max-w-sm">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <Label className="text-foreground">Full name</Label>
                            <Input
                                name="name"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={handleChange}
                                className="h-12 rounded-full bg-muted/50 border-input focus:bg-background text-foreground"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <Label className="text-foreground">Email</Label>
                            <Input
                                type="email"
                                name="email"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                className="h-12 rounded-full bg-muted/50 border-input focus:bg-background text-foreground"
                                required
                            />
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <Label className="text-foreground">I am a</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {(['student', 'engineer'] as const).map(role => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() =>
                                            setFormData({ ...formData, role })
                                        }
                                        className={clsx(
                                            'h-12 rounded-full border text-sm font-medium transition',
                                            formData.role === role
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-input hover:bg-muted text-foreground'
                                        )}
                                    >
                                        {role === 'student'
                                            ? 'Student'
                                            : 'Engineer'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <Label className="text-foreground">Password</Label>
                            <Input
                                type="password"
                                name="password"
                                placeholder="Create a strong password"
                                value={formData.password}
                                onChange={handleChange}
                                className="h-12 rounded-full bg-muted/50 border-input focus:bg-background text-foreground"
                                required
                            />
                        </div>

                        <Button
                            size="lg"
                            className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                            disabled={loading}
                        >
                            {loading ? 'Creating account...' : 'Create account'}
                        </Button>
                    </form>

                    <p className="mt-10 text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="font-medium text-primary hover:underline"
                        >
                            Log in
                        </Link>
                    </p>
                </div>

                {/* RIGHT – ILLUSTRATION */}
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
    )
}
