
import React, { useState, useEffect, useRef } from 'react';
import type { Profile, Notification, SearchHistoryItem, Post } from '../types';
import { UserCircleIcon, ChevronDownIcon, LogoutIcon, UserIcon, BellIcon, QuestionMarkCircleIcon, SettingsIcon, XIcon, ChevronRightIcon, AttendanceIcon, SunIcon, MoonIcon, SparklesIcon, SearchIcon, ClockIcon, TrashIcon, ChevronLeftIcon, MessageCircleIcon, ChatIcon, ShieldCheckIcon, MonitorIcon, FundsIcon, ExternalLinkIcon, CalendarIcon, UsersIcon as UsersGroupIcon, HomeIcon } from './Icons';
import { Spinner } from './Spinner';
import HelpGuide from './HelpGuide';
import { db, firestore } from '../services';

type View = 'homepage' | 'calendar' | 'settings' | 'profile' | 'funds' | 'attendance' | 'mayor' | 'notifications' | 'monitor' | 'friends' | 'chats' | 'ai-assistant';

interface HeaderProps {
    profile: Profile | null;
    setActiveView: (view: View) => void;
    onSignOut: () => void;
    isSigningOut: boolean;
    notifications: Notification[];
    unreadChatCount: number;
    onMarkAsRead: () => void;
    onDeleteRead: () => void;
    onViewProfile?: (profile: Profile) => void;
    onViewPost?: (post: Post, author: Profile) => void;
}

// --- Menu Helper Components ---

const MenuAccordion: React.FC<{
    icon: React.ReactNode;
    label: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ icon, label, isOpen, onToggle, children }) => (
    <div className="bg-white dark:bg-gray-800 overflow-hidden transition-all duration-300 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-3">
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors"
        >
            <div className="flex items-center gap-3">
                {icon}
                <span className="font-semibold text-gray-900 dark:text-white text-base">{label}</span>
            </div>
            <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-2 pb-2 space-y-1">
                {children}
            </div>
        </div>
    </div>
);

const MenuSubItem: React.FC<{
    icon?: React.ReactNode;
    label: string;
    onClick?: () => void;
    rightElement?: React.ReactNode;
}> = ({ icon, label, onClick, rightElement }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left ${!onClick ? 'cursor-default' : ''}`}
    >
        <div className="flex items-center gap-3">
            {icon && <div className="text-gray-500 dark:text-gray-400">{icon}</div>}
            <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">{label}</span>
        </div>
        {rightElement}
    </button>
);

const ShortcutCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    description?: string;
    onClick: () => void;
    colorClass: string;
    iconColorClass: string;
}> = ({ icon, label, description, onClick, colorClass, iconColorClass }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-start p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all active:scale-95 text-left h-full"
    >
        <div className={`p-2 rounded-lg ${colorClass} ${iconColorClass} mb-2`}>
            {icon}
        </div>
        <span className="font-semibold text-gray-900 dark:text-white text-sm mb-0.5">{label}</span>
        {description && <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{description}</span>}
    </button>
);

const Header: React.FC<HeaderProps> = ({ profile, setActiveView, onSignOut, isSigningOut, notifications, unreadChatCount, onViewProfile, onViewPost }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [helpGuideOpen, setHelpGuideOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
        } catch (e) {
            // Ignore localStorage errors
        }
        return false;
    });
    
    // Accordion States
    const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(true); // Default open if admin

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Search State
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{
        users: Profile[];
        posts: { post: Post, author: Profile }[];
    }>({ users: [], posts: [] });
    
    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchDropdownRef = useRef<HTMLDivElement>(null);

    // Admin Tools State
    const [treasurerUrl, setTreasurerUrl] = useState('https://treasurer-s-portal-nchx.vercel.app/');

    useEffect(() => {
        try {
            if (darkMode) {
                document.documentElement.classList.add('dark');
                if(typeof window !== 'undefined' && window.localStorage) localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                if(typeof window !== 'undefined' && window.localStorage) localStorage.setItem('theme', 'light');
            }
        } catch (e) {
            // Ignore storage errors
        }
    }, [darkMode]);

    // Fetch Search History on Mount
    useEffect(() => {
        if (!profile?.id) return;
        const unsubscribe = db.collection('profiles').doc(profile.id)
            .collection('search_history')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .onSnapshot(snapshot => {
                const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SearchHistoryItem[];
                setSearchHistory(history);
            });
        return () => unsubscribe();
    }, [profile?.id]);

    // Fetch Global Config for Treasurer URL
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const doc = await db.collection('system_settings').doc('global_config').get();
                if (doc.exists && doc.data().treasurer_portal_url) {
                    setTreasurerUrl(doc.data().treasurer_portal_url);
                }
            } catch (err) {
                console.error("Error fetching system config:", err);
            }
        };
        if (profile?.role === 'mayor' || profile?.role === 'treasurer') {
            fetchConfig();
        }
    }, [profile?.role]);

    // Handle Search Input Debounce
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults({ users: [], posts: [] });
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setLoadingSearch(true);
            try {
                const queryLower = searchQuery.toLowerCase();

                // 1. Fetch Users
                const snapshot = await db.collection('profiles').get();
                const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Profile[];
                
                const userResults = allUsers.filter(u => 
                    u.id !== profile?.id &&
                    (
                        (u.full_name && u.full_name.toLowerCase().includes(queryLower)) ||
                        (u.student_id && u.student_id.toLowerCase().includes(queryLower))
                    )
                ).slice(0, 5); // Increased limit slightly

                // 2. Fetch Posts (Optimized: limit to recent 100 for search context)
                const postsSnapshot = await db.collection('posts').orderBy('createdAt', 'desc').limit(100).get();
                const allPosts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
                
                const postResultsRaw = allPosts.filter(p => 
                    p.content && p.content.toLowerCase().includes(queryLower)
                ).slice(0, 3);

                const postResults = postResultsRaw.map(post => {
                    const author = allUsers.find(u => u.id === post.userId) || { id: post.userId, full_name: 'Unknown', role: 'user', student_id: '?' } as Profile;
                    return { post, author };
                });
                
                setSearchResults({ users: userResults, posts: postResults });
            } catch(e) {
                console.error("Search error", e);
            } finally {
                setLoadingSearch(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, profile?.id]);

    // Close Search Dropdown on Click Outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                searchDropdownRef.current && 
                !searchDropdownRef.current.contains(event.target as Node) &&
                !searchInputRef.current?.contains(event.target as Node)
            ) {
                setIsSearchActive(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectUser = async (targetUser: Profile) => {
        if (profile?.id) {
            // Check for existing entry to avoid duplicates in history
            const existing = searchHistory.find(h => h.targetId === targetUser.id);
            if (existing) {
                await db.collection('profiles').doc(profile.id).collection('search_history').doc(existing.id).update({
                    timestamp: firestore.FieldValue.serverTimestamp()
                });
            } else {
                await db.collection('profiles').doc(profile.id).collection('search_history').add({
                    targetId: targetUser.id,
                    full_name: targetUser.full_name,
                    avatar_url: targetUser.avatar_url || null,
                    student_id: targetUser.student_id,
                    timestamp: firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        setSearchQuery('');
        setIsSearchActive(false);
        setMobileSearchOpen(false);
        if (onViewProfile) onViewProfile(targetUser);
    };

    const handleSelectPost = (post: Post, author: Profile) => {
        setSearchQuery('');
        setIsSearchActive(false);
        setMobileSearchOpen(false);
        if (onViewPost) onViewPost(post, author);
    };

    const handleSelectHistory = (item: SearchHistoryItem) => {
        const dummyProfile: Profile = {
            id: item.targetId,
            full_name: item.full_name,
            student_id: item.student_id,
            avatar_url: item.avatar_url,
            role: 'user', // Default
        };
        handleSelectUser(dummyProfile);
    };

    const handleDeleteHistory = async (e: React.MouseEvent, itemId: string) => {
        e.stopPropagation();
        if (profile?.id) {
            await db.collection('profiles').doc(profile.id).collection('search_history').doc(itemId).delete();
        }
    };

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    // Safe Profile Display
    const avatarUrl = profile?.avatar_url || null;
    const fullName = typeof profile?.full_name === 'string' ? profile.full_name : 'User';

    // Helper for Admin Tools Visibility
    const isMayor = profile?.role === 'mayor';
    const isMonitor = profile?.role === 'monitor' || isMayor;
    const isTreasurer = profile?.role === 'treasurer' || isMayor;
    const hasAdminTools = isMayor || isMonitor || isTreasurer;

    // --- Search Results Component (Reusable) ---
    const SearchContent = () => (
        <>
            {searchQuery ? (
                <div>
                    {loadingSearch ? (
                        <div className="p-6 flex justify-center items-center">
                            <Spinner className="h-6 w-6 text-gray-400" />
                        </div>
                    ) : (searchResults.users.length > 0 || searchResults.posts.length > 0) ? (
                        <div className="py-2">
                            {searchResults.users.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                                        People
                                    </div>
                                    <ul>
                                        {searchResults.users.map(user => {
                                            const isIdHidden = user.privacy_student_id !== 'public';
                                            return (
                                                <li key={user.id}>
                                                    <button 
                                                        onClick={() => handleSelectUser(user)}
                                                        className="w-full flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left group"
                                                    >
                                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden border border-gray-100 dark:border-gray-700">
                                                            {user.avatar_url ? (
                                                                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <UserCircleIcon className="h-full w-full text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div className="ml-3 flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.full_name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                                                                <span className="capitalize">{user.role}</span>
                                                                <span>•</span>
                                                                <span>{isIdHidden ? 'ID Hidden' : user.student_id}</span>
                                                            </p>
                                                        </div>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}

                            {searchResults.posts.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 mt-1">
                                        Posts
                                    </div>
                                    <ul>
                                        {searchResults.posts.map(({ post, author }) => (
                                            <li key={post.id}>
                                                <button 
                                                    onClick={() => handleSelectPost(post, author)}
                                                    className="w-full flex items-start px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left group"
                                                >
                                                    <div className="flex-shrink-0 pt-1">
                                                        <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                            <SearchIcon className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-3 min-w-0 flex-1">
                                                        <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2">{post.content}</p>
                                                        <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                            <span className="truncate">Posted by {author.full_name}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            No results found for "{searchQuery}".
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-2">
                    <div className="px-4 py-2 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Recent</span>
                    </div>
                    {searchHistory.length > 0 ? (
                        <ul>
                            {searchHistory.map(item => (
                                <li key={item.id} className="relative group">
                                    <button 
                                        onClick={() => handleSelectHistory(item)}
                                        className="w-full flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left"
                                    >
                                        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                            <ClockIcon className="h-5 w-5" />
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                            <div className="flex items-center">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.full_name}</p>
                                                {item.avatar_url && (
                                                    <img src={item.avatar_url} alt="" className="h-4 w-4 rounded-full ml-2 object-cover opacity-60" />
                                                )}
                                            </div>
                                            {/* Student ID Hidden as requested */}
                                        </div>
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteHistory(e, item.id)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Remove from history"
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-6 text-center text-gray-400 text-sm flex flex-col items-center">
                            <p>No recent searches.</p>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    // Desktop Search Dropdown Wrapper
    const renderDesktopDropdown = () => (
        <div ref={searchDropdownRef} className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 shadow-xl rounded-b-xl border-t border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-fade-in-up max-h-[80vh] overflow-y-auto w-[100%] md:w-[400px] -ml-2 md:ml-0">
            <SearchContent />
        </div>
    );

    return (
        <>
            <HelpGuide 
                isOpen={helpGuideOpen} 
                onClose={() => setHelpGuideOpen(false)} 
                role={profile?.role}
            />

            {/* Mobile Search Overlay */}
            {mobileSearchOpen && (
                <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-900 flex flex-col animate-fade-in">
                    <div className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700">
                        <button onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
                            <ChevronLeftIcon className="h-6 w-6" />
                        </button>
                        <div className="flex-1 relative mx-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search BseePortal..."
                                className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <XIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto relative">
                        <SearchContent />
                    </div>
                </div>
            )}

            {/* FULL SCREEN MENU DRAWER (Facebook Style) */}
            {menuOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
                        onClick={() => setMenuOpen(false)}
                    ></div>
                    
                    {/* Drawer Content */}
                    <div className="relative w-full md:max-w-md h-full bg-gray-100 dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in-from-right transform transition-transform duration-300 overflow-hidden">
                        
                        {/* 1. Header */}
                        <div className="px-4 pt-4 pb-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shadow-sm z-10 shrink-0">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Menu</h2>
                            <button 
                                onClick={() => setMenuOpen(false)}
                                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors text-gray-600 dark:text-gray-300"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* 2. Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            
                            {/* Profile Card (Top of Menu) */}
                            <div 
                                onClick={() => { setMenuOpen(false); setActiveView('profile'); }}
                                className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                            >
                                <div className="relative">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover shadow-sm" />
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                            <UserIcon className="h-6 w-6" inWrapper={false}/>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{fullName}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">See your profile</p>
                                </div>
                            </div>

                            {/* Shortcuts Grid */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 px-1">All Shortcuts</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <ShortcutCard 
                                        icon={<HomeIcon className="h-6 w-6" />} 
                                        label="Home" 
                                        onClick={() => { setMenuOpen(false); setActiveView('homepage'); }}
                                        colorClass="bg-blue-100 dark:bg-blue-900/30"
                                        iconColorClass="text-blue-600 dark:text-blue-400"
                                    />
                                    <ShortcutCard 
                                        icon={<UsersGroupIcon className="h-6 w-6" />} 
                                        label="Community" 
                                        onClick={() => { setMenuOpen(false); setActiveView('friends'); }}
                                        colorClass="bg-indigo-100 dark:bg-indigo-900/30"
                                        iconColorClass="text-indigo-600 dark:text-indigo-400"
                                    />
                                    <ShortcutCard 
                                        icon={<ChatIcon className="h-6 w-6" />} 
                                        label="Messages" 
                                        description={`${unreadChatCount} new`}
                                        onClick={() => { setMenuOpen(false); setActiveView('chats'); }}
                                        colorClass="bg-cyan-100 dark:bg-cyan-900/30"
                                        iconColorClass="text-cyan-600 dark:text-cyan-400"
                                    />
                                    <ShortcutCard 
                                        icon={<CalendarIcon className="h-6 w-6" />} 
                                        label="Calendar" 
                                        onClick={() => { setMenuOpen(false); setActiveView('calendar'); }}
                                        colorClass="bg-red-100 dark:bg-red-900/30"
                                        iconColorClass="text-red-600 dark:text-red-400"
                                    />
                                    <ShortcutCard 
                                        icon={<FundsIcon className="h-6 w-6" />} 
                                        label="Funds" 
                                        onClick={() => { setMenuOpen(false); setActiveView('funds'); }}
                                        colorClass="bg-green-100 dark:bg-green-900/30"
                                        iconColorClass="text-green-600 dark:text-green-400"
                                    />
                                    <ShortcutCard 
                                        icon={<AttendanceIcon className="h-6 w-6" />} 
                                        label="Attendance" 
                                        onClick={() => { setMenuOpen(false); setActiveView('attendance'); }}
                                        colorClass="bg-amber-100 dark:bg-amber-900/30"
                                        iconColorClass="text-amber-600 dark:text-amber-400"
                                    />
                                    <ShortcutCard 
                                        icon={<SparklesIcon className="h-6 w-6" />} 
                                        label="AI Assistant" 
                                        onClick={() => { setMenuOpen(false); setActiveView('ai-assistant'); }}
                                        colorClass="bg-purple-100 dark:bg-purple-900/30"
                                        iconColorClass="text-purple-600 dark:text-purple-400"
                                    />
                                </div>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-700/50 my-2" />

                            {/* Expandable Menus */}
                            
                            <MenuAccordion 
                                icon={<QuestionMarkCircleIcon className="h-7 w-7 text-gray-600 dark:text-gray-300" />} 
                                label="Help & Support"
                                isOpen={isHelpMenuOpen}
                                onToggle={() => setIsHelpMenuOpen(!isHelpMenuOpen)}
                            >
                                <MenuSubItem 
                                    label="Help Guide" 
                                    onClick={() => { setMenuOpen(false); setHelpGuideOpen(true); }}
                                    icon={<QuestionMarkCircleIcon className="h-5 w-5" />}
                                />
                            </MenuAccordion>

                            <MenuAccordion 
                                icon={<SettingsIcon className="h-7 w-7 text-gray-600 dark:text-gray-300" />} 
                                label="Settings & Privacy"
                                isOpen={isSettingsMenuOpen}
                                onToggle={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                            >
                                <MenuSubItem 
                                    label="Settings" 
                                    onClick={() => { setMenuOpen(false); setActiveView('settings'); }} 
                                    icon={<SettingsIcon className="h-5 w-5" />}
                                />
                                <MenuSubItem 
                                    label="Dark Mode" 
                                    onClick={() => {}} 
                                    icon={darkMode ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                                    rightElement={
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleDarkMode(); }}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-6' : ''}`}></span>
                                        </button>
                                    }
                                />
                            </MenuAccordion>

                            {/* Admin Tools (Conditional) */}
                            {hasAdminTools && (
                                <MenuAccordion 
                                    icon={<ShieldCheckIcon className="h-7 w-7 text-gray-600 dark:text-gray-300" />} 
                                    label="Admin Tools"
                                    isOpen={isAdminMenuOpen}
                                    onToggle={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                                >
                                    {isMayor && (
                                        <MenuSubItem 
                                            label="Mayor Portal" 
                                            onClick={() => { setMenuOpen(false); setActiveView('mayor'); }} 
                                            icon={<ShieldCheckIcon className="h-5 w-5" />}
                                        />
                                    )}
                                    {isMonitor && (
                                        <MenuSubItem 
                                            label="Attendance Monitor" 
                                            onClick={() => { setMenuOpen(false); setActiveView('monitor'); }} 
                                            icon={<MonitorIcon className="h-5 w-5" />}
                                        />
                                    )}
                                    {isTreasurer && (
                                        <MenuSubItem 
                                            label="Treasurer Portal" 
                                            onClick={() => {
                                                setMenuOpen(false);
                                                window.open(treasurerUrl, '_blank');
                                            }}
                                            icon={<FundsIcon className="h-5 w-5" />}
                                            rightElement={<ExternalLinkIcon className="h-4 w-4 text-gray-400" />}
                                        />
                                    )}
                                </MenuAccordion>
                            )}

                            {/* Logout Button */}
                            <button
                                onClick={() => { setMenuOpen(false); onSignOut(); }}
                                disabled={isSigningOut}
                                className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 mt-4"
                            >
                                {isSigningOut ? <Spinner className="h-5 w-5" /> : <LogoutIcon className="h-5 w-5" />}
                                {isSigningOut ? 'Logging Out...' : 'Log Out'}
                            </button>

                            <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 pt-4">
                                BseePortal v1.2.0 • Meta Style Menu
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <header className="bg-white dark:bg-gray-800 shadow-sm z-40 relative transition-colors duration-300 h-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                    <div className="flex justify-between items-center h-full">
                        
                        {/* Left: Logo */}
                        <div className="flex items-center">
                            <h1 
                                className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer" 
                                onClick={() => setActiveView('homepage')}
                            >
                                BseePortal
                            </h1>
                        </div>

                        {/* Center: Search Bar (Desktop) */}
                        <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
                            <div className="relative w-full group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-full leading-5 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all shadow-inner"
                                    placeholder="Search BseePortal"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchActive(true)}
                                />
                            </div>
                            {isSearchActive && renderDesktopDropdown()}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center space-x-1 md:space-x-3">
                            {/* Mobile Search Trigger */}
                            <button 
                                onClick={() => setMobileSearchOpen(true)}
                                className="md:hidden p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                            >
                                <SearchIcon className="h-6 w-6" />
                            </button>

                            {/* Theme Toggle (Header Quick Access) */}
                            <button 
                                onClick={toggleDarkMode} 
                                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors focus:outline-none hidden md:block"
                                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {darkMode ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
                            </button>

                            {/* Chats (Mobile - Moved from bottom nav) */}
                            <button 
                                onClick={() => setActiveView('chats')}
                                className="md:hidden p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors relative focus:outline-none"
                            >
                                <ChatIcon className="h-6 w-6" />
                                {unreadChatCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-red-500 text-[9px] text-white flex items-center justify-center font-bold"></span>
                                )}
                            </button>

                            {/* Notifications */}
                            <button 
                                onClick={() => setActiveView('notifications')}
                                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors relative focus:outline-none"
                            >
                                <BellIcon className="h-6 w-6" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-red-500"></span>
                                )}
                            </button>

                            {/* User Menu Trigger */}
                            <button 
                                onClick={() => setMenuOpen(true)}
                                className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors focus:outline-none ml-1 relative group"
                            >
                                {avatarUrl ? (
                                    <img className="h-9 w-9 rounded-full object-cover border border-gray-200 dark:border-gray-600 group-hover:opacity-80 transition-opacity" src={avatarUrl} alt="" />
                                ) : (
                                    <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                        <UserIcon className="h-5 w-5" inWrapper={false}/>
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-600 p-[1px]">
                                    <ChevronDownIcon className="h-2.5 w-2.5 text-gray-500 dark:text-gray-400" />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;
