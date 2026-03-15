
import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';

export const DashboardLayout: React.FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <div className="h-screen w-full bg-background text-foreground transition-colors duration-300 flex flex-col overflow-hidden">
            {/* Top Navigation */}
            <header className="bg-card border-b border-border z-10 shadow-sm shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 sm:h-20">
                        {/* Logo */}
                        <div className="flex items-center">
                            <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                                <img src="/logo.png" alt="Skill Check" className="h-10 sm:h-20 w-auto shrink-0" />
                                <div className="flex sm:hidden flex-col leading-none">
                                    <span className="text-sm font-black tracking-wide uppercase">SkillCraft</span>
                                    <span className="h-0.5 w-full rounded-full bg-linear-to-r from-blue-600 via-sky-500 to-emerald-400 mt-1" />
                                </div>
                                <div className="hidden sm:flex flex-col leading-none">
                                    <span className="text-2xl font-black tracking-wide uppercase">SkillCraft</span>
                                    <span className="h-1 w-full rounded-full bg-linear-to-r from-blue-600 via-sky-500 to-emerald-400 mt-1" />
                                    <span className="mt-1 text-[11px] font-medium tracking-[0.35em] text-muted-foreground uppercase">AI-Powered Feedback</span>
                                </div>
                            </Link>
                        </div>

                        {/* Right Side */}
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <ModeToggle />
                            <Link to="/dashboard/profile" className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border transition-colors group cursor-pointer">
                                <User className="h-4 w-4 group-hover:text-primary transition-colors" />
                                <span className="font-medium">{user?.name}</span>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={() => setShowLogoutConfirm(true)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden thin-scrollbar relative">
                <Outlet />
            </main>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm cursor-pointer" onClick={() => setShowLogoutConfirm(false)} />
                    <div className="relative bg-card border border-border w-full max-w-md rounded-xl shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-border/30 flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                                <LogOut className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Sign Out</h3>
                                <p className="text-xs text-muted-foreground">End your current session</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <p className="text-sm text-muted-foreground mb-6">
                                Are you sure you want to sign out? You'll need to log in again to access your account.
                            </p>

                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => setShowLogoutConfirm(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={handleLogout}
                                >
                                    Sign Out
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
