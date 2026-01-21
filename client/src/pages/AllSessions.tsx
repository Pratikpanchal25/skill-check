import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchActivities } from '@/store/slices/dataSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mic, Search, Filter, TrendingUp, ChevronDown, CheckCircle2, Clock, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';
type FilterOption = 'all' | 'evaluated' | 'pending';

export const AllSessions: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    
    // Get activities from Redux store
    const { activities, activitiesLoading: loading } = useSelector((state: RootState) => state.data);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [filterBy, setFilterBy] = useState<FilterOption>('all');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setShowSortMenu(false);
            }
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setShowFilterMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        dispatch(fetchActivities(false));
    }, [dispatch]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today, ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday, ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else if (diffDays < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'long' }) + ', ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-green-500';
        if (score >= 6) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getScoreBg = (score: number) => {
        if (score >= 8) return 'bg-green-500/10';
        if (score >= 6) return 'bg-yellow-500/10';
        return 'bg-red-500/10';
    };

    // Filter and sort activities
    const filteredActivities = activities
        .filter(activity => {
            // Search filter
            if (searchQuery && !activity.skill.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            // Status filter
            if (filterBy === 'evaluated' && !activity.evaluated) return false;
            if (filterBy === 'pending' && activity.evaluated) return false;
            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'oldest':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'highest':
                    return (b.score ?? -1) - (a.score ?? -1);
                case 'lowest':
                    return (a.score ?? 11) - (b.score ?? 11);
                default:
                    return 0;
            }
        });

    // Group by date
    const groupedActivities = filteredActivities.reduce((groups, activity) => {
        const date = new Date(activity.createdAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let groupKey: string;
        if (date.toDateString() === today.toDateString()) {
            groupKey = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            groupKey = 'Yesterday';
        } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
            groupKey = 'This Week';
        } else if (date > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
            groupKey = 'This Month';
        } else {
            groupKey = 'Earlier';
        }

        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(activity);
        return groups;
    }, {} as Record<string, typeof activities>);

    const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Earlier'];
    const sortedGroups = groupOrder.filter(group => groupedActivities[group]?.length > 0);

    const sortOptions: { value: SortOption; label: string }[] = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'highest', label: 'Highest Score' },
        { value: 'lowest', label: 'Lowest Score' },
    ];

    const filterOptions: { value: FilterOption; label: string }[] = [
        { value: 'all', label: 'All Sessions' },
        { value: 'evaluated', label: 'Evaluated' },
        { value: 'pending', label: 'Pending' },
    ];

    // Stats
    const evaluatedCount = activities.filter(a => a.evaluated).length;
    const pendingCount = activities.filter(a => !a.evaluated).length;
    const avgScore = evaluatedCount > 0
        ? activities.filter(a => a.evaluated && a.score !== null).reduce((acc, a) => acc + (a.score ?? 0), 0) / evaluatedCount
        : 0;

    return (
        <div className="bg-background h-full flex flex-col overflow-hidden">
            <div className="max-w-7xl mx-auto w-full flex flex-col h-full px-8">
                {/* Header */}
                <div className="py-6 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="mb-4 -ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">All Sessions</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                View and manage all your skill check sessions
                            </p>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="border border-border/50 rounded-xl bg-card px-5 py-4 hover:border-border/80 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                    <Mic className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                                    <p className="text-2xl font-bold">{activities.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="border border-border/50 rounded-xl bg-card px-5 py-4 hover:border-border/80 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Evaluated</p>
                                    <p className="text-2xl font-bold">{evaluatedCount}</p>
                                </div>
                            </div>
                        </div>
                        <div className="border border-border/50 rounded-xl bg-card px-5 py-4 hover:border-border/80 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
                                    <p className="text-2xl font-bold">{pendingCount}</p>
                                </div>
                            </div>
                        </div>
                        <div className="border border-border/50 rounded-xl bg-card px-5 py-4 hover:border-border/80 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Score</p>
                                    <p className="text-2xl font-bold">{avgScore.toFixed(1)}<span className="text-sm text-muted-foreground font-normal">/10</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="pb-4 shrink-0">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by skill name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-10 bg-card border-border/50"
                            />
                        </div>
                        
                        <div className="flex gap-2">
                            {/* Sort Dropdown */}
                            <div className="relative" ref={sortRef}>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowSortMenu(!showSortMenu);
                                        setShowFilterMenu(false);
                                    }}
                                    className="gap-2 cursor-pointer h-10 bg-card border-border/50 hover:bg-muted/50"
                                >
                                    <ArrowUpDown className="h-4 w-4" />
                                    <span className="hidden sm:inline">{sortOptions.find(o => o.value === sortBy)?.label}</span>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", showSortMenu && "rotate-180")} />
                                </Button>
                                {showSortMenu && (
                                    <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-xl shadow-xl py-1.5 min-w-45 animate-in fade-in-0 zoom-in-95 duration-150">
                                        {sortOptions.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    setSortBy(option.value);
                                                    setShowSortMenu(false);
                                                }}
                                                className={cn(
                                                    "w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 transition cursor-pointer flex items-center justify-between",
                                                    sortBy === option.value && "bg-muted/50 font-medium text-primary"
                                                )}
                                            >
                                                {option.label}
                                                {sortBy === option.value && <CheckCircle2 className="h-4 w-4" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Filter Dropdown */}
                            <div className="relative" ref={filterRef}>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowFilterMenu(!showFilterMenu);
                                        setShowSortMenu(false);
                                    }}
                                    className={cn(
                                        "gap-2 cursor-pointer h-10 bg-card border-border/50 hover:bg-muted/50",
                                        filterBy !== 'all' && "border-primary/50 bg-primary/5"
                                    )}
                                >
                                    <Filter className="h-4 w-4" />
                                    <span className="hidden sm:inline">{filterOptions.find(o => o.value === filterBy)?.label}</span>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", showFilterMenu && "rotate-180")} />
                                </Button>
                                {showFilterMenu && (
                                    <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-xl shadow-xl py-1.5 min-w-45 animate-in fade-in-0 zoom-in-95 duration-150">
                                        {filterOptions.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    setFilterBy(option.value);
                                                    setShowFilterMenu(false);
                                                }}
                                                className={cn(
                                                    "w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 transition cursor-pointer flex items-center justify-between",
                                                    filterBy === option.value && "bg-muted/50 font-medium text-primary"
                                                )}
                                            >
                                                {option.label}
                                                {filterBy === option.value && <CheckCircle2 className="h-4 w-4" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active filters */}
                    {(searchQuery || filterBy !== 'all') && (
                        <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs text-muted-foreground">
                                {filteredActivities.length} result{filteredActivities.length !== 1 ? 's' : ''}
                            </span>
                            {(searchQuery || filterBy !== 'all') && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterBy('all');
                                    }}
                                    className="text-xs text-primary hover:underline cursor-pointer"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Sessions List */}
                <div className="flex-1 overflow-y-auto pb-8 -mx-2 px-2">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <div className="border border-border/50 rounded-xl bg-card py-20 text-center">
                            <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                                <Mic className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <p className="font-semibold text-lg">No sessions found</p>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                {searchQuery || filterBy !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'Start your first skill check to see sessions here'}
                            </p>
                            {(searchQuery || filterBy !== 'all') && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterBy('all');
                                    }}
                                    className="mt-4 cursor-pointer"
                                >
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {sortedGroups.map(groupName => (
                                <div key={groupName}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {groupName}
                                        </h3>
                                        <div className="flex-1 h-px bg-border/30" />
                                        <span className="text-xs text-muted-foreground">
                                            {groupedActivities[groupName].length} session{groupedActivities[groupName].length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="border border-border/50 rounded-xl bg-card overflow-hidden divide-y divide-border/30">
                                        {groupedActivities[groupName].map(activity => (
                                            <button
                                                key={activity.id}
                                                onClick={() => navigate(activity.evaluated ? `/dashboard/session/${activity.id}` : `/dashboard/session/${activity.id}/record`)}
                                                className="w-full px-5 py-4 flex justify-between items-center text-left hover:bg-muted/40 transition-colors cursor-pointer group"
                                            >
                                                <div className="flex gap-4 min-w-0 flex-1">
                                                    <div className={cn(
                                                        'p-3 rounded-xl shrink-0 transition-transform group-hover:scale-105',
                                                        activity.evaluated
                                                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                                            : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                                    )}>
                                                        <Mic className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-base font-semibold truncate group-hover:text-primary transition-colors">{activity.skill}</p>
                                                        <p className="text-sm text-muted-foreground mt-0.5">
                                                            {activity.mode} • {formatDate(activity.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                {activity.evaluated ? (
                                                    <div className={cn("px-4 py-2 rounded-xl", getScoreBg(activity.score ?? 0))}>
                                                        <span className={cn("text-lg font-bold", getScoreColor(activity.score ?? 0))}>
                                                            {activity.score?.toFixed(1) ?? 0}<span className="text-sm font-normal opacity-70">/10</span>
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold uppercase bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-4 py-2 rounded-xl">
                                                        Pending
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AllSessions;
