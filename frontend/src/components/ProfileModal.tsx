
import { X, User as UserIcon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface Props {
  onClose: () => void;
}

export function ProfileModal({ onClose }: Props) {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-black border border-white/20 shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/20">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">
            Profile Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white transition-colors border border-transparent hover:border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 bg-black flex flex-col items-center">
          <div className="w-24 h-24 bg-[#111111] flex items-center justify-center overflow-hidden mb-6 border border-white/20">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover grayscale opacity-90" />
            ) : (
              <UserIcon className="w-12 h-12 text-white/30" />
            )}
          </div>
          
          <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-1">{user.name}</h3>
          <p className="text-xs text-white/50 uppercase tracking-widest mb-8">{user.role}</p>

          <div className="w-full space-y-6">
            <div>
              <label className="block text-[10px] text-white/50 uppercase tracking-widest mb-2 font-bold">Email</label>
              <div className="w-full bg-[#111111] border border-white/20 py-3 px-4 text-xs text-white uppercase tracking-widest">
                {user.email}
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] text-white/50 uppercase tracking-widest mb-2 font-bold">ID</label>
              <div className="w-full bg-[#111111] border border-white/20 py-3 px-4 text-xs text-white/50 font-mono truncate">
                {user.id}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/20 bg-[#0a0a0a] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors border border-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
