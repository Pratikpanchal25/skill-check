import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { RootState } from "../index";

// Types
export interface OverviewItem {
  skill: string;
  averageClarity: number;
  averageCorrectness: number;
  averageDepth: number;
  totalMissingConcepts: string[];
  sessionCount: number;
}

export interface ActivityItem {
  id: string;
  skill: string;
  mode: string;
  createdAt: string;
  evaluated: boolean;
  score: number | null;
}

export interface SkillItem {
  _id: string;
  name: string;
  category?: string;
}

export interface DataState {
  // Overview data
  overview: OverviewItem[];
  overviewLoading: boolean;
  overviewError: string | null;
  overviewFetchedAt: number | null;

  // Activity data
  activities: ActivityItem[];
  activitiesLoading: boolean;
  activitiesError: string | null;
  activitiesFetchedAt: number | null;

  // Skills list
  skills: SkillItem[];
  skillsLoading: boolean;
  skillsError: string | null;
  skillsFetchedAt: number | null;
}

const initialState: DataState = {
  overview: [],
  overviewLoading: false,
  overviewError: null,
  overviewFetchedAt: null,

  activities: [],
  activitiesLoading: false,
  activitiesError: null,
  activitiesFetchedAt: null,

  skills: [],
  skillsLoading: false,
  skillsError: null,
  skillsFetchedAt: null,
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Helper to check if cache is valid
const isCacheValid = (fetchedAt: number | null): boolean => {
  if (!fetchedAt) return false;
  return Date.now() - fetchedAt < CACHE_DURATION;
};

// Async thunks
export const fetchOverview = createAsyncThunk(
  "data/fetchOverview",
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;

    // Check if cache is valid
    if (
      isCacheValid(state.data.overviewFetchedAt) &&
      state.data.overview.length > 0
    ) {
      return { cached: true, data: state.data.overview };
    }

    try {
      const res = await api.get("/users/me/overview");
      if (res.data.success === 1) {
        return {
          cached: false,
          data: res.data.data.overview as OverviewItem[],
        };
      }
      return rejectWithValue("Failed to fetch overview");
    } catch (error) {
      return rejectWithValue("Failed to fetch overview");
    }
  },
);

export const fetchActivities = createAsyncThunk(
  "data/fetchActivities",
  async (forceRefresh: boolean = false, { getState, rejectWithValue }) => {
    const state = getState() as RootState;

    // Check if cache is valid (unless force refresh)
    if (
      !forceRefresh &&
      isCacheValid(state.data.activitiesFetchedAt) &&
      state.data.activities.length > 0
    ) {
      return { cached: true, data: state.data.activities };
    }

    try {
      const res = await api.get("/users/me/activity");
      if (res.data.success === 1) {
        return {
          cached: false,
          data: res.data.data.activities as ActivityItem[],
        };
      }
      return rejectWithValue("Failed to fetch activities");
    } catch (error) {
      return rejectWithValue("Failed to fetch activities");
    }
  },
);

export const fetchSkills = createAsyncThunk(
  "data/fetchSkills",
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;

    // Skills rarely change, so use longer cache or check if already loaded
    if (state.data.skills.length > 0 && state.data.skillsFetchedAt) {
      return { cached: true, data: state.data.skills };
    }

    try {
      const res = await api.get("/skills");
      if (res.data.success === 1) {
        return { cached: false, data: res.data.data.skills as SkillItem[] };
      }
      return rejectWithValue("Failed to fetch skills");
    } catch (error) {
      return rejectWithValue("Failed to fetch skills");
    }
  },
);

// Fetch both overview and activities together (for dashboard)
export const fetchDashboardData = createAsyncThunk(
  "data/fetchDashboardData",
  async (_, { dispatch }) => {
    await Promise.all([
      dispatch(fetchOverview()),
      dispatch(fetchActivities(false)),
    ]);
  },
);

const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    // Invalidate cache when new session is created/evaluated
    invalidateActivities: (state) => {
      state.activitiesFetchedAt = null;
    },
    invalidateOverview: (state) => {
      state.overviewFetchedAt = null;
    },
    invalidateAll: (state) => {
      state.activitiesFetchedAt = null;
      state.overviewFetchedAt = null;
    },
    // Add a new activity to the list (optimistic update)
    addActivity: (state, action: PayloadAction<ActivityItem>) => {
      state.activities.unshift(action.payload);
    },
    // Update an activity (when evaluated)
    updateActivity: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<ActivityItem> }>,
    ) => {
      const index = state.activities.findIndex(
        (a) => a.id === action.payload.id,
      );
      if (index !== -1) {
        state.activities[index] = {
          ...state.activities[index],
          ...action.payload.updates,
        };
      }
    },
    clearData: (state) => {
      state.overview = [];
      state.overviewFetchedAt = null;
      state.activities = [];
      state.activitiesFetchedAt = null;
      state.skills = [];
      state.skillsFetchedAt = null;
    },
  },
  extraReducers: (builder) => {
    // Overview
    builder
      .addCase(fetchOverview.pending, (state) => {
        state.overviewLoading = true;
        state.overviewError = null;
      })
      .addCase(fetchOverview.fulfilled, (state, action) => {
        state.overviewLoading = false;
        if (!action.payload.cached) {
          state.overview = action.payload.data;
          state.overviewFetchedAt = Date.now();
        }
      })
      .addCase(fetchOverview.rejected, (state, action) => {
        state.overviewLoading = false;
        state.overviewError = action.payload as string;
      });

    // Activities
    builder
      .addCase(fetchActivities.pending, (state) => {
        state.activitiesLoading = true;
        state.activitiesError = null;
      })
      .addCase(fetchActivities.fulfilled, (state, action) => {
        state.activitiesLoading = false;
        if (!action.payload.cached) {
          state.activities = action.payload.data;
          state.activitiesFetchedAt = Date.now();
        }
      })
      .addCase(fetchActivities.rejected, (state, action) => {
        state.activitiesLoading = false;
        state.activitiesError = action.payload as string;
      });

    // Skills
    builder
      .addCase(fetchSkills.pending, (state) => {
        state.skillsLoading = true;
        state.skillsError = null;
      })
      .addCase(fetchSkills.fulfilled, (state, action) => {
        state.skillsLoading = false;
        if (!action.payload.cached) {
          state.skills = action.payload.data;
          state.skillsFetchedAt = Date.now();
        }
      })
      .addCase(fetchSkills.rejected, (state, action) => {
        state.skillsLoading = false;
        state.skillsError = action.payload as string;
      });
  },
});

export const {
  invalidateActivities,
  invalidateOverview,
  invalidateAll,
  addActivity,
  updateActivity,
  clearData,
} = dataSlice.actions;

export default dataSlice.reducer;
