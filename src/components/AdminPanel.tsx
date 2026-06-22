import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Check, X, ArrowLeft, RefreshCw } from 'lucide-react';
import type { UserProfile } from '../context/AuthContext';

interface AdminPanelProps {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data as UserProfile[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Error al actualizar el estado: ' + error.message);
    } else {
      setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
    }
  };

  const updateRole = async (id: string, newRole: 'creator' | 'viewer') => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', id);

    if (error) {
      alert('Error al actualizar el rol: ' + error.message);
    } else {
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole as any } : u));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-bold">Aprobado</span>;
      case 'pending': return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-bold">Pendiente</span>;
      case 'rejected': return <span className="px-2 py-1 bg-rose-100 text-rose-800 text-xs rounded-full font-bold">Rechazado</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] font-sans text-slate-800 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Panel de Administración</h1>
                <p className="text-sm text-slate-500">Aprobación y control de usuarios registrados</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={fetchUsers}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-amber-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-bold">Nombre Completo</th>
                  <th className="p-4 font-bold">Correo Electrónico</th>
                  <th className="p-4 font-bold">Rol</th>
                  <th className="p-4 font-bold">Estado</th>
                  <th className="p-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">Cargando usuarios...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">No hay usuarios registrados aún.</td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-semibold text-slate-700">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="p-4 text-slate-500">{user.email}</td>
                      <td className="p-4">
                        {user.role === 'admin' ? (
                          <span className="text-amber-600 font-bold flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5" /> Admin
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => updateRole(user.id, e.target.value as 'creator' | 'viewer')}
                            className="bg-[#FAF6F0] border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 focus:outline-none focus:border-amber-500"
                          >
                            <option value="creator">Creador</option>
                            <option value="viewer">Visualizador</option>
                          </select>
                        )}
                      </td>
                      <td className="p-4">{getStatusBadge(user.status)}</td>
                      <td className="p-4 text-right">
                        {user.role !== 'admin' && (
                          <div className="flex items-center justify-end gap-2">
                            {user.status !== 'approved' && (
                              <button 
                                onClick={() => updateStatus(user.id, 'approved')}
                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition tooltip"
                                title="Aprobar Usuario"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {user.status !== 'rejected' && (
                              <button 
                                onClick={() => updateStatus(user.id, 'rejected')}
                                className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                                title="Rechazar/Bloquear Usuario"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-amber-50 border-t border-amber-100 text-xs text-amber-800">
            <strong>Nota sobre contraseñas:</strong> Por seguridad de Supabase, las contraseñas son secretas. Si un usuario necesita que le restablezcas la contraseña, debes hacerlo directamente desde el panel de "Authentication" dentro de tu cuenta de Supabase.
          </div>
        </div>
      </div>
    </div>
  );
}
