import React, { useState, useEffect } from 'react';
import { Plus, Users, Edit2, Save, Trash2, Download, Search, Info, Loader2, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Member {
  steamId: string;
  gameIds: number[];
}

interface Family {
  id: string;
  name: string;
  members: Member[];
  createdAt: string;
  updatedAt: string;
}

export default function App() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formSteamIds, setFormSteamIds] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFamilies();
  }, []);

  const fetchFamilies = async () => {
    try {
      const res = await fetch('/api/families');
      const data = await res.json();
      setFamilies(data);
    } catch (err) {
      console.error('Failed to fetch families');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const activeSteamIds = formSteamIds.filter(id => id.trim() !== '');
    if (activeSteamIds.length === 0) {
      setError('At least one Steam ID is required');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isEditing,
          name: formName,
          steamIds: activeSteamIds
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save');
      }

      const updatedFamilies = await res.json();
      setFamilies(updatedFamilies);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsEditing(null);
    setFormName('');
    setFormSteamIds(['', '', '', '', '', '']);
    setError(null);
  };

  const startEdit = (family: Family) => {
    setIsEditing(family.id);
    setFormName(family.name);
    const newIds = ['', '', '', '', '', ''];
    family.members.forEach((m, i) => {
      newIds[i] = m.steamId;
    });
    setFormSteamIds(newIds);
  };

  const handleSteamIdChange = (index: number, value: string) => {
    const newIds = [...formSteamIds];
    newIds[index] = value;
    setFormSteamIds(newIds);
  };

  const downloadJSON = (family: Family) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(family, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${family.name.toLowerCase().replace(/\s+/g, '_')}_cache.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-steam-dark text-[#c6d4df] font-sans">
      {/* Sidebar: Configuration */}
      <aside className="w-[380px] border-r border-[#1e232b] p-8 flex flex-col bg-steam-sidebar overflow-y-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">FAMILY CACHE</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Steam Member Management</p>
          </div>
        </div>

        <div className="section-title">Family Configuration</div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isEditing ? 'Editing Group' : 'Family Group Name'}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Winters Legacy"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="steam-input w-full"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Member Steam IDs (Max 6)</label>
            <div className="space-y-2">
              {formSteamIds.map((id, index) => (
                <div key={index} className="grid grid-cols-[32px_1fr] align-items-center gap-2">
                  <span className="text-[10px] text-[#4f5d67] font-bold self-center">
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => handleSteamIdChange(index, e.target.value)}
                    className="steam-input font-mono"
                    placeholder="Enter SteamID64"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-[11px] font-mono">
              ERROR: {error}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  PROCESSING...
                </>
              ) : (
                <>
                  {isEditing ? <Save className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  {isEditing ? 'UPDATE FAMILY CACHE' : 'GENERATE CACHE & SAVE'}
                </>
              )}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[11px] text-slate-500 hover:text-slate-300 uppercase tracking-widest text-center"
              >
                Cancel Edit
              </button>
            )}
            <div className="text-[10px] text-center text-slate-500 uppercase tracking-tighter">
              Game IDs will be mapped to a hidden JSON blob
            </div>
          </div>
        </form>
      </aside>

      {/* Main Content: Registry */}
      <main className="flex-1 p-10 bg-steam-dark overflow-y-auto">
        <div className="flex justify-between items-end mb-8 border-b border-steam-border/30 pb-4">
          <div className="section-title !mb-0">Cached Family Registry</div>
          <div className="text-[11px] text-slate-500 font-mono tracking-wider">
            TOTAL CACHED: {families.length} FAMILIES
          </div>
        </div>

        <div className="glass-panel rounded-lg overflow-hidden flex flex-col">
          {/* Header */}
          <div className="grid grid-cols-[2fr_120px_1fr_100px] bg-steam-blue p-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-steam-border/50">
            <div>Family Name</div>
            <div>Members</div>
            <div>JSON Payload Status</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Rows */}
          <div className="p-0">
            <AnimatePresence mode="popLayout">
              {families.length === 0 ? (
                <div className="p-12 text-center text-slate-600">
                  <div className="section-title opacity-20">NO_REGISTRY_DATA_FOUND</div>
                </div>
              ) : (
                families.map((family, idx) => (
                  <motion.div
                    key={family.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`grid grid-cols-[2fr_120px_1fr_100px] items-center px-4 py-3 hover:bg-white/5 transition-colors group ${
                      idx !== families.length - 1 ? 'border-b border-steam-border/20' : ''
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-steam-bright transition-colors">
                        {family.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        UID: {family.id} • Created: {new Date(family.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex -space-x-1.5">
                      {family.members.map((_, i) => (
                        <div 
                          key={i} 
                          className="w-6 h-6 rounded-full border-2 border-steam-dark flex items-center justify-center text-[8px] font-bold bg-[#3d4450] text-slate-300"
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="flex flex-col">
                        <span className="inline-flex w-fit bg-steam-sidebar border border-steam-border px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold text-steam-bright uppercase tracking-tighter">
                          JSON_CACHE_VERIFIED
                        </span>
                        <span className="text-[9px] mt-1 text-slate-500 font-mono italic">
                          {family.members.reduce((acc, m) => acc + m.gameIds.length, 0)}_games_mapped.json
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                       <button
                        onClick={() => downloadJSON(family)}
                        title="Download JSON"
                        className="text-[11px] text-steam-bright hover:underline font-bold uppercase tracking-tighter"
                      >
                        EXPORT
                      </button>
                      <button
                        onClick={() => startEdit(family)}
                        className="text-[11px] text-[#8e99a3] hover:text-white font-bold uppercase tracking-tighter"
                      >
                        EDIT
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-8 p-4 border border-dashed border-steam-border/50 rounded flex items-center justify-center gap-4 bg-steam-blue/20">
          <Info className="w-4 h-4 text-steam-bright" />
          <p className="text-[10px] text-slate-500 uppercase tracking-widest max-w-xl text-center leading-relaxed">
            Note: Game IDs are cached locally and used for library indexing. Lists are stored as pure integer arrays in internal storage to ensure high density performance.
          </p>
        </div>
      </main>
    </div>
  );
}


