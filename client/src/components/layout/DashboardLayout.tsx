
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
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Top Navigation */}
            <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <Link to="/dashboard" className="flex items-center space-x-2">
                                <img src="/logo.png" alt="Skillcheck" className="h-12 mt-1 auto" />
                                <span className="text-xl font-bold tracking-tight">Skillcheck</span>
                            </Link>
                        </div>

                        {/* Right Side */}
                        <div className="flex items-center space-x-4">
                            <ModeToggle />
                            <Link to="/dashboard/profile" className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border transition-colors group">
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
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-background/40 backdrop-blur-md" onClick={() => setShowLogoutConfirm(false)} />
                    <div className="relative bg-card border border-border w-full max-w-[320px] rounded-4xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center space-y-5">
                            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                                <LogOut className="h-6 w-6" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-xl font-bold tracking-tight text-foreground">Sign Out?</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed px-2">Are you sure you want to exit your session?</p>
                            </div>
                            <div className="flex flex-col w-full gap-2 pt-2">
                                <Button
                                    variant="destructive"
                                    className="h-11 rounded-xl font-bold"
                                    onClick={handleLogout}
                                >
                                    Log Out
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="h-11 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                                    onClick={() => setShowLogoutConfirm(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
