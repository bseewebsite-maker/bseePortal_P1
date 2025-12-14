
import React, { useState, useEffect } from 'react';
import { supabase, db, firestore } from '../services';
import { Spinner } from './Spinner';
import { 
    KeyIcon, 
    ShieldCheckIcon, 
    MonitorIcon, 
    UserCircleIcon, 
    CheckCircleIcon, 
    WarningIcon,
    ChevronLeftIcon,
    FundsIcon,
    InformationCircleIcon,
    ChevronRightIcon,
    GlobeIcon,
    UsersIcon,
    LockClosedIcon,
    MailIcon,
    BriefcaseIcon,
    ClipboardIcon,
    CheckIcon,
    EyeIcon,
    EyeOffIcon,
    SettingsIcon,
    LogoutIcon,
    TrashIcon,
    BanIcon,
    UserMinusIcon,
    IdentificationIcon,
    ClockIcon
} from './Icons';
import type { Profile } from '../types';

type View = 'homepage' | 'calendar' | 'settings' | 'profile' | 'funds' | 'attendance' | 'mayor' | 'monitor' | 'notifications' | 'friends' | 'chats' | 'ai-assistant';
type SettingsTab = 'overview' | 'security' | 'privacy' | 'about' | 'account_control';
type PasswordStep = 'request' | 'verify_token' | 'set_password';

interface SettingsPageProps {
    profile: Profile;
    setActiveView: (view: View) => void;
    onProfileUpdate?: (updates: Partial<Profile>) => void;
    onBack?: () => void;
}

// --- Helper Components ---

const SettingsSection: React.FC<{ title?: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-8">
        {title && <h3 className="px-1 mb-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
            {children}
        </div>
    </div>
);

const SettingsLink: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onClick: () => void;
    destructive?: boolean;
    external?: boolean;
    rightElement?: React.ReactNode;
    iconBgClass?: string;
}> = ({ icon, title, subtitle, onClick, destructive, external, rightElement, iconBgClass }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left group"
    >
        <div className={`flex-shrink-0 mr-4 p-2.5 rounded-full ${iconBgClass ? iconBgClass : (destructive ? 'bg-red-50 text-red-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300')}`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center">
                <h4 className={`text-base font-medium ${destructive ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{title}</h4>
                {external && <span className="ml-2 text-gray-400">↗</span>}
            </div>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className="ml-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors">
            {rightElement || <ChevronRightIcon className="h-5 w-5" />}
        </div>
    </button>
);

const PrivacyOption: React.FC<{
    title: string;
    value: string;
    description?: string;
    options: { value: string; label: string; icon: React.ReactNode }[];
    onChange: (val: string) => void;
    disabled?: boolean;
}> = ({ title, value, description, options, onChange, disabled }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <h4 className="text-base font-bold text-gray-900 dark:text-white">{title}</h4>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
        </div>
        
        <div className="p-2 space-y-1">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => !disabled && onChange(opt.value)}
                    disabled={disabled}
                    className={`w-full flex items-center p-3 rounded-lg transition-all border ${
                        value === opt.value 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 z-10 relative' 
                        : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                    <div className={`p-2 rounded-full mr-3 shrink-0 ${
                        value === opt.value 
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300' 
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                        {opt.icon}
                    </div>
                    <div className="flex-1 text-left">
                        <span className={`block text-sm font-semibold ${
                            value === opt.value ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                            {opt.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {opt.value === 'public' ? 'Visible to everyone' : opt.value === 'friends' ? 'Visible to friends only' : 'Visible only to you'}
                        </span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${
                        value === opt.value 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                        {value === opt.value && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                </button>
            ))}
        </div>
    </div>
);

const SettingsPage: React.FC<SettingsPageProps> = ({ profile, setActiveView, onProfileUpdate, onBack }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
    
    // Password & Security State
    const [step, setStep] = useState<PasswordStep>('request');
    const [verificationToken, setVerificationToken] = useState(''); 
    const [generatedToken, setGeneratedToken] = useState(''); 
    const [devTokenDisplay, setDevTokenDisplay] = useState<string | null>(null); 
    const [isCopied, setIsCopied] = useState(false); 

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [isUsingSpecialToken, setIsUsingSpecialToken] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState(0);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);

    // Privacy State
    const [privacySettings, setPrivacySettings] = useState({
        email: profile.privacy_email || 'only_me', 
        studentId: profile.privacy_student_id || 'only_me',
        lastSeen: profile.privacy_last_seen || 'only_me'
    });
    const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

    // External Links State
    const [treasurerUrl, setTreasurerUrl] = useState('https://treasurer-s-portal-nchx.vercel.app/');

    // Account Control State
    const [accountAction, setAccountAction] = useState<'none' | 'deactivate' | 'delete'>('none');
    const [confirmInput, setConfirmInput] = useState('');

    // Sync state: Only update if values actually differ to prevent redundant renders
    useEffect(() => {
        if (profile) {
            setPrivacySettings(prev => {
                const newData = {
                    email: profile.privacy_email || 'only_me',
                    studentId: profile.privacy_student_id || 'only_me',
                    lastSeen: profile.privacy_last_seen || 'only_me'
                };
                // Simple equality check
                if (prev.email === newData.email && prev.studentId === newData.studentId && prev.lastSeen === newData.lastSeen) {
                    return prev;
                }
                return newData;
            });
        }
    }, [profile]);

    // Fetch Config
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
        if (profile.role === 'mayor' || profile.role === 'treasurer') {
            fetchConfig();
        }
    }, [profile.role]);

    // Calculate restriction logic
    useEffect(() => {
        if (profile.last_password_change) {
            let lastDate: Date;
            try {
                if (typeof (profile.last_password_change as any).toDate === 'function') {
                    lastDate = (profile.last_password_change as any).toDate();
                } else if (profile.last_password_change instanceof Date) {
                    lastDate = profile.last_password_change;
                } else {
                    lastDate = new Date(profile.last_password_change as any);
                }

                if (!isNaN(lastDate.getTime())) {
                    const nextDate = new Date(lastDate);
                    nextDate.setDate(lastDate.getDate() + 30); // 30 Days Restriction
                    
                    const now = new Date();
                    if (now < nextDate) {
                        const diffTime = Math.abs(nextDate.getTime() - now.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        setDaysRemaining(diffDays);
                    } else {
                        setDaysRemaining(0);
                    }
                }
            } catch (e) {
                console.warn("Error parsing password change date", e);
            }
        }
    }, [profile.last_password_change]);

    const handleCopyToken = () => {
        if (devTokenDisplay) {
            navigator.clipboard.writeText(devTokenDisplay);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handleRequestToken = async () => {
        setMessage(null);
        setDevTokenDisplay(null);

        if (daysRemaining > 0 && !isUsingSpecialToken) {
            setMessage({ 
                type: 'error', 
                text: `Security Limit: You can only change your password once every 30 days. Please wait ${daysRemaining} more day(s).` 
            });
            return;
        }

        setIsProcessing(true);
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedToken(token);

        try {
            let emailToSend = profile.email;
            if (!emailToSend) {
                const { data: { user } } = await supabase.auth.getUser();
                emailToSend = user?.email;
            }

            if (!emailToSend) {
                throw new Error("No email address found on your profile.");
            }

            const { error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: [emailToSend],
                    subject: 'BseePortal Password Change Verification',
                    html: `
                        <div style="font-family: sans-serif; color: #333;">
                            <h2>Password Change Request</h2>
                            <p>Use the following code to verify your identity and change your password:</p>
                            <div style="background: #f4f4f4; padding: 15px; font-size: 24px; letter-spacing: 5px; font-weight: bold; text-align: center; border-radius: 8px; margin: 20px 0;">
                                ${token}
                            </div>
                            <p>If you did not request this, please ignore this email and secure your account.</p>
                        </div>
                    `,
                },
            });

            if (error) throw error;

            setMessage({ type: 'success', text: `Verification code sent to ${emailToSend}` });
            setStep('verify_token');

        } catch (err: any) {
            console.warn("Email service unavailable (Developer Mode active). Using local display.");
            setDevTokenDisplay(token);
            setStep('verify_token');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerifyToken = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsProcessing(true);

        try {
            if (isUsingSpecialToken) {
                const doc = await db.collection('profiles').doc(profile.id).get();
                const currentData = doc.data();
                
                if (!currentData?.special_password_token || currentData.special_password_token !== verificationToken.trim()) {
                    throw new Error("Invalid Administrative Token.");
                }
            } else {
                if (verificationToken.trim() !== generatedToken) {
                    throw new Error("Invalid verification code.");
                }
            }
            setStep('set_password');
            setMessage(null);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: "Passwords do not match." });
            return;
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: "Password must be at least 6 characters." });
            return;
        }

        setIsProcessing(true);

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            const dbUpdates: any = { last_password_change: firestore.FieldValue.serverTimestamp() };
            const localUpdates: any = { last_password_change: new Date() };
            
            if (isUsingSpecialToken) {
                dbUpdates.special_password_token = firestore.FieldValue.delete();
                localUpdates.special_password_token = null;
            }

            await db.collection('profiles').doc(profile.id).update(dbUpdates);
            if (onProfileUpdate) onProfileUpdate(localUpdates);

            setMessage({ type: 'success', text: "Password updated successfully. You are now restricted from changing it for 30 days." });
            
            setStep('request');
            setNewPassword('');
            setConfirmPassword('');
            setVerificationToken('');
            setGeneratedToken('');
            setDevTokenDisplay(null);
            setIsUsingSpecialToken(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || "Failed to update password." });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrivacySave = async (key: 'email' | 'studentId' | 'lastSeen', value: string) => {
        const previousValue = privacySettings[key];
        
        // Optimistic Update
        setPrivacySettings(prev => ({ ...prev, [key]: value }));
        setIsSavingPrivacy(true);
        
        try {
            let dbField = '';
            if (key === 'email') dbField = 'privacy_email';
            else if (key === 'studentId') dbField = 'privacy_student_id';
            else if (key === 'lastSeen') dbField = 'privacy_last_seen';

            if (dbField) {
                const updateData = { [dbField]: value };
                await db.collection('profiles').doc(profile.id).set(updateData, { merge: true });
                if(onProfileUpdate) onProfileUpdate(updateData);
            }
        } catch (err) {
            console.error("Privacy Save Error:", err);
            // Revert state
            setPrivacySettings(prev => ({ ...prev, [key]: previousValue }));
            setMessage({ type: 'error', text: 'Failed to save privacy settings. Please check your connection.' });
        } finally {
            setIsSavingPrivacy(false);
        }
    };

    const handleAccountControlSubmit = async () => {
        if (!accountAction || accountAction === 'none') return;
        
        setIsProcessing(true);
        try {
            if (accountAction === 'deactivate') {
                // Deactivation Logic: Set status flag and sign out
                await db.collection('profiles').doc(profile.id).update({
                    status: 'deactivated',
                    is_active: false,
                    is_online: false
                });
                await supabase.auth.signOut();
                // Redirect will happen automatically due to auth state change in App.tsx
            } else if (accountAction === 'delete') {
                if (confirmInput !== 'DELETE') {
                    throw new Error("Please type DELETE to confirm.");
                }
                
                // Deletion Logic: Delete profile and sign out
                await db.collection('profiles').doc(profile.id).delete();
                await supabase.auth.signOut();
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || "Action failed." });
            setIsProcessing(false);
        }
    };

    const safeName = typeof profile.full_name === 'string' ? profile.full_name : 'User';
    const safeId = typeof profile.student_id === 'string' ? profile.student_id : '';
    const safeRole = typeof profile.role === 'string' ? profile.role : 'member';

    const handleBack = () => {
        if (activeTab === 'account_control' && accountAction !== 'none') {
            setAccountAction('none'); // Go back to selection
            setConfirmInput('');
            setMessage(null);
        } else if (activeTab !== 'overview') {
            setActiveTab('overview');
            setAccountAction('none');
            setMessage(null);
            setNewPassword('');
            setConfirmPassword('');
            setVerificationToken('');
            setStep('request');
            setDevTokenDisplay(null);
            setIsUsingSpecialToken(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        } else {
            onBack && onBack();
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center shadow-sm flex-shrink-0 sticky top-0 z-20">
                <button 
                    onClick={handleBack}
                    className="p-2 mr-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                    <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                    {activeTab === 'overview' ? 'Settings & Privacy' : activeTab === 'account_control' ? 'Account Ownership' : activeTab.replace('_', ' ')}
                </h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-2xl mx-auto pb-12">
                    
                    {message && activeTab !== 'overview' && (
                        <div className={`mb-6 p-4 rounded-xl text-sm flex items-start shadow-sm animate-fade-in ${
                            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
                            message.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                            'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                            {message.type === 'success' ? <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 shrink-0" /> : <WarningIcon />}
                            <div className="ml-2 font-medium">{message.text}</div>
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Account Center Banner */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Account Center</h3>
                                <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="relative mr-4">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt={safeName} className="h-16 w-16 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-sm" />
                                        ) : (
                                            <UserCircleIcon className="h-16 w-16 text-gray-300" />
                                        )}
                                        <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 border-2 border-white dark:border-gray-700 rounded-full"></div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{safeName}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{safeId} • {safeRole}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-4">
                                    <button onClick={() => setActiveView('profile')} className="flex items-center justify-center py-2 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                                        Edit Profile
                                    </button>
                                    <button onClick={() => setActiveView('calendar')} className="flex items-center justify-center py-2 px-4 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors">
                                        Check Schedule
                                    </button>
                                </div>
                            </div>

                            {/* Settings Groups */}
                            <SettingsSection title="Preferences">
                                <SettingsLink 
                                    icon={<KeyIcon className="h-5 w-5" />} 
                                    title="Security & Password" 
                                    subtitle="Protect your account"
                                    onClick={() => setActiveTab('security')}
                                    iconBgClass="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                />
                                <SettingsLink 
                                    icon={<ShieldCheckIcon className="h-5 w-5" />} 
                                    title="Privacy Settings" 
                                    subtitle="Control what others see"
                                    onClick={() => setActiveTab('privacy')}
                                    iconBgClass="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                />
                                <SettingsLink 
                                    icon={<UserMinusIcon className="h-5 w-5" />} 
                                    title="Account Ownership and Control" 
                                    subtitle="Deactivation or deletion"
                                    onClick={() => setActiveTab('account_control')}
                                    iconBgClass="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                />
                            </SettingsSection>

                            {/* Admin Tools */}
                            {(profile.role === 'mayor' || profile.role === 'monitor' || profile.role === 'treasurer') && (
                                <SettingsSection title="Administrative Tools">
                                    {profile.role === 'mayor' && (
                                        <SettingsLink 
                                            icon={<ShieldCheckIcon className="h-5 w-5" />} 
                                            title="Mayor Dashboard" 
                                            subtitle="Manage events and users"
                                            onClick={() => setActiveView('mayor')}
                                            iconBgClass="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                                        />
                                    )}
                                    {(profile.role === 'mayor' || profile.role === 'monitor') && (
                                        <SettingsLink 
                                            icon={<MonitorIcon className="h-5 w-5" />} 
                                            title="Attendance Monitor" 
                                            subtitle="Track student presence"
                                            onClick={() => setActiveView('monitor')}
                                            iconBgClass="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                                        />
                                    )}
                                    {(profile.role === 'mayor' || profile.role === 'treasurer') && (
                                        <SettingsLink 
                                            icon={<FundsIcon className="h-5 w-5" />} 
                                            title="Treasurer Portal" 
                                            subtitle="Manage collections"
                                            onClick={() => window.open(treasurerUrl, '_blank')}
                                            external
                                            iconBgClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                        />
                                    )}
                                </SettingsSection>
                            )}

                            <SettingsSection title="More">
                                <SettingsLink 
                                    icon={<InformationCircleIcon className="h-5 w-5" />} 
                                    title="About BseePortal" 
                                    onClick={() => setActiveTab('about')}
                                />
                            </SettingsSection>
                        </div>
                    )}

                    {activeTab === 'account_control' && (
                        <div className="space-y-6">
                            {accountAction === 'none' && (
                                <>
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <button 
                                            onClick={() => setAccountAction('deactivate')}
                                            className="w-full flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group text-left"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center mb-1">
                                                    <BanIcon className="h-5 w-5 text-gray-500 mr-2" />
                                                    <h4 className="font-bold text-gray-900 dark:text-white">Deactivate Account</h4>
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 pl-7">
                                                    Deactivating your account is temporary. Your profile will be hidden until you reactivate it by logging back in.
                                                </p>
                                            </div>
                                            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                                        </button>
                                    </div>

                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <button 
                                            onClick={() => setAccountAction('delete')}
                                            className="w-full flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group text-left"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center mb-1">
                                                    <TrashIcon className="h-5 w-5 text-gray-500 mr-2" />
                                                    <h4 className="font-bold text-gray-900 dark:text-white">Delete Account</h4>
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 pl-7">
                                                    Deleting your account is permanent. Your data will be removed and you will not be able to retrieve your information.
                                                </p>
                                            </div>
                                            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                                        </button>
                                    </div>
                                </>
                            )}

                            {accountAction === 'deactivate' && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-6">
                                    <div className="text-center">
                                        <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                                            <BanIcon className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Deactivate Account?</h3>
                                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                                            You are about to temporarily deactivate your account. You can reactivate it anytime by logging in.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setAccountAction('none')} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                                        <button 
                                            onClick={handleAccountControlSubmit} 
                                            disabled={isProcessing}
                                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center"
                                        >
                                            {isProcessing ? <Spinner className="h-5 w-5" /> : 'Deactivate'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {accountAction === 'delete' && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-6">
                                    <div className="text-center">
                                        <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                            <TrashIcon className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Account?</h3>
                                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                                            This action is <strong>permanent</strong>. All your data, friends, and messages will be lost forever.
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Type "DELETE" to confirm</label>
                                        <input 
                                            type="text" 
                                            value={confirmInput}
                                            onChange={(e) => setConfirmInput(e.target.value)}
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                            placeholder="DELETE"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => { setAccountAction('none'); setConfirmInput(''); }} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                                        <button 
                                            onClick={handleAccountControlSubmit} 
                                            disabled={isProcessing || confirmInput !== 'DELETE'}
                                            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                                        >
                                            {isProcessing ? <Spinner className="h-5 w-5" /> : 'Delete Permanently'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                                <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <KeyIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Password & Security</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Update your password securely.</p>
                            </div>

                            {/* Wizard Steps */}
                            {step === 'request' && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                                    <div className="border-l-4 border-blue-500 pl-4 py-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white">Change Password</h4>
                                        <p className="text-sm text-gray-500">We'll send a code to your email to verify it's you.</p>
                                    </div>

                                    {daysRemaining > 0 && !isUsingSpecialToken && (
                                        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm flex gap-3 items-start">
                                            <WarningIcon />
                                            <div>
                                                <span className="font-bold">Change Limit Reached.</span> You can update your password again in {daysRemaining} days.
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3 pt-2">
                                        <button 
                                            onClick={handleRequestToken}
                                            disabled={isProcessing || daysRemaining > 0}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center disabled:opacity-50 disabled:bg-gray-400"
                                        >
                                            {isProcessing ? <Spinner className="h-5 w-5 text-white" /> : "Send Verification Code"}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setIsUsingSpecialToken(true);
                                                setStep('verify_token');
                                                setMessage(null);
                                                setDevTokenDisplay(null);
                                            }}
                                            className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm"
                                        >
                                            I have an Admin Token
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 'verify_token' && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                                    <div className="text-center">
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">Enter Code</h4>
                                        <p className="text-sm text-gray-500">
                                            Please enter the code {isUsingSpecialToken ? "provided by your admin" : "sent to your email"}.
                                        </p>
                                    </div>

                                    {devTokenDisplay && !isUsingSpecialToken && (
                                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-center">
                                            <p className="text-xs font-bold text-yellow-800 uppercase mb-2">Dev Mode Code</p>
                                            <code className="text-2xl font-mono font-bold tracking-widest text-gray-800 bg-white px-4 py-2 rounded-lg border border-yellow-300 inline-block" onClick={handleCopyToken}>
                                                {devTokenDisplay}
                                            </code>
                                            <p className="text-[10px] text-yellow-700 mt-2">{isCopied ? "Copied!" : "Click to copy"}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleVerifyToken} className="space-y-4">
                                        <input 
                                            type="text" 
                                            value={verificationToken}
                                            onChange={(e) => setVerificationToken(e.target.value)}
                                            className="w-full text-center text-2xl font-bold tracking-[0.5em] py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="••••••"
                                            maxLength={36}
                                            required
                                        />
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => setStep('request')} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Cancel</button>
                                            <button type="submit" disabled={isProcessing || !verificationToken} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                                                {isProcessing ? <Spinner className="h-5 w-5 mx-auto" /> : "Verify"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {step === 'set_password' && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                                    <div className="text-center">
                                        <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <CheckIcon className="h-6 w-6" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">Create New Password</h4>
                                        <p className="text-sm text-gray-500">Choose a strong password you haven't used before.</p>
                                    </div>

                                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                                    placeholder="New Password"
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600">
                                                    {showNewPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Confirm Password"
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600">
                                                    {showConfirmPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <button type="submit" disabled={isProcessing} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md transition-all flex items-center justify-center">
                                            {isProcessing ? <Spinner className="h-5 w-5 mr-2" /> : <KeyIcon className="h-5 w-5 mr-2" />}
                                            Update Password
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="space-y-6">
                            <div className="flex items-center px-2 mb-4">
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl mr-4 text-green-600 dark:text-green-400">
                                    <ShieldCheckIcon className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Privacy Checkup</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage who can see your profile information.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <PrivacyOption 
                                    title="Email Address"
                                    description="Who can see your contact email?"
                                    value={privacySettings.email}
                                    disabled={isSavingPrivacy}
                                    onChange={(val) => handlePrivacySave('email', val)}
                                    options={[
                                        { value: 'public', label: 'Public', icon: <GlobeIcon className="h-5 w-5" /> },
                                        { value: 'friends', label: 'Friends', icon: <UsersIcon className="h-5 w-5" /> },
                                        { value: 'only_me', label: 'Only Me', icon: <LockClosedIcon className="h-5 w-5" /> },
                                    ]}
                                />
                                
                                <PrivacyOption 
                                    title="Student ID"
                                    description="Who can see your ID number?"
                                    value={privacySettings.studentId}
                                    disabled={isSavingPrivacy}
                                    onChange={(val) => handlePrivacySave('studentId', val)}
                                    options={[
                                        { value: 'public', label: 'Public', icon: <GlobeIcon className="h-5 w-5" /> },
                                        { value: 'friends', label: 'Friends', icon: <UsersIcon className="h-5 w-5" /> },
                                        { value: 'only_me', label: 'Only Me', icon: <LockClosedIcon className="h-5 w-5" /> },
                                    ]}
                                />

                                <PrivacyOption 
                                    title="Active Status"
                                    description="Who can see when you're online?"
                                    value={privacySettings.lastSeen}
                                    disabled={isSavingPrivacy}
                                    onChange={(val) => handlePrivacySave('lastSeen', val)}
                                    options={[
                                        { value: 'public', label: 'Public', icon: <GlobeIcon className="h-5 w-5" /> },
                                        { value: 'friends', label: 'Friends', icon: <UsersIcon className="h-5 w-5" /> },
                                        { value: 'only_me', label: 'Only Me', icon: <LockClosedIcon className="h-5 w-5" /> },
                                    ]}
                                />
                            </div>
                            
                            {isSavingPrivacy && (
                                <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center text-sm font-medium animate-fade-in-up z-50">
                                    <Spinner className="h-4 w-4 mr-2 text-white" /> Saving changes...
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center space-y-6">
                            <div className="inline-block p-4 rounded-3xl bg-gradient-to-tr from-blue-600 to-purple-600 shadow-lg mb-2">
                                <span className="text-3xl font-black text-white tracking-widest">B</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">BseePortal</h2>
                                <p className="text-gray-500 font-medium">Version 1.2.0 (Stable)</p>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6 text-left space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border border-gray-100 dark:border-gray-700">
                                <p>
                                    BseePortal is a secure, student-focused platform designed to simplify academic administration.
                                </p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Attendance tracking with real-time stats</li>
                                    <li>Transparent fund collection management</li>
                                    <li>Secure, private messaging</li>
                                    <li>AI-powered student assistant</li>
                                </ul>
                            </div>

                            <div className="text-xs text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-700">
                                © {new Date().getFullYear()} BseePortal Team • Powered by Supabase & Gemini AI
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
