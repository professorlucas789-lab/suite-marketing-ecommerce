/**
 * Componente de Histórico de Atividades
 * Exibe as ações recentes do utilizador
 * Fase 11: User Activity History
 */

import React, { useState, useEffect } from 'react';
import { Loader2, Calendar, LogIn, Lock, Camera, User as UserIcon, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, QueryConstraint } from 'firebase/firestore';

interface Activity {
  id: string;
  type: 'login' | 'password_change' | 'avatar_update' | 'profile_update' | 'other';
  title: string;
  description: string;
  timestamp: string;
  ipAddress?: string;
  device?: string;
}

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'login':
      return <LogIn size={16} className="text-emerald-600 dark:text-emerald-400" />;
    case 'password_change':
      return <Lock size={16} className="text-blue-600 dark:text-blue-400" />;
    case 'avatar_update':
      return <Camera size={16} className="text-purple-600 dark:text-purple-400" />;
    case 'profile_update':
      return <UserIcon size={16} className="text-orange-600 dark:text-orange-400" />;
    default:
      return <AlertCircle size={16} className="text-slate-600 dark:text-slate-400" />;
  }
};

const getActivityColor = (type: Activity['type']) => {
  switch (type) {
    case 'login':
      return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
    case 'password_change':
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    case 'avatar_update':
      return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
    case 'profile_update':
      return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    default:
      return 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800';
  }
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `há ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
    if (diffHours < 24) return `há ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    if (diffDays < 7) return `há ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;

    return date.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

export const ActivityHistoryCard: React.FC = () => {
  const user = auth.currentUser;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Construir query para atividades do utilizador
      const q = query(
        collection(db, 'audit_logs'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const activityList: Activity[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          activityList.push({
            id: doc.id,
            type: data.type || 'other',
            title: data.title || 'Atividade',
            description: data.description || '',
            timestamp: data.timestamp || new Date().toISOString(),
            ipAddress: data.ipAddress,
            device: data.device
          });
        });

        setActivities(activityList);
        setLoading(false);
      }, (error) => {
        console.error('Erro ao carregar histórico:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Erro ao configurar listener:', error);
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar size={20} className="text-slate-600 dark:text-slate-400" />
          Histórico de Atividades
        </h2>
      </div>

      <div className="p-6">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle size={32} className="mx-auto text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sem atividades registadas
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`p-4 rounded-lg border flex items-start gap-4 ${getActivityColor(activity.type)}`}
              >
                <div className="mt-1 shrink-0">
                  {getActivityIcon(activity.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {activity.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-500 shrink-0 whitespace-nowrap">
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>

                  {activity.device && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Dispositivo: {activity.device}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityHistoryCard;
