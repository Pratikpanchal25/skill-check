
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Shield, Trash2, ArrowLeft, Check, Loader2, Settings, AlertTriangle, Key, Lock } from 'lucide-react';
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
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete account");
            setDeleteLoading(false);
        }
    };

    return (
        <div className="bg-background overflow-hidden">
            {/* Header */}
            <div className="border-b border-border/30 px-6 py-5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(-1)}
                            className="group flex items-center gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Back
                        </Button>
                        <div className="h-6 w-px bg-border/50" />
                        <h1 className="text-xl font-semibold text-foreground">
                            Manage Account
                        </h1>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 px-6 py-6 items-start">
                
                {/* LEFT COLUMN - Settings */}
                <div className="space-y-6">
                    {/* Personal Information */}
                    <div className="border border-border/50 rounded-xl bg-card">
                        <div className="px-6 py-4 border-b border-border/30">
                            <h3 className="text-sm font-semibold">Personal Information</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Update your display name and role
                            </p>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        Email Address
                                    </Label>
                                    <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/30 rounded-lg border border-border text-muted-foreground">
                                        <Mail className="h-4 w-4" />
                                        <span className="text-sm">{user?.email}</span>
                                        <Lock className="h-3 w-3 ml-auto" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                                        Full Name
                                    </Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="pl-10 bg-muted/30 border-border focus:bg-background"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        Your Role
                                    </Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setRole('student')}
                                            className={cn(
                                                "flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all text-left cursor-pointer",
                                                role === 'student'
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/30"
                                            )}
                                        >
                                            <div>
                                                <p className="font-medium text-sm">Student</p>
                                                <p className="text-xs text-muted-foreground">Learning & validating</p>
                                            </div>
                                            {role === 'student' && <Check className="h-4 w-4 text-primary" />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRole('engineer')}
                                            className={cn(
                                                "flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all text-left cursor-pointer",
                                                role === 'engineer'
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/30"
                                            )}
                                        >
                                            <div>
                                                <p className="font-medium text-sm">Engineer</p>
                                                <p className="text-xs text-muted-foreground">Professional level</p>
                                            </div>
                                            {role === 'engineer' && <Check className="h-4 w-4 text-primary" />}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full"
                                >
                                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Save Changes
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* Security Section */}
                    <div className="border border-border/50 rounded-xl bg-card opacity-60">
                        <div className="px-6 py-4 border-b border-border/30">
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                <h3 className="text-sm font-semibold">Security</h3>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Password and authentication settings coming soon
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Key className="h-4 w-4" />
                                <span className="text-sm">Password management will be available here</span>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="border border-red-500/30 rounded-xl bg-red-500/5">
                        <div className="px-6 py-4 border-b border-red-500/20">
                            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Irreversible actions
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium">Delete Account</p>
                                    <p className="text-xs text-muted-foreground">
                                        Permanently remove your account and all data
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    Delete Account
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - Account Summary */}
                <div className="space-y-6">
                    {/* Account Overview */}
                    <div className="border border-border/50 rounded-xl bg-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Settings className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Account Overview</h2>
                                <p className="text-xs text-muted-foreground">Your current settings</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-border/30">
                                <span className="text-sm text-muted-foreground">Name</span>
                                <span className="text-sm font-medium">{name || user?.name}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-border/30">
                                <span className="text-sm text-muted-foreground">Email</span>
                                <span className="text-sm font-medium">{user?.email}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-border/30">
                                <span className="text-sm text-muted-foreground">Role</span>
                                <span className="text-sm font-medium capitalize">{role}</span>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <span className="text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded">
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Help Card */}
                    <div className="border border-border/50 rounded-xl bg-muted/20 p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold mb-1">Need Help?</h4>
                                <p className="text-xs text-muted-foreground">
                                    If you're having trouble with your account, contact support for assistance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm cursor-pointer" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="relative bg-card border border-border w-full max-w-md rounded-xl shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-border/30 flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Delete Account</h3>
                                <p className="text-xs text-muted-foreground">This action cannot be undone</p>
                            </div>
                        </div>
                        
                        {/* Content */}
                        <div className="p-6">
                            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-6">
                                <p className="text-sm text-foreground">
                                    Are you absolutely sure you want to delete your account?
                                </p>
                                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                                    <li>• All your skill history will be erased</li>
                                    <li>• All recordings will be permanently deleted</li>
                                    <li>• All evaluations will be removed</li>
                                </ul>
                            </div>
                            
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={deleteLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={handleDeleteAccount}
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Delete Everything
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
