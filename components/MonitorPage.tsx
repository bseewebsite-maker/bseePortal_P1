
import React, { useState, useEffect, useMemo } from 'react';
import { db, firestore } from '../services';
import type { Profile, AttendanceRecord } from '../types';
import type { User } from '@supabase/supabase-js';
import { Spinner } from './Spinner';
import { MonitorIcon, CalendarIcon, BanIcon, PencilIcon, ChevronDownIcon, XIcon, CheckIcon } from './Icons';

interface MonitorPageProps {
    user: User;
    onViewProfile?: (profile: Profile) => void;
}

const StatusButton = ({ status, currentStatus, onClick, colorClass }: any) => {
    const isActive = currentStatus === status;
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                isActive 
                ? `${colorClass} text-white border-transparent shadow-sm` 
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
        >
            {status}
        </button>
    );
};

const MonitorPage: React.FC<MonitorPageProps> = ({ user, onViewProfile }) => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState<{ [userId: string]: AttendanceRecord }>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [showBulkActionsDropdown, setShowBulkActionsDropdown] = useState(false);
    
    // Custom Status Modal State
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [customStatusInput, setCustomStatusInput] = useState('');

    // Fetch all profiles and attendance for the selected date
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Fetch Profiles
                const profilesSnapshot = await db.collection('profiles').orderBy('full_name').get();
                const profilesList = profilesSnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data()
                })) as Profile[];
                setProfiles(profilesList);

                // 2. Fetch Attendance for Selected Date
                const attendanceSnapshot = await db.collection('attendance')
                    .where('date', '==', selectedDate)
                    .get();
                
                const attendanceMap: { [userId: string]: AttendanceRecord } = {};
                attendanceSnapshot.forEach((doc: any) => {
                    const data = doc.data() as AttendanceRecord;
                    attendanceMap[data.userId] = { ...data, id: doc.id };
                });
                setAttendanceData(attendanceMap);

            } catch (err: any) {
                console.error("Error loading monitor data:", err);
                setError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedDate]);

    const handleStatusUpdate = async (targetUserId: string, status: string) => {
        // Optimistic update
        const prevData = { ...attendanceData };
        
        // Create a unique ID for the day+user combination to avoid duplicates
        const docId = `${selectedDate}_${targetUserId}`;
        
        const newRecord: any = {
            userId: targetUserId,
            date: selectedDate,
            status,
            markedBy: user.id,
            timestamp: firestore.FieldValue.serverTimestamp(),
        };

        setAttendanceData(prev => ({
            ...prev,
            [targetUserId]: { ...newRecord, id: docId, timestamp: { toDate: () => new Date() } }
        }));

        try {
            await db.collection('attendance').doc(docId).set(newRecord);
        } catch (err: any) {
            console.error("Failed to update attendance:", err);
            setError("Failed to save attendance update.");
            // Revert on error
            setAttendanceData(prevData);
        }
    };

    const handleBulkStatusUpdate = async (status: string) => {
        if (filteredProfiles.length === 0) return;
        
        setIsBulkUpdating(true);
        setError(null);
        
        // Optimistic update state prep
        const prevData = { ...attendanceData };
        const newAttendanceMap = { ...attendanceData };
        
        // Firestore Batch
        const batch = db.batch();
        const timestamp = firestore.FieldValue.serverTimestamp();

        filteredProfiles.forEach(profile => {
            const docId = `${selectedDate}_${profile.id}`;
            const record: any = {
                userId: profile.id,
                date: selectedDate,
                status,
                markedBy: user.id,
                timestamp: timestamp,
            };

            // Add to batch
            const ref = db.collection('attendance').doc(docId);
            batch.set(ref, record);

            // Update optimistic state
            newAttendanceMap[profile.id] = { 
                ...record, 
                id: docId, 
                timestamp: { toDate: () => new Date() } 
            } as AttendanceRecord;
        });

        // Apply optimistic state
        setAttendanceData(newAttendanceMap);

        try {
            await batch.commit();
        } catch (err: any) {
            console.error("Failed to bulk update attendance:", err);
            setError("Failed to update all records. Please try again.");
            setAttendanceData(prevData); // Revert
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const openCustomModal = () => {
        setCustomStatusInput('');
        setIsCustomModalOpen(true);
        setShowBulkActionsDropdown(false); // Close dropdown if open
    };

    const applyCustomStatus = () => {
        if (customStatusInput.trim()) {
            handleBulkStatusUpdate(customStatusInput.trim());
            setIsCustomModalOpen(false);
        }
    };
    
    // Memoize profile map for fast lookup of monitor names
    const profileMap = useMemo(() => {
        const map: {[key: string]: string} = {};
        profiles.forEach(p => {
            map[p.id] = p.full_name;
        });
        return map;
    }, [profiles]);
    
    const getMonitorName = (monitorId: string) => {
        if (monitorId === user.id) return 'You';
        return profileMap[monitorId] || 'Unknown';
    };

    const filteredProfiles = useMemo(() => {
        return profiles.filter(p => 
            p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.student_id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [profiles, searchTerm]);

    const getStatusBadgeStyle = (status: string) => {
        switch(status) {
            case 'Present': return 'bg-green-100 text-green-800';
            case 'Absent': return 'bg-red-100 text-red-800';
            case 'Late': return 'bg-yellow-100 text-yellow-800';
            case 'Holiday': return 'bg-purple-100 text-purple-800';
            case 'No Class': return 'bg-gray-200 text-gray-800';
            case 'Suspended': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Excused': return 'bg-blue-100 text-blue-800';
            default: return 'bg-indigo-100 text-indigo-800 border-indigo-200'; // Custom default
        }
    };

    if (loading && profiles.length === 0) {
        return (
            <div className="flex justify-center items-center h-full">
                <Spinner className="h-8 w-8 text-gray-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Custom Status Modal */}
            {isCustomModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsCustomModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                <PencilIcon className="h-5 w-5 mr-2 text-indigo-600" inWrapper={false} />
                                Custom Status
                            </h3>
                            <button onClick={() => setIsCustomModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-4">
                            Apply a custom attendance status to <strong>{filteredProfiles.length}</strong> visible student(s).
                        </p>

                        <div className="relative mb-6">
                            <input 
                                type="text" 
                                value={customStatusInput}
                                onChange={(e) => setCustomStatusInput(e.target.value)}
                                placeholder="Enter status (e.g., Field Trip)"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && applyCustomStatus()}
                            />
                        </div>

                        <div className="mb-6">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Suggestions</p>
                            <div className="flex flex-wrap gap-2">
                                {['Suspended', 'Field Trip', 'Typhoon', 'Half Day', 'Offline', 'Event', 'Online Class'].map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => setCustomStatusInput(s)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                            customStatusInput === s 
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button 
                                onClick={() => setIsCustomModalOpen(false)}
                                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={applyCustomStatus}
                                disabled={!customStatusInput.trim()}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center"
                            >
                                <CheckIcon className="h-4 w-4 mr-2" />
                                Apply Status
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 flex items-center">
                            <MonitorIcon className="h-8 w-8 mr-3 text-blue-600" />
                            Attendance Monitor
                        </h2>
                        <p className="text-gray-500 mt-1">Manage daily attendance for all students.</p>
                    </div>
                    
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <CalendarIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 text-gray-800 font-medium text-sm"
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                    </div>
                )}

                <div className="mb-6 space-y-4">
                    <input
                        type="text"
                        placeholder="Search students by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    
                    <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-sm font-medium text-gray-700 mr-2">Mark Visible ({filteredProfiles.length}):</span>
                        <div className="flex gap-2 flex-wrap items-center relative">
                            {/* Primary Buttons (Visible on Mobile) */}
                            <button 
                                onClick={() => handleBulkStatusUpdate('Present')}
                                disabled={isBulkUpdating || filteredProfiles.length === 0}
                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                All Present
                            </button>
                            
                            <button 
                                onClick={() => handleBulkStatusUpdate('Suspended')}
                                disabled={isBulkUpdating || filteredProfiles.length === 0}
                                className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-md hover:bg-orange-200 border border-orange-200 shadow-sm disabled:opacity-50 flex items-center"
                            >
                                <BanIcon className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Mark </span>Suspended
                            </button>

                            {/* Secondary Buttons - Desktop (Hidden on Mobile) */}
                            <div className="hidden md:flex gap-2 items-center">
                                <button 
                                    onClick={() => handleBulkStatusUpdate('Absent')}
                                    disabled={isBulkUpdating || filteredProfiles.length === 0}
                                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    All Absent
                                </button>
                                <button 
                                    onClick={() => handleBulkStatusUpdate('Late')}
                                    disabled={isBulkUpdating || filteredProfiles.length === 0}
                                    className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-semibold rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    All Late
                                </button>
                                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                                <button 
                                    onClick={() => handleBulkStatusUpdate('Holiday')}
                                    disabled={isBulkUpdating || filteredProfiles.length === 0}
                                    className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-md hover:bg-purple-200 border border-purple-200 shadow-sm disabled:opacity-50"
                                >
                                    Mark Holiday
                                </button>
                                <button 
                                    onClick={() => handleBulkStatusUpdate('No Class')}
                                    disabled={isBulkUpdating || filteredProfiles.length === 0}
                                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-300 border border-gray-300 shadow-sm disabled:opacity-50"
                                >
                                    Mark No Class
                                </button>
                                <button 
                                    onClick={openCustomModal}
                                    disabled={isBulkUpdating || filteredProfiles.length === 0}
                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-md hover:bg-indigo-100 border border-indigo-200 shadow-sm disabled:opacity-50 flex items-center"
                                >
                                    <PencilIcon className="h-3 w-3 mr-1" inWrapper={false} />
                                    Custom Mark
                                </button>
                            </div>

                            {/* Secondary Buttons - Mobile Dropdown */}
                            <div className="relative md:hidden">
                                <button 
                                    onClick={() => setShowBulkActionsDropdown(!showBulkActionsDropdown)}
                                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-50 shadow-sm flex items-center"
                                >
                                    More <ChevronDownIcon className="h-3 w-3 ml-1" />
                                </button>
                                
                                {showBulkActionsDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowBulkActionsDropdown(false)}></div>
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-20 py-1 flex flex-col animate-fade-in-up">
                                            <button 
                                                onClick={() => { handleBulkStatusUpdate('Absent'); setShowBulkActionsDropdown(false); }} 
                                                className="px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 font-medium border-b border-gray-100"
                                            >
                                                Mark All Absent
                                            </button>
                                            <button 
                                                onClick={() => { handleBulkStatusUpdate('Late'); setShowBulkActionsDropdown(false); }} 
                                                className="px-4 py-2 text-left text-sm hover:bg-yellow-50 text-yellow-600 font-medium border-b border-gray-100"
                                            >
                                                Mark All Late
                                            </button>
                                            <button 
                                                onClick={() => { handleBulkStatusUpdate('Holiday'); setShowBulkActionsDropdown(false); }} 
                                                className="px-4 py-2 text-left text-sm hover:bg-purple-50 text-purple-600 font-medium border-b border-gray-100"
                                            >
                                                Mark Holiday
                                            </button>
                                            <button 
                                                onClick={() => { handleBulkStatusUpdate('No Class'); setShowBulkActionsDropdown(false); }} 
                                                className="px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-600 font-medium border-b border-gray-100"
                                            >
                                                Mark No Class
                                            </button>
                                            <button 
                                                onClick={openCustomModal} 
                                                className="px-4 py-2 text-left text-sm hover:bg-indigo-50 text-indigo-600 font-medium flex items-center"
                                            >
                                                <PencilIcon className="h-3 w-3 mr-2" inWrapper={false}/> Custom Mark
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                         {isBulkUpdating && <Spinner className="ml-2 h-4 w-4 text-gray-500" />}
                    </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredProfiles.map((profile) => {
                                const record = attendanceData[profile.id];
                                const currentStatus = record?.status;
                                const markedByName = record?.markedBy ? getMonitorName(record.markedBy) : null;

                                return (
                                    <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap cursor-pointer group" onClick={() => onViewProfile && onViewProfile(profile)}>
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <img className="h-10 w-10 rounded-full object-cover bg-gray-200 group-hover:ring-2 group-hover:ring-blue-300 transition-all" src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(profile.full_name)}`} alt="" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{profile.full_name}</div>
                                                    <div className="text-xs text-gray-500">{profile.student_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {currentStatus ? (
                                                <div className="flex flex-col items-start">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(currentStatus)}`}>
                                                        {currentStatus}
                                                    </span>
                                                    {markedByName && (
                                                        <span className="text-[10px] text-gray-400 mt-1 ml-1">
                                                            By: {markedByName}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Not marked</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex space-x-2">
                                                <StatusButton 
                                                    status="Present" 
                                                    currentStatus={currentStatus} 
                                                    onClick={() => handleStatusUpdate(profile.id, 'Present')}
                                                    colorClass="bg-green-600 hover:bg-green-700" 
                                                />
                                                <StatusButton 
                                                    status="Late" 
                                                    currentStatus={currentStatus} 
                                                    onClick={() => handleStatusUpdate(profile.id, 'Late')}
                                                    colorClass="bg-yellow-500 hover:bg-yellow-600" 
                                                />
                                                <StatusButton 
                                                    status="Absent" 
                                                    currentStatus={currentStatus} 
                                                    onClick={() => handleStatusUpdate(profile.id, 'Absent')}
                                                    colorClass="bg-red-600 hover:bg-red-700" 
                                                />
                                                <StatusButton 
                                                    status="Excused" 
                                                    currentStatus={currentStatus} 
                                                    onClick={() => handleStatusUpdate(profile.id, 'Excused')}
                                                    colorClass="bg-blue-600 hover:bg-blue-700" 
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredProfiles.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                                        No students found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MonitorPage;
