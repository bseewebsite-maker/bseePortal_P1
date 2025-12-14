
import React from 'react';
import { 
    HomeIcon, 
    SettingsIcon, 
    FundsIcon, 
    CalendarIcon, 
    UsersIcon, 
    ChatIcon, 
    UserCircleIcon,
    ShieldCheckIcon,
    MonitorIcon,
    SparklesIcon,
    AttendanceIcon
} from './Icons';
import type { Profile } from '../types';

type View = 'homepage' | 'calendar' | 'settings' | 'profile' | 'funds' | 'attendance' | 'mayor' | 'monitor' | 'notifications' | 'friends' | 'chats' | 'ai-assistant';

interface SidebarProps {
    activeView: View;
    setActiveView: (view: View) => void;
    profile: Profile | null;
    hideMobileNav?: boolean;
    unreadChatCount: number;
    showMobileNav?: boolean; // New prop for scroll behavior
}

const DesktopNavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badge?: number;
    colorClass?: string;
}> = ({ icon, label, isActive, onClick, badge, colorClass = "text-gray-400 group-hover:text-white" }) => {
    const activeClasses = 'bg-gray-800 text-white shadow-sm border-l-4 border-blue-500';
    const inactiveClasses = 'text-gray-300 hover:bg-gray-800/50 hover:text-white border-l-4 border-transparent';

    return (
        <li>
            <button
                onClick={onClick}
                className={`group flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive ? activeClasses : inactiveClasses} relative`}
            >
                <span className={`transition-colors duration-200 ${isActive ? 'text-blue-400' : colorClass}`}>
                    {icon}
                </span>
                <span className="ml-3 tracking-wide">{label}</span>
                {badge && badge > 0 ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {badge > 9 ? '9+' : badge}
                    </span>
                ) : null}
            </button>
        </li>
    );
};

const MobileNavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badge?: number;
}> = ({ icon, label, isActive, onClick, badge }) => {
    return (
        <button
            onClick={onClick}
            className="relative flex-1 flex flex-col items-center justify-center h-full group focus:outline-none"
            style={{ WebkitTapHighlightColor: 'transparent' }}
        >
            {/* Active Glow/Spotlight Background */}
            <div className={`
                absolute inset-0 m-auto w-12 h-12 rounded-2xl transition-all duration-500 ease-out
                ${isActive 
                    ? 'bg-blue-50/80 dark:bg-blue-500/10 opacity-100 scale-100 rotate-0' 
                    : 'bg-transparent opacity-0 scale-50 rotate-45'}
            `} />

            {/* Icon Container */}
            <div className={`
                relative z-10 transition-all duration-300 ease-out transform
                ${isActive 
                    ? 'text-blue-600 dark:text-blue-400 -translate-y-1.5' 
                    : 'text-gray-400 dark:text-gray-500 translate-y-0 group-active:scale-90'}
            `}>
                <div className="h-6 w-6">
                     {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { 
                        className: `h-6 w-6 transition-all duration-300 ${isActive ? 'fill-current' : 'fill-none'}`,
                        strokeWidth: isActive ? 2 : 2
                    }) : icon}
                </div>

                {/* Notification Badge */}
                {badge && badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-[2px] border-white dark:border-gray-900 shadow-sm animate-bounce">
                        {badge > 9 ? '9+' : badge}
                    </span>
                ) : null}
            </div>

            {/* Label */}
            <span className={`
                text-[10px] font-bold tracking-tight absolute bottom-2.5 transition-all duration-300
                ${isActive 
                    ? 'text-blue-600 dark:text-blue-400 opacity-100 translate-y-0 scale-100' 
                    : 'text-gray-400 dark:text-gray-500 opacity-0 translate-y-2 scale-75'}
            `}>
                {label}
            </span>
            
            {/* Active Indicator Dot (Facebook style bottom line but as a dot) */}
            <span className={`
                absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 transition-all duration-300
                ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
            `}></span>
        </button>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, profile, hideMobileNav = false, unreadChatCount, showMobileNav = true }) => {
    const iconClass = "h-5 w-5";

    // Navigation Configurations
    const mainNavItems = [
        { view: 'homepage', label: 'Dashboard', icon: <HomeIcon className={iconClass} /> },
        { view: 'chats', label: 'Messages', icon: <ChatIcon className={iconClass} />, badge: unreadChatCount },
        { view: 'friends', label: 'Community', icon: <UsersIcon className={iconClass} /> },
        { view: 'calendar', label: 'Calendar', icon: <CalendarIcon className={iconClass} /> },
        { view: 'funds', label: 'My Funds', icon: <FundsIcon className={iconClass} /> },
        { view: 'attendance', label: 'Attendance', icon: <AttendanceIcon className={iconClass} /> },
        { view: 'ai-assistant', label: 'AI Assistant', icon: <SparklesIcon className={iconClass} />, colorClass: 'text-purple-400 group-hover:text-purple-300' },
    ];

    const systemNavItems = [
        { view: 'settings', label: 'Settings', icon: <SettingsIcon className={iconClass} /> },
    ];

    // Mobile specific (limited space)
    const mobileNavItems: { view: string; label: string; icon: React.ReactNode; badge?: number }[] = [
        { view: 'homepage', label: 'Home', icon: <HomeIcon /> },
        { view: 'chats', label: 'Chats', icon: <ChatIcon />, badge: unreadChatCount },
        { view: 'calendar', label: 'Events', icon: <CalendarIcon /> },
        { view: 'funds', label: 'Funds', icon: <FundsIcon /> },
        { view: 'attendance', label: 'Attend', icon: <AttendanceIcon /> },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-gray-900 text-gray-300 flex-col hidden md:flex h-full border-r border-gray-800 shadow-xl z-20">
                {/* Brand Header */}
                <div className="h-16 flex items-center px-6 border-b border-gray-800 bg-gray-900 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <span className="font-bold text-white text-lg">B</span>
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-wide">BseePortal</h1>
                    </div>
                </div>

                {/* Scrollable Nav Area */}
                <div className="flex-1 overflow-y-auto py-6 custom-scrollbar flex flex-col gap-6">
                    {/* Main Navigation */}
                    <nav className="space-y-1">
                        <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Menu
                        </div>
                        <ul className="space-y-1">
                            {mainNavItems.map(item => (
                                <DesktopNavItem
                                    key={item.view}
                                    icon={item.icon}
                                    label={item.label}
                                    isActive={activeView === item.view}
                                    onClick={() => setActiveView(item.view as View)}
                                    badge={item.badge}
                                    colorClass={item.colorClass}
                                />
                            ))}
                        </ul>
                    </nav>

                    {/* Admin Section (Conditional) */}
                    {(profile?.role === 'mayor' || profile?.role === 'monitor') && (
                        <nav className="space-y-1">
                            <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Administration
                            </div>
                            <ul className="space-y-1">
                                {profile.role === 'mayor' && (
                                    <DesktopNavItem
                                        icon={<ShieldCheckIcon className={iconClass} />}
                                        label="Mayor Portal"
                                        isActive={activeView === 'mayor'}
                                        onClick={() => setActiveView('mayor')}
                                        colorClass="text-amber-400 group-hover:text-amber-300"
                                    />
                                )}
                                {(profile.role === 'mayor' || profile.role === 'monitor') && (
                                    <DesktopNavItem
                                        icon={<MonitorIcon className={iconClass} />}
                                        label="Attendance Monitor"
                                        isActive={activeView === 'monitor'}
                                        onClick={() => setActiveView('monitor')}
                                        colorClass="text-cyan-400 group-hover:text-cyan-300"
                                    />
                                )}
                            </ul>
                        </nav>
                    )}

                    {/* Account Section */}
                    <nav className="space-y-1">
                        <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Account
                        </div>
                        <ul className="space-y-1">
                            {systemNavItems.map(item => (
                                <DesktopNavItem
                                    key={item.view}
                                    icon={item.icon}
                                    label={item.label}
                                    isActive={activeView === item.view}
                                    onClick={() => setActiveView(item.view as View)}
                                />
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* Footer Section: User Profile Card */}
                <div className="p-4 border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm flex-shrink-0">
                    <button 
                        onClick={() => setActiveView('profile')}
                        className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group border border-gray-800 hover:border-gray-700 ${
                            activeView === 'profile' 
                            ? 'bg-gray-800 ring-1 ring-gray-700' 
                            : 'hover:bg-gray-800'
                        }`}
                    >
                        <div className="flex-shrink-0 relative">
                            {profile?.avatar_url ? (
                                <img 
                                    src={profile.avatar_url} 
                                    alt="Profile" 
                                    className="h-10 w-10 rounded-full object-cover border-2 border-gray-700 group-hover:border-gray-500 transition-colors"
                                />
                            ) : (
                                <UserCircleIcon className="h-10 w-10 text-gray-400 group-hover:text-gray-300" />
                            )}
                            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                        </div>
                        <div className="ml-3 text-left overflow-hidden flex-1">
                            <p className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                                {profile?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate capitalize">
                                {profile?.role || 'Student'}
                            </p>
                        </div>
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Bar - Floating Dock Style */}
            {!hideMobileNav && (
                <div className={`md:hidden fixed bottom-6 left-4 right-4 z-[60] pointer-events-none transition-transform duration-300 ease-in-out ${showMobileNav ? 'translate-y-0' : 'translate-y-[200%]'}`}>
                    <nav className="pointer-events-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden transition-all duration-300">
                        <ul className="flex justify-between items-center h-[70px] px-2 relative">
                           {mobileNavItems.map(item => (
                                <MobileNavItem
                                    key={item.view}
                                    icon={item.icon}
                                    label={item.label}
                                    isActive={activeView === item.view}
                                    onClick={() => setActiveView(item.view as View)}
                                    badge={item.badge}
                                />
                            ))}
                        </ul>
                    </nav>
                </div>
            )}
        </>
    );
};

export default Sidebar;
