
import React, { useState, useEffect, useMemo } from 'react';
import { db, firestore } from '../services';
import { Spinner } from './Spinner';
import type { Event, Profile, Post, AttendanceRecord } from '../types';
import { 
    CalendarIcon, 
    TrashIcon, 
    UsersIcon, 
    ShieldCheckIcon, 
    ChartPieIcon, 
    PlusIcon, 
    XIcon, 
    MegaphoneIcon, 
    FundsIcon, 
    SearchIcon, 
    KeyIcon, 
    CheckIcon,
    ClipboardIcon,
    LockClosedIcon,
    SettingsIcon,
    ExternalLinkIcon,
    FolderIcon,
    DocumentTextIcon,
    AttendanceIcon,
    BanIcon,
    UserCircleIcon
} from './Icons';
import ConfirmationModal from './ConfirmationModal';
import UserManagement from './UserManagement';
import Feed from './Feed';

// --- Types ---
interface EventWithId extends Event {
    docId: string;
}

interface MayorPageProps {
    onViewProfile?: (profile: Profile) => void;
}

// --- Helper Functions ---
function chunkArray<T>(array: T[], size: number): T[][] {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

// --- Helper Components ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
        <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
            <div className={`${color.replace('bg-', 'text-').replace('-500', '-600')}`}>
                {icon}
            </div>
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        </div>
    </div>
);

// --- Student Records Components ---

const StudentFolderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    student: Profile | null;
}> = ({ isOpen, onClose, student }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'attendance'>('overview');
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    useEffect(() => {
        if (isOpen && student && activeTab === 'attendance') {
            setIsLoadingData(true);
            db.collection('attendance')
                .where('userId', '==', student.id)
                .get()
                .then(snapshot => {
                    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
                    records.sort((a, b) => b.date.localeCompare(a.date));
                    setAttendanceRecords(records);
                })
                .catch(console.error)
                .finally(() => setIsLoadingData(false));
        }
    }, [isOpen, student, activeTab]);

    if (!isOpen || !student) return null;

    const getAttendanceRate = () => {
        if (attendanceRecords.length === 0) return 0;
        const presentCount = attendanceRecords.filter(r => ['Present', 'Late', 'Excused'].includes(r.status)).length;
        return Math.round((presentCount / attendanceRecords.length) * 100);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="bg-amber-100 border-b border-amber-200 px-6 py-4 flex justify-between items-center relative">
                    <div className="flex items-center gap-3">
                        <FolderIcon className="h-8 w-8 text-amber-600" />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{student.full_name}</h2>
                            <p className="text-xs text-amber-800 font-mono tracking-wide">{student.student_id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-amber-200 rounded-full text-amber-800 transition-colors">
                        <XIcon className="h-6 w-6" />
                    </button>
                    <div className="absolute top-0 left-8 w-32 h-2 bg-amber-200 rounded-b-lg opacity-50"></div>
                </div>

                <div className="flex border-b border-gray-200 bg-gray-50">
                    <button onClick={() => setActiveTab('overview')} className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'overview' ? 'border-amber-500 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Overview</button>
                    <button onClick={() => setActiveTab('posts')} className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'posts' ? 'border-amber-500 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Activity & Posts</button>
                    <button onClick={() => setActiveTab('attendance')} className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'attendance' ? 'border-amber-500 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Attendance History</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-white relative">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
                                <div className="h-24 w-24 rounded-full bg-gray-200 overflow-hidden mb-4 border-4 border-white shadow-md">
                                    <img src={student.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(student.full_name)}`} className="h-full w-full object-cover" alt="" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800">{student.full_name}</h3>
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase mt-2">{student.role}</span>
                                <div className="mt-6 w-full space-y-3 text-left">
                                    <div className="flex justify-between border-b border-gray-200 py-2"><span className="text-gray-500 text-sm">Student ID</span><span className="font-mono text-gray-800 font-medium">{student.student_id}</span></div>
                                    <div className="flex justify-between border-b border-gray-200 py-2"><span className="text-gray-500 text-sm">Email</span><span className="text-gray-800 font-medium text-sm truncate max-w-[200px]">{student.email || 'N/A'}</span></div>
                                    <div className="flex justify-between border-b border-gray-200 py-2"><span className="text-gray-500 text-sm">Joined</span><span className="text-gray-800 font-medium text-sm">{student.updated_at ? new Date(student.updated_at as any).toLocaleDateString() : 'Unknown'}</span></div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100"><h4 className="font-bold text-blue-800 mb-2">Bio</h4><p className="text-blue-900 text-sm italic">"{student.bio || 'No bio provided.'}"</p></div>
                                <div className="bg-green-50 p-5 rounded-xl border border-green-100"><h4 className="font-bold text-green-800 mb-2">Status</h4><div className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${student.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></span><span className="text-green-900 text-sm font-medium">{student.is_online ? 'Online Now' : 'Offline'}</span></div><p className="text-xs text-green-700 mt-1">Last seen: {student.last_seen ? new Date(student.last_seen as any).toLocaleString() : 'Never'}</p></div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'posts' && <div className="max-w-2xl mx-auto"><Feed user={{ id: 'viewer' }} targetUserId={student.id} /></div>}
                    {activeTab === 'attendance' && (
                        <div>
                            {isLoadingData ? <div className="flex justify-center py-10"><Spinner /></div> : (
                                <>
                                    <div className="mb-6 flex gap-4">
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex-1 text-center"><span className="text-3xl font-bold text-gray-800">{attendanceRecords.length}</span><p className="text-xs text-gray-500 uppercase tracking-wide font-bold mt-1">Total Days</p></div>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex-1 text-center"><span className="text-3xl font-bold text-gray-800">{getAttendanceRate()}%</span><p className="text-xs text-gray-500 uppercase tracking-wide font-bold mt-1">Presence Rate</p></div>
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-gray-200"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Time Recorded</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{attendanceRecords.length > 0 ? attendanceRecords.map(record => (<tr key={record.id} className="hover:bg-gray-50"><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td><td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === 'Present' ? 'bg-green-100 text-green-800' : record.status === 'Absent' ? 'bg-red-100 text-red-800' : record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{record.status}</span></td><td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">{record.timestamp ? new Date(record.timestamp as any).toLocaleTimeString() : 'N/A'}</td></tr>)) : <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-500">No attendance records found.</td></tr>}</tbody></table></div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StudentRecordsTab: React.FC = () => {
    const [students, setStudents] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const snapshot = await db.collection('profiles').orderBy('full_name').get();
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));
                setStudents(data);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchStudents();
    }, []);

    const filteredStudents = useMemo(() => {
        const lower = searchQuery.toLowerCase();
        return students.filter(s => (s.full_name || '').toLowerCase().includes(lower) || (s.student_id || '').toLowerCase().includes(lower));
    }, [students, searchQuery]);

    return (
        <div className="mt-6 animate-fade-in min-h-[60vh]">
            <StudentFolderModal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} student={selectedStudent} />
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Student File Repository</h3>
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Search student files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-64" />
                </div>
            </div>
            {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredStudents.length > 0 ? filteredStudents.map(student => (
                        <div key={student.id} onClick={() => setSelectedStudent(student)} className="group relative bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:bg-amber-100 transition-all duration-300 flex flex-col items-center text-center transform hover:-translate-y-1">
                            <div className="absolute top-0 left-0 w-1/3 h-2 bg-amber-200 rounded-tl-xl rounded-tr-md group-hover:bg-amber-300 transition-colors"></div>
                            <div className="mt-2 mb-3 relative">
                                <FolderIcon className="h-16 w-16 text-amber-400 group-hover:text-amber-500 transition-colors drop-shadow-sm" />
                                <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-white border border-gray-200 overflow-hidden shadow-sm"><img src={student.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(student.full_name)}`} className="h-full w-full object-cover" alt="" /></div>
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm leading-tight line-clamp-1 group-hover:text-amber-900">{student.full_name}</h4>
                            <p className="text-xs text-gray-500 font-mono mt-1 group-hover:text-gray-600">{student.student_id}</p>
                        </div>
                    )) : <div className="col-span-full py-12 text-center text-gray-500">No student records found.</div>}
                </div>
            )}
        </div>
    );
};

// --- Functional Tabs ---

const BroadcastTab: React.FC = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetRole, setTargetRole] = useState('all');
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<{type: 'success'|'error', text: string} | null>(null);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        setStatus(null);

        try {
            let query = db.collection('profiles');
            if (targetRole !== 'all') {
                query = query.where('role', '==', targetRole) as any;
            }

            const snapshot = await query.get();
            if (snapshot.empty) throw new Error("No users found for this target group.");

            const batch = db.batch();
            const timestamp = firestore.FieldValue.serverTimestamp();

            snapshot.docs.forEach(doc => {
                const notifRef = db.collection('notifications').doc();
                batch.set(notifRef, {
                    user_id: doc.id,
                    title: title,
                    message: message,
                    is_read: false,
                    notification_type: 'broadcast',
                    created_at: timestamp
                });
            });

            await batch.commit();
            setStatus({ type: 'success', text: `Successfully sent to ${snapshot.size} users.` });
            setTitle('');
            setMessage('');
        } catch (err: any) {
            setStatus({ type: 'error', text: err.message });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <MegaphoneIcon className="h-5 w-5 mr-2 text-blue-600" /> System Broadcast
                </h3>
                {status && (
                    <div className={`p-4 mb-4 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {status.text}
                    </div>
                )}
                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Group</label>
                        <select 
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Users</option>
                            <option value="student">Students</option>
                            <option value="monitor">Monitors</option>
                            <option value="treasurer">Treasurers</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input 
                            type="text" 
                            required 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Announcement Title"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea 
                            required 
                            value={message} 
                            onChange={(e) => setMessage(e.target.value)} 
                            rows={4}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Type your message here..."
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSending}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center"
                    >
                        {isSending ? <Spinner className="h-5 w-5" /> : 'Send Broadcast'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const SecurityTab: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<Profile | null>(null);
    const [generatedToken, setGeneratedToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [deactivatedUsers, setDeactivatedUsers] = useState<Profile[]>([]);

    useEffect(() => {
        // Load deactivated users
        const fetchDeactivated = async () => {
            const snap = await db.collection('profiles').where('status', '==', 'deactivated').get();
            setDeactivatedUsers(snap.docs.map(doc => ({id: doc.id, ...doc.data()} as Profile)));
        };
        fetchDeactivated();
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSearchResult(null);
        setGeneratedToken(null);
        try {
            const snapshot = await db.collection('profiles').where('student_id', '==', searchQuery.trim()).limit(1).get();
            if (!snapshot.empty) {
                setSearchResult({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Profile);
            } else {
                alert("Student ID not found");
            }
        } catch(e) { console.error(e); }
        setLoading(false);
    };

    const handleGenerateToken = async () => {
        if (!searchResult) return;
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        await db.collection('profiles').doc(searchResult.id).update({ special_password_token: token });
        setGeneratedToken(token);
    };

    const handleReactivate = async (userId: string) => {
        await db.collection('profiles').doc(userId).update({ status: 'active', is_active: true });
        setDeactivatedUsers(prev => prev.filter(u => u.id !== userId));
    };

    return (
        <div className="space-y-6 mt-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account Recovery */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <KeyIcon className="h-5 w-5 mr-2 text-orange-500" /> Account Recovery
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">Generate a bypass token for students who cannot access their email to reset passwords.</p>
                    <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            placeholder="Enter Student ID" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            className="flex-1 p-2 border rounded-lg text-sm"
                        />
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold">Search</button>
                    </form>
                    {searchResult && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-3 mb-3">
                                {searchResult.avatar_url ? <img src={searchResult.avatar_url} className="h-10 w-10 rounded-full" /> : <UserCircleIcon className="h-10 w-10 text-gray-400" />}
                                <div>
                                    <p className="font-bold text-gray-900">{searchResult.full_name}</p>
                                    <p className="text-xs text-gray-500">{searchResult.student_id}</p>
                                </div>
                            </div>
                            {!generatedToken ? (
                                <button onClick={handleGenerateToken} className="w-full py-2 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600">Generate Bypass Token</button>
                            ) : (
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">One-time Token:</p>
                                    <code className="block text-2xl font-mono font-bold bg-white border border-orange-200 p-2 rounded-lg text-orange-600 tracking-widest">{generatedToken}</code>
                                    <p className="text-xs text-gray-400 mt-2">Provide this to the student. They can enter it in Settings {">"} Security.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Deactivated Users */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <BanIcon className="h-5 w-5 mr-2 text-red-500" /> Deactivated Accounts
                    </h3>
                    <div className="overflow-y-auto max-h-[300px]">
                        {deactivatedUsers.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">No deactivated accounts.</p>
                        ) : (
                            <ul className="space-y-2">
                                {deactivatedUsers.map(user => (
                                    <li key={user.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                        <div>
                                            <p className="font-bold text-sm text-gray-900">{user.full_name}</p>
                                            <p className="text-xs text-red-600">{user.student_id}</p>
                                        </div>
                                        <button onClick={() => handleReactivate(user.id)} className="px-3 py-1 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-full hover:bg-red-50">Reactivate</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SystemSettingsTab: React.FC = () => {
    const [treasurerUrl, setTreasurerUrl] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        db.collection('system_settings').doc('global_config').get().then(doc => {
            if (doc.exists) setTreasurerUrl(doc.data()?.treasurer_portal_url || '');
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        await db.collection('system_settings').doc('global_config').set({ treasurer_portal_url: treasurerUrl }, { merge: true });
        setSaving(false);
        alert("Settings saved.");
    };

    return (
        <div className="max-w-2xl mx-auto mt-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                    <SettingsIcon className="h-5 w-5 mr-2 text-gray-600" /> System Configuration
                </h3>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Treasurer Portal URL</label>
                        <div className="flex gap-2">
                            <input 
                                type="url" 
                                value={treasurerUrl} 
                                onChange={(e) => setTreasurerUrl(e.target.value)} 
                                className="flex-1 p-2 border border-gray-300 rounded-lg text-sm font-mono"
                                placeholder="https://..."
                            />
                            <a href={treasurerUrl} target="_blank" className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200"><ExternalLinkIcon className="h-5 w-5"/></a>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Updates the link in the sidebar and settings menu.</p>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100">
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center"
                        >
                            {saving && <Spinner className="h-4 w-4 mr-2" />} Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Page ---

const OverviewTab: React.FC = () => {
    const [stats, setStats] = useState({ users: 0, events: 0, collections: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const usersSnap = await db.collection('profiles').get();
                const eventsSnap = await db.collection('events').get();
                const collectionsSnap = await db.collection('collections').get();
                
                setStats({
                    users: usersSnap.size,
                    events: eventsSnap.size,
                    collections: collectionsSnap.size
                });
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-10 flex justify-center"><Spinner /></div>;

    return (
        <div className="space-y-6 mt-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Registered Users" value={stats.users} icon={<UsersIcon className="h-8 w-8" />} color="bg-blue-500" />
                <StatCard title="Total Events Created" value={stats.events} icon={<CalendarIcon className="h-8 w-8" />} color="bg-purple-500" />
                <StatCard title="Active Fund Collections" value={stats.collections} icon={<FundsIcon className="h-8 w-8" />} color="bg-green-500" />
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl shadow-sm">
                <h3 className="text-lg font-bold text-blue-900 mb-2">System Status</h3>
                <p className="text-blue-800 text-sm">The portal is currently active. All services including notifications, database connections, and authentication are operational.</p>
            </div>
        </div>
    );
};

const EventManagement: React.FC = () => {
    const [events, setEvents] = useState<EventWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);
    
    // Create State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventTime, setNewEventTime] = useState('');
    const [newEventType, setNewEventType] = useState('general');
    const [isCreating, setIsCreating] = useState(false);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const eventsSnapshot = await db.collection('events').orderBy('eventDate', 'desc').get();
            setEvents(eventsSnapshot.docs.map((doc: any) => ({ docId: doc.id, id: doc.id, ...doc.data() })) as EventWithId[]);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { fetchEvents(); }, []);

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await db.collection('events').add({
                title: newEventTitle,
                eventDate: newEventDate,
                eventTime: newEventTime || null,
                eventType: newEventType,
                isPublic: true, 
                userId: null, 
                createdAt: firestore.FieldValue.serverTimestamp()
            });
            setIsCreateModalOpen(false);
            setNewEventTitle(''); setNewEventDate(''); setNewEventTime('');
            fetchEvents(); 
        } catch (err) { console.error(err); } finally { setIsCreating(false); }
    };

    const confirmDeleteEvent = async () => {
        if (!eventToDelete) return;
        try {
            await db.collection('events').doc(eventToDelete).delete();
            setEvents(prev => prev.filter(e => e.docId !== eventToDelete));
        } catch (err) { console.error(err); } finally { setIsConfirmModalOpen(false); setEventToDelete(null); }
    };

    return (
        <div className="mt-6">
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={confirmDeleteEvent} title="Delete Event" message="Permanently delete this event?" confirmButtonText="Delete" />
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-gray-900">Create Official Event</h3><button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button></div>
                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" required value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="Event Name" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" required value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Time</label><input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={newEventType} onChange={e => setNewEventType(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"><option value="general">General</option><option value="academic">Academic</option><option value="deadline">Deadline</option></select></div>
                            <div className="pt-2 flex justify-end gap-2"><button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button><button type="submit" disabled={isCreating} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center">{isCreating && <Spinner className="mr-2" />} Create</button></div>
                        </form>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-6"><p className="text-gray-600 text-sm">Manage official events visible to all students.</p><button onClick={() => setIsCreateModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 shadow-sm transition-colors"><PlusIcon className="h-4 w-4 mr-2" /> New Event</button></div>
            {loading ? <div className="flex justify-center py-10"><Spinner /></div> : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visibility</th><th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{events.length > 0 ? events.map((event) => (<tr key={event.docId} className="hover:bg-gray-50"><td className="px-6 py-4"><div className="text-sm font-bold text-gray-900">{event.title}</div><div className="text-xs text-gray-500 capitalize">{event.eventType}</div></td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(event.eventDate).toLocaleDateString()}</td><td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${event.isPublic ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{event.isPublic ? 'Public' : 'Private'}</span></td><td className="px-6 py-4 whitespace-nowrap text-center"><button onClick={() => { setEventToDelete(event.docId); setIsConfirmModalOpen(true); }} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"><TrashIcon className="h-5 w-5" /></button></td></tr>)) : <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">No events found.</td></tr>}</tbody></table>
                </div>
            )}
        </div>
    );
};

// --- Tab Button ---
interface TabButtonProps { isActive: boolean; onClick: () => void; icon: React.ReactNode; label: string; }
const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex items-center px-4 py-3 text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${isActive ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><span className={`${isActive ? 'text-blue-600' : 'text-gray-400'} mr-2`}>{icon}</span>{label}</button>
);

const MayorPage: React.FC<MayorPageProps> = ({ onViewProfile }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'users' | 'records' | 'broadcast' | 'security' | 'system'>('overview');
    
    return (
        <div className="max-w-7xl mx-auto pb-10">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 min-h-[80vh]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div className="flex items-center">
                        <div className="p-3 bg-blue-600 rounded-xl mr-4 shadow-lg"><ShieldCheckIcon className="h-8 w-8 text-white" /></div>
                        <div><h2 className="text-3xl font-bold text-gray-900">Mayor's Portal</h2><p className="text-gray-500 text-sm mt-1">Administration & Management Dashboard</p></div>
                    </div>
                </div>
                
                <div className="border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
                    <nav className="flex space-x-2 min-w-max" aria-label="Tabs">
                        <TabButton isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<ChartPieIcon className="h-5 w-5" />} label="Overview" />
                        <TabButton isActive={activeTab === 'records'} onClick={() => setActiveTab('records')} icon={<DocumentTextIcon className="h-5 w-5" />} label="Student Records" />
                        <TabButton isActive={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={<CalendarIcon className="h-5 w-5" />} label="Event Mgmt" />
                        <TabButton isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<UsersIcon className="h-5 w-5" />} label="User Mgmt" />
                        <TabButton isActive={activeTab === 'broadcast'} onClick={() => setActiveTab('broadcast')} icon={<MegaphoneIcon className="h-5 w-5" />} label="Broadcast" />
                        <TabButton isActive={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<KeyIcon className="h-5 w-5" />} label="Security" />
                        <TabButton isActive={activeTab === 'system'} onClick={() => setActiveTab('system')} icon={<SettingsIcon className="h-5 w-5" />} label="Settings" />
                    </nav>
                </div>
                
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'records' && <StudentRecordsTab />}
                {activeTab === 'events' && <EventManagement />}
                {activeTab === 'users' && <UserManagement onViewProfile={onViewProfile} />}
                {activeTab === 'broadcast' && <BroadcastTab />}
                {activeTab === 'security' && <SecurityTab />}
                {activeTab === 'system' && <SystemSettingsTab />}
            </div>
        </div>
    );
};

export default MayorPage;
