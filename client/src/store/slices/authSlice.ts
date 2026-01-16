
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

interface User {
    _id: string;
    email: string;
    name: string;
    role: string;
    token?: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}

// Hydrate state from localStorage
const storedToken = localStorage.getItem('token');

if (storedToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

const initialState: AuthState = {
    user: null, // Always null on load, will be fetched via token
    token: storedToken ? storedToken : null,
    isAuthenticated: !!storedToken,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (
            state,
            action: PayloadAction<{ user: User; token: string }>
        ) => {
            const { user, token } = action.payload;
            state.user = user;
            state.token = token;
            state.isAuthenticated = true;
            localStorage.setItem('token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        },
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
        },
    },
});

export const { setCredentials, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
