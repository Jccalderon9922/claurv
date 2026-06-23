import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Plus, Trash2, Globe, Lock, ArrowRight, Compass, Share2, Bell, X, Shield, User, Settings, Key } from 'lucide-react';
import { resolvePanoramaUrl } from '../lib/clauRvDb';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

import type { Project } from '../types/project';

interface DashboardProps {
  onOpenProject: (project: Project) => void;
  onExitGuest?: () => void;
  onOpenAdmin?: () => void;
}

// ==============================================
// COMPONENTE TARJETA DE PROYECTO
// ==============================================
function ProjectCard({ project, canEdit, isGuest, onOpen, onDelete, onToggleVisibility, onShare }: {
  project: Project;
  canEdit: boolean;
  isGuest: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
  onShare: () => void;
}) {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    let active = true;
    resolvePanoramaUrl(project.image).then(url => {
      if (active) setImageUrl(url);
    }).catch(() => {
      if (active) setImageUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>');
    });
    return () => {
      active = false;
      if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    };
  }, [project.image]);

  const sceneCount = Object.keys(project.scenes || {}).length;

  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-3xl overflow-hidden border border-amber-900/5 shadow-md shadow-amber-900/5 group hover:shadow-xl hover:shadow-amber-900/5 transition-all duration-300 cursor-pointer flex flex-col h-full hover:scale-[1.01]"
    >
      <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">Cargando...</div>
        )}
        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
          📷 {sceneCount} Escena(s)
        </div>

        {!isGuest && (
          <div className="absolute top-4 right-4 flex gap-1.5">
            {canEdit ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onShare(); }}
                  className="p-2 rounded-xl backdrop-blur-md text-white bg-blue-600/80 hover:bg-blue-600 transition"
                  title="Compartir Proyecto"
                >
                  <Share2 className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                  className={`p-2 rounded-xl backdrop-blur-md text-white transition ${project.isPublic ? 'bg-emerald-600/80 hover:bg-emerald-600' : 'bg-rose-600/80 hover:bg-rose-600'}`}
                  title={project.isPublic ? 'Público: Hacer Privado' : 'Privado: Hacer Público'}
                >
                  {project.isPublic ? <Globe className="w-4.5 h-4.5" /> : <Lock className="w-4.5 h-4.5" />}
                </button>
              </>
            ) : (
              <div className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-md text-white">
                <Globe className="w-4.5 h-4.5" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 group-hover:text-amber-600 transition mb-1.5">
            {project.title}
          </h3>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-slate-500 font-medium">Por: {project.owner_name || 'Desconocido'}</p>
            <p className="text-[10px] text-slate-400">Creado: {new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 mt-5 pt-4">
          <span className="text-amber-700 font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
            <span>Ver Tour</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>

          {canEdit && !isGuest && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition"
              title="Eliminar Proyecto"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==============================================
// COMPONENTE PRINCIPAL DASHBOARD
// ==============================================
export default function Dashboard({ onOpenProject, onExitGuest, onOpenAdmin }: DashboardProps) {
  const { user, profile, logout } = useAuth();
  
  const isGuest = !user;
  const isAdmin = profile?.role === 'admin';
  const isCreator = profile?.role === 'creator' || (profile?.role as any) === 'user';
  const canCreate = isAdmin || isCreator;

  const [projects, setProjects] = useState<Project[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [cloudActive, setCloudActive] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Profile edit states
  const [editFirstName, setEditFirstName] = useState(profile?.first_name || '');
  const [editLastName, setEditLastName] = useState(profile?.last_name || '');
  const [editPassword, setEditPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Share Form
  const [shareProject, setShareProject] = useState<Project | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareType, setShareType] = useState<'copy' | 'collaboration'>('collaboration');

  const loadData = async () => {
    const isConfigured = isSupabaseConfigured();
    setCloudActive(isConfigured);

    if (isConfigured) {
      // 1. Fetch projects (Supabase RLS filters them automatically for logged-in user, 
      // or returns public projects for guests if we query without token, but guest logic handles via JS for safety)
      const { data, error } = await supabase
        .from('claurv_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
      } else if (data) {
        // Obtenemos los IDs de los dueños únicos
        const ownerIds = [...new Set(data.map(p => p.owner_id))].filter(Boolean);
        
        let profilesMap: Record<string, string> = {};
        if (ownerIds.length > 0) {
          const { data: profs } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name')
            .in('id', ownerIds);
            
          if (profs) {
            profs.forEach(pr => {
              profilesMap[pr.id] = `${pr.first_name} ${pr.last_name}`;
            });
          }
        }

        const mapped: Project[] = data.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description || '',
          image: p.image || '',
          createdAt: p.created_at,
          isPublic: p.is_public,
          scenes: p.scenes || {},
          defaultScene: p.default_scene || Object.keys(p.scenes || {})[0] || '',
          mediaLibrary: p.media_library || [],
          owner_id: p.owner_id,
          owner_name: profilesMap[p.owner_id] || 'Usuario',
          collaborators: p.collaborators || []
        }));
        setProjects(mapped);
      }

      // 2. Fetch Notifications (pending transfers for this user)
      if (user) {
        const { data: tData } = await supabase
          .from('project_transfers')
          .select('*')
          .eq('receiver_email', user.email)
          .eq('status', 'pending');
        
        if (tData) setTransfers(tData);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // ==========================================
  // CREATE PROJECT
  // ==========================================
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsUploading(true);

    try {
      const newProject: Project = {
        id: `proj-${Date.now()}`,
        title: newTitle.trim(),
        description: newDesc.trim(),
        image: '',
        createdAt: new Date().toISOString(),
        isPublic: isPublic,
        defaultScene: "",
        scenes: {},
        mediaLibrary: [],
        owner_id: user?.id
      };

      if (cloudActive) {
        const { error } = await supabase.from('claurv_projects').insert({
          id: newProject.id,
          title: newProject.title,
          description: newProject.description,
          image: newProject.image,
          is_public: newProject.isPublic,
          scenes: newProject.scenes,
          default_scene: newProject.defaultScene,
          media_library: newProject.mediaLibrary,
          owner_id: newProject.owner_id
        });
        if (error) throw error;
      }

      setProjects([newProject, ...projects]);
      setNewTitle('');
      setNewDesc('');
      setShowAddModal(false);
      onOpenProject(newProject);
    } catch (err) {
      console.error('Error creating project:', err);
      alert('Error al crear el proyecto en la base de datos.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Deseas eliminar permanentemente este proyecto y todas sus escenas?')) {
      if (cloudActive) {
        const { error } = await supabase.from('claurv_projects').delete().eq('id', id);
        if (error) return alert('Error al eliminar en la nube: ' + error.message);
      }
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  const toggleVisibility = async (id: string) => {
    const target = projects.find(p => p.id === id);
    if (!target) return;
    if (cloudActive) {
      const { error } = await supabase.from('claurv_projects').update({ is_public: !target.isPublic }).eq('id', id);
      if (error) return alert('Error al cambiar visibilidad en la nube: ' + error.message);
    }
    setProjects(projects.map(p => p.id === id ? { ...p, isPublic: !p.isPublic } : p));
  };

  // ==========================================
  // SHARE PROJECT
  // ==========================================
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareProject || !shareEmail || !user) return;
    setIsUploading(true);

    try {
      const { error } = await supabase.from('project_transfers').insert({
        sender_id: user.id,
        receiver_email: shareEmail.trim().toLowerCase(),
        project_id: shareProject.id,
        type: shareType,
        project_data: shareType === 'copy' ? shareProject : null
      });

      if (error) throw error;
      alert(`Invitación enviada correctamente a ${shareEmail}`);
      setShowShareModal(false);
      setShareEmail('');
    } catch (err: any) {
      alert('Error al enviar: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // ==========================================
  // ACCEPT TRANSFER
  // ==========================================
  const acceptTransfer = async (transfer: any) => {
    try {
      if (transfer.type === 'copy') {
        // Clone project
        const clonedProject = transfer.project_data;
        clonedProject.id = `proj-${Date.now()}`;
        clonedProject.owner_id = user?.id; // New owner!
        clonedProject.title = `${clonedProject.title} (Copia)`;
        
        const { error: cloneErr } = await supabase.from('claurv_projects').insert({
          id: clonedProject.id,
          title: clonedProject.title,
          description: clonedProject.description,
          image: clonedProject.image,
          is_public: false,
          scenes: clonedProject.scenes,
          default_scene: clonedProject.defaultScene,
          media_library: clonedProject.mediaLibrary,
          owner_id: user?.id
        });
        if (cloneErr) throw cloneErr;

      } else if (transfer.type === 'collaboration') {
        // Add to collaborators array
        // 1. Get current collaborators
        const { data: proj } = await supabase.from('claurv_projects').select('collaborators').eq('id', transfer.project_id).single();
        const currentCollabs = proj?.collaborators || [];
        if (!currentCollabs.includes(user?.id)) {
          const { error: colErr } = await supabase.from('claurv_projects').update({
            collaborators: [...currentCollabs, user?.id]
          }).eq('id', transfer.project_id);
          if (colErr) throw colErr;
        }
      }

      // Mark transfer as accepted
      await supabase.from('project_transfers').update({ status: 'accepted' }).eq('id', transfer.id);
      
      setTransfers(transfers.filter(t => t.id !== transfer.id));
      alert('Proyecto recibido exitosamente.');
      loadData(); // Reload projects
    } catch (err: any) {
      alert('Error al aceptar: ' + err.message);
    }
  };

  const rejectTransfer = async (id: string) => {
    await supabase.from('project_transfers').update({ status: 'rejected' }).eq('id', id);
    setTransfers(transfers.filter(t => t.id !== id));
  };

  // ==========================================
  // PROFILE UPDATE
  // ==========================================
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      if (!user || !profile) return;
      
      const updateData: any = { data: { first_name: editFirstName, last_name: editLastName } };
      if (editPassword.trim()) {
        updateData.password = editPassword;
      }
      
      const { error: authError } = await supabase.auth.updateUser(updateData);
      if (authError) throw authError;

      const { error: dbError } = await supabase.from('user_profiles').update({
        first_name: editFirstName,
        last_name: editLastName
      }).eq('id', user.id);
      
      if (dbError) throw dbError;

      alert('Perfil actualizado exitosamente.');
      setShowProfileModal(false);
      setEditPassword('');
      window.location.reload(); 
    } catch (err: any) {
      alert('Error actualizando perfil: ' + err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // ==========================================
  // RENDER LOGIC
  // ==========================================
  
  // Si está como invitado, agrupar proyectos por owner_name
  const groupedProjects: Record<string, Project[]> = {};
  if (isGuest) {
    projects.filter(p => p.isPublic).forEach(p => {
      const author = p.owner_name || 'Desconocido';
      if (!groupedProjects[author]) groupedProjects[author] = [];
      groupedProjects[author].push(p);
    });
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] font-sans text-slate-800 pb-16">
      {/* Header bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-amber-900/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-700">
              <Compass className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-none">CLAUVR 360°</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                {isGuest ? 'Modo Visitante' : (isAdmin ? 'Administrador' : (isCreator ? 'Editor' : 'Visualizador'))}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">

            {!isGuest && (
              <>
                <button onClick={() => setShowNotifications(true)} className="relative p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition">
                  <Bell className="w-5 h-5" />
                  {transfers.length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border-2 border-white"></span>
                  )}
                </button>

                {isAdmin && onOpenAdmin && (
                  <button onClick={onOpenAdmin} className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-sm transition-all border border-indigo-200">
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin Panel</span>
                  </button>
                )}

                {canCreate && (
                  <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-4.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-600/10">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nuevo Proyecto</span>
                  </button>
                )}
              </>
            )}

            {isGuest ? (
              <button onClick={onExitGuest} className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-sm transition">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Iniciar Sesión</span>
              </button>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-sm transition"
                >
                  <div className="w-7 h-7 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center text-xs font-black">
                    {profile?.first_name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{profile?.first_name}</span>
                </button>

                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-amber-900/5 z-50 overflow-hidden py-1">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Conectado como</p>
                        <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{profile?.first_name} {profile?.last_name}</p>
                      </div>
                      
                      <button 
                        onClick={() => { setShowProfileMenu(false); setShowProfileModal(true); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 font-semibold transition"
                      >
                        <Settings className="w-4 h-4" /> Configuración
                      </button>
                      
                      <button 
                        onClick={logout}
                        className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition border-t border-slate-100"
                      >
                        <LogOut className="w-4 h-4" /> Cerrar Sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main dashboard content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        
        {isGuest ? (
          /* ================= GUEST VIEW ================= */
          Object.keys(groupedProjects).length === 0 ? (
            <div className="bg-white rounded-3xl border border-amber-900/5 shadow-sm p-16 text-center max-w-xl mx-auto mt-12">
              <div className="text-4xl mb-4">📂</div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">No hay proyectos públicos</h3>
              <p className="text-sm text-slate-500 mb-6">Actualmente no hay proyectos configurados como públicos para visualización de invitados.</p>
            </div>
          ) : (
            Object.entries(groupedProjects).map(([authorName, authorProjects]) => (
              <div key={authorName} className="mb-12">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-6">
                  <div className="h-8 w-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold">
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Proyectos de {authorName}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {authorProjects.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isGuest={true}
                      canEdit={false}
                      onOpen={() => onOpenProject(project)}
                      onDelete={() => {}}
                      onToggleVisibility={() => {}}
                      onShare={() => {}}
                    />
                  ))}
                </div>
              </div>
            ))
          )
        ) : (
          /* ================= LOGGED IN VIEW ================= */
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Tus Proyectos</h2>
              <p className="text-sm text-slate-500">Proyectos creados por ti o compartidos contigo.</p>
            </div>
            
            {projects.length === 0 ? (
              <div className="bg-white rounded-3xl border border-amber-900/5 shadow-sm p-16 text-center max-w-xl mx-auto mt-12">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Comienza tu primer proyecto</h3>
                <p className="text-sm text-slate-500 mb-6">Dale click al botón "Nuevo Proyecto" arriba a la derecha para iniciar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.map(project => {
                  const isOwner = project.owner_id === user?.id;
                  const isCollaborator = project.collaborators?.includes(user?.id || '') ?? false;
                  const canEdit = isAdmin || ((isOwner || isCollaborator) && isCreator);

                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isGuest={false}
                      canEdit={canEdit}
                      onOpen={() => onOpenProject(project)}
                      onDelete={() => handleDelete(project.id)}
                      onToggleVisibility={() => toggleVisibility(project.id)}
                      onShare={() => {
                        setShareProject(project);
                        setShowShareModal(true);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ========================================== */}
      {/* MODAL: ADD PROJECT */}
      {/* ========================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-900/5 max-w-md w-full p-8 relative">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Crear Nuevo Proyecto</h3>
            <p className="text-sm text-slate-500 mb-6">Completa los detalles de tu nuevo proyecto para comenzar.</p>

            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre del Proyecto</label>
                <input type="text" required placeholder="Ej: Sede Chorrillos" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="block w-full px-4 py-3 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción</label>
                <textarea placeholder="Ej: Tour virtual..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} className="block w-full px-4 py-3 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-sm resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="visibility" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-4.5 h-4.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                <label htmlFor="visibility" className="text-sm font-semibold text-slate-700 cursor-pointer">Hacer este proyecto visible públicamente</label>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition" disabled={isUploading}>Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-600/10 transition" disabled={isUploading}>{isUploading ? 'Creando...' : 'Crear Proyecto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: SHARE PROJECT */}
      {/* ========================================== */}
      {showShareModal && shareProject && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-900/5 max-w-md w-full p-8 relative">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Compartir: {shareProject.title}</h3>
            <p className="text-sm text-slate-500 mb-6">Envía este proyecto a otro usuario registrado.</p>

            <form onSubmit={handleShareSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Correo del Destinatario</label>
                <input type="email" required placeholder="correo@ejemplo.com" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} className="block w-full px-4 py-3 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-slate-800 text-sm" />
              </div>
              
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de transferencia</label>
                
                <label className={`block border p-4 rounded-xl cursor-pointer transition ${shareType === 'collaboration' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="shareType" checked={shareType === 'collaboration'} onChange={() => setShareType('collaboration')} className="text-blue-600 focus:ring-blue-500" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Trabajo Compartido (Colaborar)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Ambos editarán el MISMO proyecto. Los cambios de uno los verá el otro.</p>
                    </div>
                  </div>
                </label>

                <label className={`block border p-4 rounded-xl cursor-pointer transition ${shareType === 'copy' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="shareType" checked={shareType === 'copy'} onChange={() => setShareType('copy')} className="text-blue-600 focus:ring-blue-500" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Enviar Copia (Clonar)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Se creará un proyecto clonado e independiente para el destinatario.</p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowShareModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition" disabled={isUploading}>Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/10 transition" disabled={isUploading}>{isUploading ? 'Enviando...' : 'Enviar Invitación'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: NOTIFICATIONS (INBOX) */}
      {/* ========================================== */}
      {showNotifications && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-900/5 max-w-md w-full p-8 relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Bandeja de Entrada</h3>
              <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            
            {transfers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No tienes notificaciones pendientes.</p>
            ) : (
              <div className="space-y-4">
                {transfers.map(t => (
                  <div key={t.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-2 bg-blue-100 text-blue-600 rounded-lg"><Bell className="w-4 h-4" /></div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">Alguien te ha enviado un proyecto</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Tipo: <strong>{t.type === 'copy' ? 'Copia independiente' : 'Trabajo Compartido'}</strong>
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <button onClick={() => acceptTransfer(t)} className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition">Aceptar</button>
                          <button onClick={() => rejectTransfer(t.id)} className="flex-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition">Rechazar</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: PROFILE EDIT */}
      {/* ========================================== */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-900/5 max-w-md w-full p-8 relative">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Mi Perfil</h3>
            <p className="text-sm text-slate-500 mb-6">Actualiza tu información personal o cambia tu contraseña.</p>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombres</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input type="text" required value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="block w-full pl-10 pr-4 py-3 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-sm" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apellidos</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input type="text" required value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="block w-full pl-10 pr-4 py-3 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-sm" />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nueva Contraseña (Opcional)</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="h-4 w-4" />
                  </div>
                  <input type="password" placeholder="Mínimo 6 caracteres" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="block w-full pl-10 pr-4 py-3 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-sm" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Déjalo en blanco si no deseas cambiarla.</p>
              </div>

              <div className="flex gap-3 justify-end pt-4 mt-2">
                <button type="button" onClick={() => setShowProfileModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition" disabled={isUpdatingProfile}>Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-600/10 transition" disabled={isUpdatingProfile}>{isUpdatingProfile ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
