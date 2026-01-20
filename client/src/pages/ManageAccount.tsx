
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Shield, Trash2, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const ManageAccount: React.FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [name, setName] = useState(user?.name || '');
    const [role, setRole] = useState(user?.role || 'student');
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.patch('/users/me', { name, role });
            if (res.data.success) {
                dispatch(setUser(res.data.data.user));
                toast.success("Profile updated successfully");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        try {
            const res = await api.delete('/users/me');
            if (res.data.success) {
                toast.success("Account deleted successfully");
                // The backend likely cleared the session or we should manually logout
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete account");
            setDeleteLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="group flex items-center gap-2 text-muted-foreground hover:text-foreground -ml-4"
            >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Back
            </Button>

            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">Manage Account</h1>
                <p className="text-sm text-muted-foreground">Manage your personal information and account settings.</p>
            </div>

            <div className="space-y-6">
                {/* Personal Information */}
                <Card className="rounded-xl border border-border shadow-none overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
                        <CardDescription>Update your display name and role within the platform.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                                <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg border border-border text-muted-foreground cursor-not-allowed">
                                    <Mail className="h-4 w-4" />
                                    <span className="text-sm">{user?.email}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 px-1">Email cannot be changed at this time.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-10 h-10 rounded-lg"
                                        placeholder="Enter your name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Role</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setRole('student')}
                                        className={cn(
                                            "flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left",
                                            role === 'student'
                                                ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                                                : "border-border hover:border-primary/20 bg-card"
                                        )}
                                    >
                                        <div>
                                            <p className="font-bold text-sm">Student</p>
                                            <p className="text-[10px] text-muted-foreground">Learning and validating</p>
                                        </div>
                                        {role === 'student' && <Check className="h-4 w-4 text-primary" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('engineer')}
                                        className={cn(
                                            "flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left",
                                            role === 'engineer'
                                                ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                                                : "border-border hover:border-primary/20 bg-card"
                                        )}
                                    >
                                        <div>
                                            <p className="font-bold text-sm">Engineer</p>
                                            <p className="text-[10px] text-muted-foreground">Professional level checks</p>
                                        </div>
                                        {role === 'engineer' && <Check className="h-4 w-4 text-primary" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="h-10 px-8 rounded-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Security Section (Placeholder for now) */}
                <Card className="rounded-xl border border-border shadow-none opacity-60">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4" /> Security
                        </CardTitle>
                        <CardDescription>Password and authentication settings coming soon.</CardDescription>
                    </CardHeader>
                </Card>

                {/* Danger Zone */}
                <div className="pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-4 px-1">Danger Zone</h3>
                    <Card className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/10 shadow-none">
                        <CardContent className="p-6 flex items-center justify-between gap-6">
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-foreground">Delete Account</p>
                                <p className="text-xs text-muted-foreground">Permanently remove your account and all associated data. This action cannot be undone.</p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="h-9 rounded-lg px-4 text-xs font-bold shrink-0"
                            >
                                Delete Account
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="relative bg-card border border-border w-full max-w-sm rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-3 bg-red-500/10 text-red-500 rounded-full">
                                <Trash2 className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-foreground">Are you absolutely sure?</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Deleting your account is permanent. All your skill history, recordings, and evaluations will be erased forever.
                                </p>
                            </div>
                            <div className="flex flex-col w-full gap-2 pt-2">
                                <Button
                                    variant="destructive"
                                    className="h-10 rounded-lg font-bold"
                                    onClick={handleDeleteAccount}
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Yes, Delete Everything"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="h-10 rounded-lg font-medium text-muted-foreground"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={deleteLoading}
                                >
                                    Go Back
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
