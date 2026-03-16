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

  // Aggregated counts for quick UI rendering
  counts: {
    sessions: number;
    evaluatedSessions: number;
    pendingSessions: number;
    skillsPracticed: number;
  };
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

  counts: {
    sessions: 0,
    evaluatedSessions: 0,
    pendingSessions: 0,
    skillsPracticed: 0,
  },
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
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;

    if (
      isCacheValid(state.data.overviewFetchedAt) &&
      isCacheValid(state.data.activitiesFetchedAt) &&
      state.data.overview.length > 0 &&
      state.data.activities.length > 0
    ) {
      return {
        cached: true,
        overview: state.data.overview,
        activities: state.data.activities,
        counts: state.data.counts,
      };
    }

    try {
      const res = await api.get("/users/me/dashboard");
      if (res.data.success === 1) {
        return {
          cached: false,
          overview: res.data.data.overview as OverviewItem[],
          activities: res.data.data.activities as ActivityItem[],
          counts: res.data.data.counts as DataState["counts"],
        };
      }
      return rejectWithValue("Failed to fetch dashboard data");
    } catch (error) {
      return rejectWithValue("Failed to fetch dashboard data");
    }
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
      state.counts = {
        sessions: 0,
        evaluatedSessions: 0,
        pendingSessions: 0,
        skillsPracticed: 0,
      };
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
          state.counts.skillsPracticed = action.payload.data.length;
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
          state.counts.sessions = action.payload.data.length;

          const evaluatedSessions = action.payload.data.filter(
            (item) => item.evaluated,
          ).length;
          state.counts.evaluatedSessions = evaluatedSessions;
          state.counts.pendingSessions =
            action.payload.data.length - evaluatedSessions;
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

    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.overviewLoading = true;
        state.activitiesLoading = true;
        state.overviewError = null;
        state.activitiesError = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.overviewLoading = false;
        state.activitiesLoading = false;

        if (!action.payload.cached) {
          state.overview = action.payload.overview;
          state.activities = action.payload.activities;
          state.counts = action.payload.counts;
          state.overviewFetchedAt = Date.now();
          state.activitiesFetchedAt = Date.now();
        }
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.overviewLoading = false;
        state.activitiesLoading = false;
        const message = action.payload as string;
        state.overviewError = message;
        state.activitiesError = message;
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
